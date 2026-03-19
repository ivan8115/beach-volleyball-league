import { describe, it, expect } from "vitest";

/**
 * Standings calculation logic extracted from the API route for unit testing.
 * This mirrors the algorithm in src/app/api/org/[orgSlug]/events/[eventId]/standings/route.ts
 */

interface GameSet {
  homeScore: number;
  awayScore: number;
}

interface Game {
  homeTeamId: string | null;
  awayTeamId: string | null;
  forfeitingTeamId: string | null;
  status: "COMPLETED" | "FORFEITED";
  sets: GameSet[];
}

interface Team {
  id: string;
  name: string;
}

interface StandingsEntry {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsPlayed: number;
  pointsScored: number;
  pointsAgainst: number;
  pointsPlayed: number;
  setRatio: number;
  pointRatio: number;
}

function calculateStandings(teams: Team[], games: Game[]): StandingsEntry[] {
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  const standings = new Map<string, StandingsEntry>(
    teams.map((t) => [
      t.id,
      {
        teamId: t.id,
        teamName: t.name,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        setsPlayed: 0,
        pointsScored: 0,
        pointsAgainst: 0,
        pointsPlayed: 0,
        setRatio: 0,
        pointRatio: 0,
      },
    ])
  );

  for (const game of games) {
    const homeId = game.homeTeamId;
    const awayId = game.awayTeamId;
    if (!homeId || !awayId) continue;
    if (!teamMap.has(homeId) && !teamMap.has(awayId)) continue;

    if (game.status === "FORFEITED") {
      const winnerId = game.forfeitingTeamId === homeId ? awayId : homeId;
      const loserId = game.forfeitingTeamId ?? (winnerId === homeId ? awayId : homeId);
      const winner = standings.get(winnerId);
      const loser = standings.get(loserId);
      if (winner) { winner.wins++; winner.setsWon++; winner.setsPlayed++; }
      if (loser) { loser.losses++; loser.setsLost++; loser.setsPlayed++; }
      continue;
    }

    let homeSetsWon = 0, awaySetsWon = 0, homePoints = 0, awayPoints = 0;
    for (const set of game.sets) {
      homePoints += set.homeScore;
      awayPoints += set.awayScore;
      if (set.homeScore > set.awayScore) homeSetsWon++;
      else awaySetsWon++;
    }

    const totalSets = game.sets.length;
    const totalPoints = homePoints + awayPoints;
    const homeEntry = standings.get(homeId);
    const awayEntry = standings.get(awayId);

    if (homeEntry) {
      homeEntry.setsWon += homeSetsWon;
      homeEntry.setsLost += awaySetsWon;
      homeEntry.setsPlayed += totalSets;
      homeEntry.pointsScored += homePoints;
      homeEntry.pointsAgainst += awayPoints;
      homeEntry.pointsPlayed += totalPoints;
      if (homeSetsWon > awaySetsWon) homeEntry.wins++;
      else homeEntry.losses++;
    }

    if (awayEntry) {
      awayEntry.setsWon += awaySetsWon;
      awayEntry.setsLost += homeSetsWon;
      awayEntry.setsPlayed += totalSets;
      awayEntry.pointsScored += awayPoints;
      awayEntry.pointsAgainst += homePoints;
      awayEntry.pointsPlayed += totalPoints;
      if (awaySetsWon > homeSetsWon) awayEntry.wins++;
      else awayEntry.losses++;
    }
  }

  return Array.from(standings.values())
    .map((entry) => ({
      ...entry,
      setRatio: entry.setsPlayed > 0 ? entry.setsWon / entry.setsPlayed : 0,
      pointRatio: entry.pointsPlayed > 0 ? entry.pointsScored / entry.pointsPlayed : 0,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.setRatio !== a.setRatio) return b.setRatio - a.setRatio;
      return b.pointRatio - a.pointRatio;
    });
}

const teams: Team[] = [
  { id: "t1", name: "Team A" },
  { id: "t2", name: "Team B" },
  { id: "t3", name: "Team C" },
];

