/**
 * Bracket Generator
 *
 * Generates single elimination, double elimination, and pool play structures.
 * All functions return plain objects — no DB interaction.
 * Games must be created from final backward to round 1 so IDs exist for nextGameId links.
 */

import { BracketSide } from "@/generated/prisma/enums";

export interface SeededTeam {
  id: string;
  seed: number;
}

export interface BracketGame {
  /** Unique identifier within this generation run (used for linking nextGameId/loserNextGameId) */
  tempId: string;
  round: number;
  position: number;
  bracketSide: BracketSide;
  homeTeamId: string | null; // null = TBD (winner from previous game)
  awayTeamId: string | null;
  isBracketBye: boolean;
  isBracketReset: boolean;
  nextTempId: string | null; // winner advances here
  loserNextTempId: string | null; // loser goes here (double elim only)
  scheduledAt: Date;
}

/** Next power of 2 >= n */
function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

let tempIdCounter = 0;
function newTempId(): string {
  return `tmp_${++tempIdCounter}_${Date.now()}`;
}

/**
 * Seeding pairing for a bracket of size `bracketSize` with `n` actual teams:
 * Returns pairs as [topSeed, bottomSeed] for each first-round game.
 * Top `byes` seeds receive a bye in round 1.
 */
function buildFirstRoundPairing(n: number): Array<[number, number]> {
  const bracketSize = nextPowerOf2(n);
  const byes = bracketSize - n;

  // Standard bracket seeding: 1 vs bracketSize, 2 vs bracketSize-1, etc.
  const pairs: Array<[number, number]> = [];
  for (let i = 1; i <= bracketSize / 2; i++) {
    pairs.push([i, bracketSize + 1 - i]);
  }
  return pairs.map(([top, bot]) => {
    // Seeds > n are "byes" — replace with null indicator (use 0)
    return [top > n ? 0 : top, bot > n ? 0 : bot];
  });
}

/**
 * Generate a single elimination bracket.
 * Returns games ordered final-first (for DB insertion in reverse to get IDs for nextGameId).
 */
export function generateSingleElim(
  teams: SeededTeam[],
  scheduledAt: Date,
): BracketGame[] {
  const n = teams.length;
  if (n < 2) return [];

  const bracketSize = nextPowerOf2(n);
  const totalRounds = Math.log2(bracketSize);
  const games: BracketGame[] = [];

  // Build games round by round from final backwards
  // round totalRounds = final, round 1 = first round
  // We store them final-first so caller can insert in order and get IDs

  // Map: round -> list of games (by position)
  const roundGames: Map<number, BracketGame[]> = new Map();

  // Create final game (round = totalRounds, position = 1)
  const finalGame: BracketGame = {
    tempId: newTempId(),
    round: totalRounds,
    position: 1,
    bracketSide: BracketSide.WINNERS,
    homeTeamId: null,
    awayTeamId: null,
    isBracketBye: false,
    isBracketReset: false,
    nextTempId: null,
    loserNextTempId: null,
    scheduledAt,
  };
  games.push(finalGame);
  roundGames.set(totalRounds, [finalGame]);

  // Build from semifinals down to first round
  for (let round = totalRounds - 1; round >= 1; round--) {
    const numGames = Math.pow(2, totalRounds - round);
    const nextRound = roundGames.get(round + 1)!;
    const thisRound: BracketGame[] = [];

    for (let pos = 1; pos <= numGames; pos++) {
      // This game feeds into position ceil(pos/2) of the next round
      const nextPos = Math.ceil(pos / 2);
      const nextGame = nextRound.find((g) => g.position === nextPos)!;

      const game: BracketGame = {
        tempId: newTempId(),
        round,
        position: pos,
        bracketSide: BracketSide.WINNERS,
        homeTeamId: null,
        awayTeamId: null,
        isBracketBye: false,
        isBracketReset: false,
        nextTempId: nextGame.tempId,
        loserNextTempId: null,
        scheduledAt,
      };
      thisRound.push(game);
      games.push(game);
    }
    roundGames.set(round, thisRound);
  }

  // Assign teams to first round games using seeding pairing
  const firstRound = roundGames.get(1)!;
  const pairs = buildFirstRoundPairing(n);
  const teamBySeed = new Map(teams.map((t) => [t.seed, t]));

  firstRound.forEach((game, idx) => {
    const [topSeed, botSeed] = pairs[idx];
    const homeTeam = topSeed > 0 ? (teamBySeed.get(topSeed)?.id ?? null) : null;
    const awayTeam = botSeed > 0 ? (teamBySeed.get(botSeed)?.id ?? null) : null;

    game.homeTeamId = homeTeam;
    game.awayTeamId = awayTeam;

    // Bracket bye: one side is null (team auto-advances)
    if (homeTeam !== null && awayTeam === null) {
      game.isBracketBye = true;
    }
  });

  // Return games ordered: final first, then by round descending (for DB insertion)
  return games.sort((a, b) => b.round - a.round || a.position - b.position);
}

