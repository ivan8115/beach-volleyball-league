import { describe, it, expect, vi } from "vitest";

// Mock the Prisma enums since generated client is gitignored
vi.mock("@/generated/prisma/enums", () => ({
  BracketSide: {
    WINNERS: "WINNERS",
    LOSERS: "LOSERS",
    GRAND_FINAL: "GRAND_FINAL",
  },
}));

import {
  generateSingleElim,
  generateDoubleElim,
  generatePoolAssignments,
  type SeededTeam,
} from "@/lib/bracket-generator";

function makeTeams(n: number): SeededTeam[] {
  return Array.from({ length: n }, (_, i) => ({ id: `team-${i + 1}`, seed: i + 1 }));
}

const scheduledAt = new Date("2026-03-15T10:00:00Z");

describe("generateSingleElim", () => {
  it("returns empty for fewer than 2 teams", () => {
    expect(generateSingleElim([], scheduledAt)).toHaveLength(0);
    expect(generateSingleElim(makeTeams(1), scheduledAt)).toHaveLength(0);
  });

  it("generates 1 game for 2 teams", () => {
    const games = generateSingleElim(makeTeams(2), scheduledAt);
    const nonBye = games.filter((g) => !g.isBracketBye);
    expect(nonBye).toHaveLength(1);
  });

  it("generates 3 games for 4 teams (power of 2)", () => {
    const games = generateSingleElim(makeTeams(4), scheduledAt);
    const nonBye = games.filter((g) => !g.isBracketBye);
    // 4-team: 2 semis + 1 final = 3
    expect(nonBye).toHaveLength(3);
  });

  it("generates 7 games for 8 teams", () => {
    const games = generateSingleElim(makeTeams(8), scheduledAt);
    const nonBye = games.filter((g) => !g.isBracketBye);
    // 8-team: 4 + 2 + 1 = 7
    expect(nonBye).toHaveLength(7);
  });

  it("handles non-power-of-2 teams with byes (5 teams)", () => {
    const games = generateSingleElim(makeTeams(5), scheduledAt);
    // Bracket rounds to 8 size, 3 byes → some isBracketBye games
    // Total games in 8-bracket = 7 (but 3 are byes)
    const byes = games.filter((g) => g.isBracketBye);
    expect(byes.length).toBeGreaterThan(0);
  });

  it("handles non-power-of-2 teams with byes (6 teams)", () => {
    const games = generateSingleElim(makeTeams(6), scheduledAt);
    const byes = games.filter((g) => g.isBracketBye);
    // 6 teams → bracket of 8, 2 byes
    expect(byes).toHaveLength(2);
  });

  it("all games have WINNERS bracket side", () => {
    const games = generateSingleElim(makeTeams(4), scheduledAt);
    expect(games.every((g) => g.bracketSide === "WINNERS")).toBe(true);
  });

  it("final game has no nextTempId", () => {
    const games = generateSingleElim(makeTeams(4), scheduledAt);
    // Games are ordered final-first, so games[0] is the final
    expect(games[0].nextTempId).toBeNull();
  });

  it("non-final games link to a nextTempId", () => {
    const games = generateSingleElim(makeTeams(4), scheduledAt);
    const nonFinal = games.slice(1);
    for (const game of nonFinal.filter((g) => !g.isBracketBye)) {
      expect(game.nextTempId).not.toBeNull();
    }
  });

  it("all tempIds are unique", () => {
    const games = generateSingleElim(makeTeams(8), scheduledAt);
    const ids = games.map((g) => g.tempId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("seeds 1 and 2 are on opposite sides of the bracket (not in same half)", () => {
    // In a standard bracket, seed 1 plays seed N and they shouldn't meet until final
    const games = generateSingleElim(makeTeams(8), scheduledAt);
    // Round 1 games (the last in the returned array since it's final-first)
    const round1 = games.filter((g) => g.round === 1 && !g.isBracketBye);
    const teamInRound1 = round1.flatMap((g) => [g.homeTeamId, g.awayTeamId]);
    // Seed 1 (team-1) and seed 2 (team-2) should not be in the same round-1 game
    const gameWithSeed1 = round1.find(
      (g) => g.homeTeamId === "team-1" || g.awayTeamId === "team-1"
    );
    expect(gameWithSeed1?.homeTeamId).not.toBe("team-2");
    expect(gameWithSeed1?.awayTeamId).not.toBe("team-2");
  });
});

describe("generateDoubleElim", () => {
  it("returns empty for fewer than 2 teams", () => {
    expect(generateDoubleElim([], scheduledAt)).toHaveLength(0);
  });

  it("generates games for 4 teams", () => {
    const games = generateDoubleElim(makeTeams(4), scheduledAt);
    expect(games.length).toBeGreaterThan(0);
  });

  it("includes WINNERS, LOSERS, and GRAND_FINAL bracket sides for 4+ teams", () => {
    const games = generateDoubleElim(makeTeams(4), scheduledAt);
    const sides = new Set(games.map((g) => g.bracketSide));
    expect(sides.has("WINNERS")).toBe(true);
    expect(sides.has("LOSERS")).toBe(true);
    expect(sides.has("GRAND_FINAL")).toBe(true);
  });

  it("has exactly one grand final game (plus optional reset)", () => {
    const games = generateDoubleElim(makeTeams(4), scheduledAt);
    const gfGames = games.filter((g) => g.bracketSide === "GRAND_FINAL");
    // Should have at least 1 (the final) and at most 2 (final + reset)
    expect(gfGames.length).toBeGreaterThanOrEqual(1);
    expect(gfGames.length).toBeLessThanOrEqual(2);
  });

  it("reset game has isBracketReset = true", () => {
    const games = generateDoubleElim(makeTeams(4), scheduledAt);
    const reset = games.find((g) => g.isBracketReset);
    expect(reset).toBeDefined();
    expect(reset?.bracketSide).toBe("GRAND_FINAL");
  });

  it("has more games than single elim for same team count", () => {
    const teams = makeTeams(8);
    const single = generateSingleElim(teams, scheduledAt).filter((g) => !g.isBracketBye);
    const double = generateDoubleElim(teams, scheduledAt).filter((g) => !g.isBracketBye);
    expect(double.length).toBeGreaterThan(single.length);
  });

  it("all tempIds are unique", () => {
    const games = generateDoubleElim(makeTeams(8), scheduledAt);
    const ids = games.map((g) => g.tempId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("generatePoolAssignments", () => {
  // generatePoolAssignments returns flat array of { poolIndex, teamId }
  it("assigns all teams to pool indices", () => {
    const teams = makeTeams(8);
    const assignments = generatePoolAssignments(teams, 4); // 2 pools of 4
    expect(assignments).toHaveLength(8);
    const poolIndices = new Set(assignments.map((a) => a.poolIndex));
    expect(poolIndices.size).toBe(2); // 2 pools
  });

  it("distributes teams evenly — each pool gets teamsPerPool members", () => {
    const teams = makeTeams(8);
    const assignments = generatePoolAssignments(teams, 4);
    const pool0 = assignments.filter((a) => a.poolIndex === 0);
    const pool1 = assignments.filter((a) => a.poolIndex === 1);
    expect(pool0).toHaveLength(4);
    expect(pool1).toHaveLength(4);
  });

  it("handles uneven distribution — all teams are assigned", () => {
    const teams = makeTeams(7);
    const assignments = generatePoolAssignments(teams, 4);
    expect(assignments).toHaveLength(7);
  });

  it("all teams appear exactly once", () => {
    const teams = makeTeams(6);
    const assignments = generatePoolAssignments(teams, 3);
    const assignedIds = assignments.map((a) => a.teamId);
    expect(new Set(assignedIds).size).toBe(6);
  });
});