describe("standings calculation", () => {
  it("returns all teams with zero stats when no games played", () => {
    const result = calculateStandings(teams, []);
    expect(result).toHaveLength(3);
    expect(result.every((e) => e.wins === 0 && e.losses === 0)).toBe(true);
  });

  it("correctly counts wins and losses from a 2-set game", () => {
    const games: Game[] = [
      {
        homeTeamId: "t1",
        awayTeamId: "t2",
        forfeitingTeamId: null,
        status: "COMPLETED",
        sets: [
          { homeScore: 21, awayScore: 15 },
          { homeScore: 21, awayScore: 18 },
        ],
      },
    ];
    const result = calculateStandings(teams, games);
    const t1 = result.find((e) => e.teamId === "t1")!;
    const t2 = result.find((e) => e.teamId === "t2")!;
    expect(t1.wins).toBe(1);
    expect(t1.losses).toBe(0);
    expect(t2.wins).toBe(0);
    expect(t2.losses).toBe(1);
  });

  it("correctly tallies sets won/lost across multiple games", () => {
    const games: Game[] = [
      {
        homeTeamId: "t1",
        awayTeamId: "t2",
        forfeitingTeamId: null,
        status: "COMPLETED",
        sets: [
          { homeScore: 21, awayScore: 15 }, // t1 wins set
          { homeScore: 18, awayScore: 21 }, // t2 wins set
          { homeScore: 15, awayScore: 13 }, // t1 wins set (decider)
        ],
      },
      {
        homeTeamId: "t1",
        awayTeamId: "t3",
        forfeitingTeamId: null,
        status: "COMPLETED",
        sets: [
          { homeScore: 15, awayScore: 21 }, // t3 wins set
          { homeScore: 15, awayScore: 21 }, // t3 wins set
        ],
      },
    ];
    const result = calculateStandings(teams, games);
    const t1 = result.find((e) => e.teamId === "t1")!;
    expect(t1.wins).toBe(1);
    expect(t1.losses).toBe(1);
    expect(t1.setsWon).toBe(2); // won 2 sets total
    expect(t1.setsLost).toBe(3);
  });

  it("correctly accumulates points scored and against", () => {
    const games: Game[] = [
      {
        homeTeamId: "t1",
        awayTeamId: "t2",
        forfeitingTeamId: null,
        status: "COMPLETED",
        sets: [{ homeScore: 21, awayScore: 15 }],
      },
    ];
    const result = calculateStandings(teams, games);
    const t1 = result.find((e) => e.teamId === "t1")!;
    const t2 = result.find((e) => e.teamId === "t2")!;
    expect(t1.pointsScored).toBe(21);
    expect(t1.pointsAgainst).toBe(15);
    expect(t2.pointsScored).toBe(15);
    expect(t2.pointsAgainst).toBe(21);
  });

  it("handles forfeit: winning team gets win and set win", () => {
    const games: Game[] = [
      {
        homeTeamId: "t1",
        awayTeamId: "t2",
        forfeitingTeamId: "t2",
        status: "FORFEITED",
        sets: [],
      },
    ];
    const result = calculateStandings(teams, games);
    const t1 = result.find((e) => e.teamId === "t1")!;
    const t2 = result.find((e) => e.teamId === "t2")!;
    expect(t1.wins).toBe(1);
    expect(t1.setsWon).toBe(1);
    expect(t2.losses).toBe(1);
    expect(t2.setsLost).toBe(1);
  });

  it("calculates set ratio correctly", () => {
    const games: Game[] = [
      {
        homeTeamId: "t1",
        awayTeamId: "t2",
        forfeitingTeamId: null,
        status: "COMPLETED",
        sets: [
          { homeScore: 21, awayScore: 15 },
          { homeScore: 21, awayScore: 18 },
        ],
      },
    ];
    const result = calculateStandings(teams, games);
    const t1 = result.find((e) => e.teamId === "t1")!;
    // t1 won 2 sets out of 2 played → setRatio = 1.0
    expect(t1.setRatio).toBeCloseTo(1.0);
    const t2 = result.find((e) => e.teamId === "t2")!;
    // t2 won 0 sets out of 2 played → setRatio = 0.0
    expect(t2.setRatio).toBeCloseTo(0.0);
  });

  it("sorts by wins descending first", () => {
    const games: Game[] = [
      {
        homeTeamId: "t1",
        awayTeamId: "t2",
        forfeitingTeamId: null,
        status: "COMPLETED",
        sets: [{ homeScore: 21, awayScore: 15 }, { homeScore: 21, awayScore: 18 }],
      },
      {
        homeTeamId: "t3",
        awayTeamId: "t2",
        forfeitingTeamId: null,
        status: "COMPLETED",
        sets: [{ homeScore: 21, awayScore: 15 }, { homeScore: 21, awayScore: 18 }],
      },
    ];
    const result = calculateStandings(teams, games);
    // t1 and t3 both have 1 win, t2 has 0 wins → t2 should be last
    expect(result[result.length - 1].teamId).toBe("t2");
    expect(result[0].wins).toBeGreaterThanOrEqual(result[1].wins);
  });

  it("uses setRatio as tiebreaker when wins are equal", () => {
    // t1 and t2 both have 1 win but different set ratios
    const games: Game[] = [
      {
        // t1 wins 2-0 (better set ratio)
        homeTeamId: "t1",
        awayTeamId: "t3",
        forfeitingTeamId: null,
        status: "COMPLETED",
        sets: [{ homeScore: 21, awayScore: 15 }, { homeScore: 21, awayScore: 18 }],
      },
      {
        // t2 wins 2-1 (worse set ratio)
        homeTeamId: "t2",
        awayTeamId: "t3",
        forfeitingTeamId: null,
        status: "COMPLETED",
        sets: [
          { homeScore: 21, awayScore: 15 },
          { homeScore: 15, awayScore: 21 },
          { homeScore: 15, awayScore: 13 },
        ],
      },
    ];
    const result = calculateStandings(teams, games);
    const t1 = result.find((e) => e.teamId === "t1")!;
    const t2 = result.find((e) => e.teamId === "t2")!;
    // t1 has setRatio 1.0, t2 has setRatio 2/3 ≈ 0.67 → t1 ranked higher
    const t1Rank = result.indexOf(t1);
    const t2Rank = result.indexOf(t2);
    expect(t1Rank).toBeLessThan(t2Rank);
  });

  it("setRatio is 0 when no sets played", () => {
    const result = calculateStandings(teams, []);
    expect(result.every((e) => e.setRatio === 0)).toBe(true);
  });

  it("pointRatio is 0 when no points played", () => {
    const result = calculateStandings(teams, []);
    expect(result.every((e) => e.pointRatio === 0)).toBe(true);
  });
});