/**
 * Generate a double elimination bracket.
 * Returns games: final first, then round desc.
 */
export function generateDoubleElim(
  teams: SeededTeam[],
  scheduledAt: Date,
): BracketGame[] {
  const n = teams.length;
  if (n < 2) return [];

  const bracketSize = nextPowerOf2(n);
  const wbRounds = Math.log2(bracketSize);
  const games: BracketGame[] = [];

  // ---- Winners Bracket ----
  const wbRoundGames: Map<number, BracketGame[]> = new Map();

  // WB final (semi-final feeding grand final)
  for (let round = wbRounds; round >= 1; round--) {
    const numGames = Math.pow(2, wbRounds - round);
    const thisRound: BracketGame[] = [];

    for (let pos = 1; pos <= numGames; pos++) {
      const game: BracketGame = {
        tempId: newTempId(),
        round,
        position: pos,
        bracketSide: BracketSide.WINNERS,
        homeTeamId: null,
        awayTeamId: null,
        isBracketBye: false,
        isBracketReset: false,
        nextTempId: null, // will wire up below
        loserNextTempId: null, // will wire up to LB below
        scheduledAt,
      };
      thisRound.push(game);
      games.push(game);
    }
    wbRoundGames.set(round, thisRound);
  }

  // Wire WB nextTempId
  for (let round = 1; round < wbRounds; round++) {
    const thisRound = wbRoundGames.get(round)!;
    const nextRound = wbRoundGames.get(round + 1)!;
    thisRound.forEach((game, idx) => {
      const nextPos = Math.ceil((idx + 1) / 2);
      game.nextTempId = nextRound.find((g) => g.position === nextPos)!.tempId;
    });
  }

  // ---- Losers Bracket ----
  // LB has 2*(wbRounds-1) rounds: each WB round produces one LB round of new losers,
  // then one LB vs LB round before accepting next WB losers.
  // LB round structure:
  //   LB_r1: WB_r1 losers (bracketSize/2 games → bracketSize/4 teams advance)
  //   LB_r2: LB_r1 winners vs each other
  //   LB_r3: WB_r2 losers join
  //   ...
  // Total LB rounds = 2*(wbRounds - 1)

  const lbRoundGames: Map<number, BracketGame[]> = new Map();
  const lbTotalRounds = 2 * (wbRounds - 1);

  for (let lbRound = 1; lbRound <= lbTotalRounds; lbRound++) {
    // Calculate number of games in this LB round
    // LB round 1: bracketSize/4 games (bracketSize/2 losers from WB_r1)
    // LB round 2: bracketSize/8 games (survivors from LB_r1)
    // ...pattern: even rounds halve, odd rounds stay same or add new losers
    const numGames = Math.max(1, Math.pow(2, lbTotalRounds - lbRound - 1));
    const thisRound: BracketGame[] = [];

    for (let pos = 1; pos <= numGames; pos++) {
      const game: BracketGame = {
        tempId: newTempId(),
        round: lbRound,
        position: pos,
        bracketSide: BracketSide.LOSERS,
        homeTeamId: null,
        awayTeamId: null,
        isBracketBye: false,
        isBracketReset: false,
        nextTempId: null,
        loserNextTempId: null,
        scheduledAt,
      };
      thisRound.push(game);
      games.push(game);
    }
    lbRoundGames.set(lbRound, thisRound);
  }

  // Wire LB nextTempId (losers eliminated, winners advance)
  for (let lbRound = 1; lbRound < lbTotalRounds; lbRound++) {
    const thisRound = lbRoundGames.get(lbRound)!;
    const nextRound = lbRoundGames.get(lbRound + 1)!;
    thisRound.forEach((game, idx) => {
      const nextPos = Math.min(Math.ceil((idx + 1) / 2), nextRound.length);
      const nextGame = nextRound.find((g) => g.position === nextPos);
      game.nextTempId = nextGame?.tempId ?? null;
    });
  }

  // Wire WB losers → LB
  // WB round r losers go to LB round (2r-1) for odd LB rounds (they receive new losers)
  for (let wbRound = 1; wbRound <= wbRounds - 1; wbRound++) {
    const lbRound = 2 * wbRound - 1;
    const wbGames = wbRoundGames.get(wbRound)!;
    const lbGames = lbRoundGames.get(lbRound) ?? [];
    wbGames.forEach((wbGame, idx) => {
      const lbGame = lbGames[idx % Math.max(lbGames.length, 1)];
      if (lbGame) {
        wbGame.loserNextTempId = lbGame.tempId;
      }
    });
  }

  // ---- Grand Final ----
  // WB finalist vs LB finalist; if LB team wins, bracket reset
  const grandFinal: BracketGame = {
    tempId: newTempId(),
    round: 1,
    position: 1,
    bracketSide: BracketSide.GRAND_FINAL,
    homeTeamId: null,
    awayTeamId: null,
    isBracketBye: false,
    isBracketReset: false,
    nextTempId: null,
    loserNextTempId: null,
    scheduledAt,
  };
  games.push(grandFinal);

  // Reset game (created as placeholder; only used if LB team wins GF)
  const resetGame: BracketGame = {
    tempId: newTempId(),
    round: 2,
    position: 1,
    bracketSide: BracketSide.GRAND_FINAL,
    homeTeamId: null,
    awayTeamId: null,
    isBracketBye: false,
    isBracketReset: true,
    nextTempId: null,
    loserNextTempId: null,
    scheduledAt,
  };
  games.push(resetGame);

  // Wire WB final → grand final
  const wbFinalRound = wbRoundGames.get(wbRounds)!;
  if (wbFinalRound.length > 0) {
    wbFinalRound[0].nextTempId = grandFinal.tempId;
    // WB finalist loses → eliminated (no loserNextTempId in grand final)
  }

  // Wire LB final → grand final
  const lbFinalRound = lbRoundGames.get(lbTotalRounds)!;
  if (lbFinalRound.length > 0) {
    lbFinalRound[0].nextTempId = grandFinal.tempId;
  }

  // Assign teams to WB first round
  const wbFirstRound = wbRoundGames.get(1)!;
  const pairs = buildFirstRoundPairing(n);
  const teamBySeed = new Map(teams.map((t) => [t.seed, t]));

  wbFirstRound.forEach((game, idx) => {
    if (idx >= pairs.length) return;
    const [topSeed, botSeed] = pairs[idx];
    game.homeTeamId = topSeed > 0 ? (teamBySeed.get(topSeed)?.id ?? null) : null;
    game.awayTeamId = botSeed > 0 ? (teamBySeed.get(botSeed)?.id ?? null) : null;
    if (game.homeTeamId !== null && game.awayTeamId === null) {
      game.isBracketBye = true;
    }
  });

  return games;
}

