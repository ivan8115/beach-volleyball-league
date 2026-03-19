import { describe, it, expect } from "vitest";
import {
  generateLeagueSchedule,
  type SchedulableTeam,
  type SchedulableTimeslot,
} from "@/lib/league-scheduler";

function makeTeams(n: number): SchedulableTeam[] {
  return Array.from({ length: n }, (_, i) => ({ id: `team-${i + 1}` }));
}

const baseSlots: SchedulableTimeslot[] = [
  { id: "slot-1", dayOfWeek: "MON", startTime: "18:00", courtId: "court-1" },
  { id: "slot-2", dayOfWeek: "MON", startTime: "19:00", courtId: "court-2" },
  { id: "slot-3", dayOfWeek: "WED", startTime: "18:00", courtId: "court-1" },
];

const startDate = new Date("2026-03-02T00:00:00Z"); // a Monday

describe("generateLeagueSchedule", () => {
  it("returns empty for fewer than 2 teams", () => {
    const result = generateLeagueSchedule({
      teams: makeTeams(1),
      timeslots: baseSlots,
      startDate,
      weeks: 10,
    });
    expect(result.games).toHaveLength(0);
    expect(result.totalWeeks).toBe(0);
  });

  it("throws if no timeslots provided", () => {
    expect(() =>
      generateLeagueSchedule({ teams: makeTeams(4), timeslots: [], startDate, weeks: 10 })
    ).toThrow();
  });

  it("generates correct number of games for 4 teams (even)", () => {
    // 4 teams: 4*(4-1)/2 = 6 games total (3 rounds * 2 games/round)
    const result = generateLeagueSchedule({
      teams: makeTeams(4),
      timeslots: baseSlots,
      startDate,
      weeks: 3,
    });
    const nonBye = result.games.filter((g) => !g.isBye);
    expect(nonBye).toHaveLength(6);
    expect(result.totalWeeks).toBe(3);
  });

  it("generates correct number of rounds for 6 teams (5 rounds)", () => {
    const result = generateLeagueSchedule({
      teams: makeTeams(6),
      timeslots: baseSlots,
      startDate,
      weeks: 10,
    });
    expect(result.totalWeeks).toBe(5);
    const nonBye = result.games.filter((g) => !g.isBye);
    // 6*(6-1)/2 = 15 non-bye games
    expect(nonBye).toHaveLength(15);
  });

  it("adds bye game for odd number of teams", () => {
    // 5 teams → padded to 6, so 5 rounds, each with 3 games (1 bye per round)
    const result = generateLeagueSchedule({
      teams: makeTeams(5),
      timeslots: baseSlots,
      startDate,
      weeks: 10,
    });
    const byes = result.games.filter((g) => g.isBye);
    expect(byes.length).toBeGreaterThan(0);
    // Each bye game has awayTeamId = null
    expect(byes.every((g) => g.awayTeamId === null)).toBe(true);
  });

  it("every team plays every other team exactly once (4 teams)", () => {
    const teams = makeTeams(4);
    const result = generateLeagueSchedule({
      teams,
      timeslots: baseSlots,
      startDate,
      weeks: 10,
    });

    const matchups = new Set<string>();
    for (const game of result.games.filter((g) => !g.isBye)) {
      const key = [game.homeTeamId, game.awayTeamId!].sort().join("|");
      expect(matchups.has(key)).toBe(false); // no duplicates
      matchups.add(key);
    }

    // Should have C(4,2) = 6 unique matchups
    expect(matchups.size).toBe(6);
  });

  it("every team plays every other team exactly once (6 teams)", () => {
    const teams = makeTeams(6);
    const result = generateLeagueSchedule({
      teams,
      timeslots: baseSlots,
      startDate,
      weeks: 10,
    });

    const matchups = new Set<string>();
    for (const game of result.games.filter((g) => !g.isBye)) {
      const key = [game.homeTeamId, game.awayTeamId!].sort().join("|");
      expect(matchups.has(key)).toBe(false);
      matchups.add(key);
    }
    expect(matchups.size).toBe(15);
  });

  it("respects the weeks cap", () => {
    // 6 teams normally needs 5 rounds, but cap at 3 weeks
    const result = generateLeagueSchedule({
      teams: makeTeams(6),
      timeslots: baseSlots,
      startDate,
      weeks: 3,
    });
    expect(result.totalWeeks).toBe(3);
    const weeks = new Set(result.games.map((g) => g.week));
    expect(Math.max(...weeks)).toBe(3);
  });

  it("assigns week numbers starting at 1", () => {
    const result = generateLeagueSchedule({
      teams: makeTeams(4),
      timeslots: baseSlots,
      startDate,
      weeks: 10,
    });
    const weeks = result.games.map((g) => g.week).sort((a, b) => a - b);
    expect(weeks[0]).toBe(1);
  });

  it("no two games share the same court at the same time", () => {
    // Single court, multiple games per round → potential conflict
    const singleCourt: SchedulableTimeslot[] = [
      { id: "slot-1", dayOfWeek: "MON", startTime: "18:00", courtId: "court-1" },
      { id: "slot-2", dayOfWeek: "MON", startTime: "19:00", courtId: "court-1" },
      { id: "slot-3", dayOfWeek: "MON", startTime: "20:00", courtId: "court-1" },
    ];

    const result = generateLeagueSchedule({
      teams: makeTeams(4),
      timeslots: singleCourt,
      startDate,
      weeks: 10,
    });

    // Check no court+time collision within a week
    for (let week = 1; week <= result.totalWeeks; week++) {
      const weekGames = result.games.filter((g) => g.week === week && g.courtId);
      const seen = new Set<string>();
      for (const game of weekGames) {
        const key = `${game.scheduledAt.toISOString()}_${game.courtId}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it("games have valid scheduledAt dates", () => {
    const result = generateLeagueSchedule({
      teams: makeTeams(4),
      timeslots: baseSlots,
      startDate,
      weeks: 3,
    });
    for (const game of result.games) {
      expect(game.scheduledAt).toBeInstanceOf(Date);
      expect(isNaN(game.scheduledAt.getTime())).toBe(false);
    }
  });
});
