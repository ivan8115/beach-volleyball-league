import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mockTx is available when vi.mock factory runs
const { mockTx } = vi.hoisted(() => {
  const mockTx = {
    game: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  return { mockTx };
});

// advanceBracketTeams takes a PrismaTx as first arg — we pass mockTx directly,
// so we don't need to mock @/lib/prisma here. But bracket-advancement imports
// PrismaClient type from @/generated/prisma/client, which requires the module
// to be resolvable. Mock it to avoid the generated client import chain.
vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: class {},
}));

import { advanceBracketTeams, type BracketGameRef } from "@/lib/bracket-advancement";

// Cast mockTx to satisfy the PrismaTx parameter type at call site
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tx = mockTx as any;

beforeEach(() => {
  vi.clearAllMocks();
});

/** Build a minimal BracketGameRef with sensible defaults */
function makeGame(overrides: Partial<BracketGameRef> = {}): BracketGameRef {
  return {
    id: "game-1",
    eventId: "event-1",
    divisionId: null,
    nextGameId: null,
    loserNextGameId: null,
    bracketSide: "WINNERS",
    isBracketReset: false,
    homeTeamId: "team-home",
    awayTeamId: "team-away",
    ...overrides,
  };
}

describe("advanceBracketTeams", () => {
  describe("league game guard", () => {
    it("returns early without any DB calls when bracketSide is null", async () => {
      const game = makeGame({ bracketSide: null });
      await advanceBracketTeams(tx, game, "team-home", "team-away");

      expect(mockTx.game.findUnique).not.toHaveBeenCalled();
      expect(mockTx.game.update).not.toHaveBeenCalled();
      expect(mockTx.game.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("winner advancement", () => {
    it("fills home slot of next game when it is empty", async () => {
      mockTx.game.findUnique.mockResolvedValue({ homeTeamId: null, awayTeamId: null });
      mockTx.game.update.mockResolvedValue({});

      const game = makeGame({ nextGameId: "game-next" });
      await advanceBracketTeams(tx, game, "team-home", "team-away");

      expect(mockTx.game.findUnique).toHaveBeenCalledWith({
        where: { id: "game-next" },
        select: { homeTeamId: true, awayTeamId: true },
      });
      expect(mockTx.game.update).toHaveBeenCalledWith({
        where: { id: "game-next" },
        data: { homeTeamId: "team-home" },
      });
    });

    it("fills away slot of next game when home slot is already occupied", async () => {
      mockTx.game.findUnique.mockResolvedValue({
        homeTeamId: "team-already-home",
        awayTeamId: null,
      });
      mockTx.game.update.mockResolvedValue({});

      const game = makeGame({ nextGameId: "game-next" });
      await advanceBracketTeams(tx, game, "team-home", "team-away");

      expect(mockTx.game.update).toHaveBeenCalledWith({
        where: { id: "game-next" },
        data: { awayTeamId: "team-home" },
      });
    });

    it("does not update next game when both slots are already filled", async () => {
      mockTx.game.findUnique.mockResolvedValue({
        homeTeamId: "team-a",
        awayTeamId: "team-b",
      });

      const game = makeGame({ nextGameId: "game-next" });
      await advanceBracketTeams(tx, game, "team-home", "team-away");

      expect(mockTx.game.update).not.toHaveBeenCalled();
    });

    it("does not query or update when nextGameId is null", async () => {
      const game = makeGame({ nextGameId: null, loserNextGameId: null });
      await advanceBracketTeams(tx, game, "team-home", "team-away");

      expect(mockTx.game.findUnique).not.toHaveBeenCalled();
      expect(mockTx.game.update).not.toHaveBeenCalled();
    });
  });

  describe("loser advancement (double elimination)", () => {
    it("fills loser next game when loserNextGameId is set and loser is known", async () => {
      // findUnique called for loserNextGameId slot fill
      mockTx.game.findUnique.mockResolvedValue({ homeTeamId: null, awayTeamId: null });
      mockTx.game.update.mockResolvedValue({});

      const game = makeGame({ nextGameId: null, loserNextGameId: "game-losers" });
      await advanceBracketTeams(tx, game, "team-home", "team-away");

      expect(mockTx.game.findUnique).toHaveBeenCalledWith({
        where: { id: "game-losers" },
        select: { homeTeamId: true, awayTeamId: true },
      });
      expect(mockTx.game.update).toHaveBeenCalledWith({
        where: { id: "game-losers" },
        data: { homeTeamId: "team-away" },
      });
    });

    it("does not fill loser next game when loserTeamId is null (e.g. bye game)", async () => {
      const game = makeGame({ loserNextGameId: "game-losers" });
      await advanceBracketTeams(tx, game, "team-home", null);

      // findUnique may be called for winner (nextGameId is null here, so it won't)
      // but the loser slot fill should be skipped entirely
      expect(mockTx.game.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "game-losers" } })
      );
    });

    it("does not attempt loser advancement when loserNextGameId is null", async () => {
      const game = makeGame({ nextGameId: null, loserNextGameId: null });
      await advanceBracketTeams(tx, game, "team-home", "team-away");

      expect(mockTx.game.findUnique).not.toHaveBeenCalled();
      expect(mockTx.game.update).not.toHaveBeenCalled();
    });
  });

  describe("grand final reset", () => {
    it("activates reset game when LB finalist (away team) wins the grand final", async () => {
      const resetGameId = "game-reset";
      mockTx.game.findFirst.mockResolvedValue({ id: resetGameId });
      mockTx.game.update.mockResolvedValue({});

      const game = makeGame({
        bracketSide: "GRAND_FINAL",
        isBracketReset: false,
        homeTeamId: "team-wb",  // WB finalist
        awayTeamId: "team-lb",  // LB finalist
        nextGameId: null,
        loserNextGameId: null,
      });

      // LB finalist (away) wins
      await advanceBracketTeams(tx, game, "team-lb", "team-wb");

      expect(mockTx.game.findFirst).toHaveBeenCalledWith({
        where: {
          eventId: "event-1",
          divisionId: null,
          isBracketReset: true,
          deletedAt: null,
        },
      });
      expect(mockTx.game.update).toHaveBeenCalledWith({
        where: { id: resetGameId },
        data: {
          homeTeamId: "team-wb",    // WB team (loser of GF) plays home
          awayTeamId: "team-lb",    // LB team (winner of GF) plays away
          status: "SCHEDULED",
        },
      });
    });

    it("cancels (soft-deletes) reset game when WB finalist (home team) wins grand final", async () => {
      const resetGameId = "game-reset";
      mockTx.game.findFirst.mockResolvedValue({ id: resetGameId });
      mockTx.game.update.mockResolvedValue({});

      const game = makeGame({
        bracketSide: "GRAND_FINAL",
        isBracketReset: false,
        homeTeamId: "team-wb",
        awayTeamId: "team-lb",
        nextGameId: null,
        loserNextGameId: null,
      });

      // WB finalist (home) wins — tournament over, cancel the unused reset game
      await advanceBracketTeams(tx, game, "team-wb", "team-lb");

      expect(mockTx.game.findFirst).toHaveBeenCalled();
      expect(mockTx.game.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: resetGameId },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it("does NOT activate reset when isBracketReset is already true (this IS the reset game)", async () => {
      const game = makeGame({
        bracketSide: "GRAND_FINAL",
        isBracketReset: true,   // This game is already the reset
        homeTeamId: "team-wb",
        awayTeamId: "team-lb",
        nextGameId: null,
        loserNextGameId: null,
      });

      // Even if LB team wins, no further reset
      await advanceBracketTeams(tx, game, "team-lb", "team-wb");

      expect(mockTx.game.findFirst).not.toHaveBeenCalled();
    });

    it("does NOT activate reset when game is not GRAND_FINAL bracket side", async () => {
      const game = makeGame({
        bracketSide: "WINNERS",   // Regular winners bracket game
        isBracketReset: false,
        homeTeamId: "team-wb",
        awayTeamId: "team-lb",
        nextGameId: null,
        loserNextGameId: null,
      });

      await advanceBracketTeams(tx, game, "team-lb", "team-wb");

      expect(mockTx.game.findFirst).not.toHaveBeenCalled();
    });

    it("is a no-op for grand final reset when no reset game exists in DB", async () => {
      // findFirst returns null — reset game was not pre-created
      mockTx.game.findFirst.mockResolvedValue(null);

      const game = makeGame({
        bracketSide: "GRAND_FINAL",
        isBracketReset: false,
        homeTeamId: "team-wb",
        awayTeamId: "team-lb",
        nextGameId: null,
        loserNextGameId: null,
      });

      await advanceBracketTeams(tx, game, "team-lb", "team-wb");

      // findFirst was called but no update should follow
      expect(mockTx.game.findFirst).toHaveBeenCalled();
      expect(mockTx.game.update).not.toHaveBeenCalled();
    });
  });

  describe("combined winner + loser advancement", () => {
    it("advances both winner and loser when both next game IDs are set", async () => {
      // Two findUnique calls: one for nextGameId, one for loserNextGameId
      mockTx.game.findUnique
        .mockResolvedValueOnce({ homeTeamId: null, awayTeamId: null }) // winners bracket slot
        .mockResolvedValueOnce({ homeTeamId: null, awayTeamId: null }); // losers bracket slot
      mockTx.game.update.mockResolvedValue({});

      const game = makeGame({
        nextGameId: "game-winners-next",
        loserNextGameId: "game-losers-next",
      });

      await advanceBracketTeams(tx, game, "team-home", "team-away");

      expect(mockTx.game.update).toHaveBeenCalledTimes(2);
      expect(mockTx.game.update).toHaveBeenCalledWith({
        where: { id: "game-winners-next" },
        data: { homeTeamId: "team-home" },
      });
      expect(mockTx.game.update).toHaveBeenCalledWith({
        where: { id: "game-losers-next" },
        data: { homeTeamId: "team-away" },
      });
    });
  });
});