/**
 * Generate pool assignments for tournament pool play.
 * Returns an array of pools, each containing team IDs.
 * Teams are distributed snake-style (1→Pool A, 2→Pool B, 3→Pool C, 4→Pool C, 5→Pool B, 6→Pool A...)
 * for balanced seeding, but the plan says sequential so we use sequential.
 */
export interface PoolAssignment {
  poolIndex: number; // 0-based
  teamId: string;
}

export function generatePoolAssignments(
  teams: SeededTeam[],
  teamsPerPool: number,
): PoolAssignment[] {
  const sorted = [...teams].sort((a, b) => a.seed - b.seed);
  return sorted.map((team, idx) => ({
    poolIndex: idx % Math.ceil(sorted.length / teamsPerPool),
    teamId: team.id,
  }));
}

/**
 * Generate pool play games (full round-robin per pool).
 * Returns ScheduledGame-like objects (no timeslot cycling — all at tournamentStartDate).
 */
export interface PoolGame {
  poolIndex: number;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  courtId: string | null;
}

export function generatePoolGames(
  poolAssignments: PoolAssignment[],
  scheduledAt: Date,
  courtId: string | null = null,
): PoolGame[] {
  // Group by pool
  const pools = new Map<number, string[]>();
  for (const { poolIndex, teamId } of poolAssignments) {
    const existing = pools.get(poolIndex) ?? [];
    existing.push(teamId);
    pools.set(poolIndex, existing);
  }

  const games: PoolGame[] = [];

  for (const [poolIndex, teamIds] of pools.entries()) {
    // Full round-robin: every pair plays once
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        games.push({
          poolIndex,
          homeTeamId: teamIds[i],
          awayTeamId: teamIds[j],
          scheduledAt,
          courtId,
        });
      }
    }
  }

  return games;
}
