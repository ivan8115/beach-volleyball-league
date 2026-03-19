/**
 * Bracket Advancement
 *
 * After a bracket game completes, advance the winner (and loser in double elim)
 * to their next games. Also handles:
 * - Bracket bye auto-completion (loserTeamId = null)
 * - Grand final reset (double elim: LB finalist wins GF → activate reset game)
 */

import { PrismaClient } from "@/generated/prisma/client";

type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface BracketGameRef {
  id: string;
  eventId: string;
  divisionId: string | null;
  nextGameId: string | null;
  loserNextGameId: string | null;
  bracketSide: string | null;
  isBracketReset: boolean;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

/**
 * Advance winner (and loser) to their next bracket games after a game completes.
 * Safe to call for league games — exits early if bracketSide is null.
 */
export async function advanceBracketTeams(
  tx: PrismaTx,
  game: BracketGameRef,
  winnerTeamId: string,
  loserTeamId: string | null,
): Promise<void> {
  if (!game.bracketSide) return;

  // Advance winner to next game (winners bracket / grand final)
  if (game.nextGameId) {
    await fillTeamSlot(tx, game.nextGameId, winnerTeamId);
  }

  // Advance loser to losers bracket (double elim only)
  if (game.loserNextGameId && loserTeamId) {
    await fillTeamSlot(tx, game.loserNextGameId, loserTeamId);
  }

  // Grand final reset logic (double elim only, non-reset GF game)
  if (game.bracketSide === "GRAND_FINAL" && !game.isBracketReset) {
    const resetGame = await tx.game.findFirst({
      where: {
        eventId: game.eventId,
        divisionId: game.divisionId,
        isBracketReset: true,
        deletedAt: null,
      },
    });

    if (resetGame) {
      if (game.awayTeamId && winnerTeamId === game.awayTeamId) {
        // LB finalist (away) won → both teams now have 1 loss, play the reset game
        // WB finalist (loser here) is home; LB finalist (winner here) is away
        await tx.game.update({
          where: { id: resetGame.id },
          data: {
            homeTeamId: loserTeamId,
            awayTeamId: winnerTeamId,
            status: "SCHEDULED",
          },
        });
      } else {
        // WB finalist won outright → tournament over, cancel the unused reset game
        await tx.game.update({
          where: { id: resetGame.id },
          data: { deletedAt: new Date() },
        });
      }
    }
  }
}

/**
 * Fill the first empty team slot in a game (home first, then away).
 */
async function fillTeamSlot(
  tx: PrismaTx,
  gameId: string,
  teamId: string,
): Promise<void> {
  const next = await tx.game.findUnique({
    where: { id: gameId },
    select: { homeTeamId: true, awayTeamId: true },
  });
  if (!next) return;

  if (!next.homeTeamId) {
    await tx.game.update({ where: { id: gameId }, data: { homeTeamId: teamId } });
  } else if (!next.awayTeamId) {
    await tx.game.update({ where: { id: gameId }, data: { awayTeamId: teamId } });
  }
}
