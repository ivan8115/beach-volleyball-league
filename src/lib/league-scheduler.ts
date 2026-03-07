/**
 * League Round-Robin Scheduler (Circle Method)
 *
 * Given N teams, produces matchups for each week using the circle method:
 *   - If N is odd, add a virtual "bye" team → N_eff = N + 1
 *   - Fix team[0], rotate team[1..N_eff-1] for each round
 *   - Produces N_eff - 1 rounds total
 */

export interface SchedulableTeam {
  id: string;
}

export interface SchedulableTimeslot {
  id: string;
  dayOfWeek: string; // "MON" | "TUE" | ... | "SUN"
  startTime: string; // "HH:MM"
  courtId: string | null;
}

export interface ScheduledGame {
  week: number;
  homeTeamId: string;
  awayTeamId: string | null; // null = bye
  isBye: boolean;
  courtId: string | null;
  scheduledAt: Date;
  timeslotId: string;
}

const DAY_OFFSET: Record<string, number> = {
  MON: 0,
  TUE: 1,
  WED: 2,
  THU: 3,
  FRI: 4,
  SAT: 5,
  SUN: 6,
};

/**
 * Returns the Date for a given week's timeslot relative to leagueStartDate.
 * leagueStartDate should be a Monday (or whatever the first game day is).
 */
function slotToDate(weekStartMonday: Date, slot: SchedulableTimeslot): Date {
  const [hours, minutes] = slot.startTime.split(":").map(Number);
  const dayOffset = DAY_OFFSET[slot.dayOfWeek] ?? 0;
  const d = new Date(weekStartMonday);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Advances a Monday date by `weeks` weeks.
 */
function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

/**
 * Finds the Monday on or before the given date.
 */
function toMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface GenerateLeagueScheduleOptions {
  teams: SchedulableTeam[];
  timeslots: SchedulableTimeslot[];
  startDate: Date; // first day of league play
  weeks: number; // max number of weeks to schedule
}

export interface GenerateLeagueScheduleResult {
  games: ScheduledGame[];
  totalWeeks: number;
}

export function generateLeagueSchedule({
  teams,
  timeslots,
  startDate,
  weeks,
}: GenerateLeagueScheduleOptions): GenerateLeagueScheduleResult {
  if (teams.length < 2) {
    return { games: [], totalWeeks: 0 };
  }
  if (timeslots.length === 0) {
    throw new Error("At least one timeslot is required to generate a schedule");
  }

  // Add bye team if odd number
  const BYE_ID = "__BYE__";
  const teamIds = teams.map((t) => t.id);
  if (teamIds.length % 2 !== 0) {
    teamIds.push(BYE_ID);
  }
  const n = teamIds.length;
  const totalRounds = Math.min(n - 1, weeks);

  const weekStartMonday = toMonday(startDate);
  const games: ScheduledGame[] = [];

  // Circle method: fix index 0, rotate indices 1..n-1
  const circle = [...Array(n).keys()]; // [0, 1, 2, ..., n-1]

  for (let round = 0; round < totalRounds; round++) {
    const week = round + 1;
    const weekStart = addWeeks(weekStartMonday, round);

    // Build matchups for this round
    const matchups: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const home = teamIds[circle[i]];
      const away = teamIds[circle[n - 1 - i]];
      matchups.push([home, away]);
    }

    // Assign timeslots cycling through available slots
    // Validate: no two games on same court at same time
    const slotAssignments: Map<string, string[]> = new Map(); // "YYYY-MM-DD_courtId" -> []

    let slotIndex = 0;
    for (const [homeId, awayId] of matchups) {
      const isBye = homeId === BYE_ID || awayId === BYE_ID;
      const actualHomeId = homeId === BYE_ID ? awayId : homeId;
      const actualAwayId = homeId === BYE_ID || awayId === BYE_ID ? null : awayId;

      // Try to find a slot without court conflict
      let assignedSlot: SchedulableTimeslot | null = null;
      let assignedDate: Date | null = null;
      let attempts = 0;

      while (attempts < timeslots.length) {
        const candidate = timeslots[(slotIndex + attempts) % timeslots.length];
        const candidateDate = slotToDate(weekStart, candidate);
        const key = `${candidateDate.toISOString()}_${candidate.courtId ?? "none"}`;

        const courtConflicts = slotAssignments.get(key) ?? [];
        if (courtConflicts.length === 0 || !candidate.courtId) {
          // No conflict (or no court assigned — multiple games ok without court)
          assignedSlot = candidate;
          assignedDate = candidateDate;
          slotAssignments.set(key, [...courtConflicts, actualHomeId]);
          slotIndex = (slotIndex + attempts + 1) % timeslots.length;
          break;
        }
        attempts++;
      }

      // If still no slot found (all courts taken), fall back to first slot without conflict checking
      if (!assignedSlot || !assignedDate) {
        const fallback = timeslots[slotIndex % timeslots.length];
        assignedSlot = fallback;
        assignedDate = slotToDate(weekStart, fallback);
        slotIndex = (slotIndex + 1) % timeslots.length;
      }

      games.push({
        week,
        homeTeamId: actualHomeId,
        awayTeamId: actualAwayId,
        isBye,
        courtId: assignedSlot.courtId,
        scheduledAt: assignedDate,
        timeslotId: assignedSlot.id,
      });
    }

    // Rotate: keep circle[0] fixed, rotate circle[1..n-1] left by 1
    const last = circle[n - 1];
    for (let i = n - 1; i > 1; i--) {
      circle[i] = circle[i - 1];
    }
    circle[1] = last;
  }

  return { games, totalWeeks: totalRounds };
}
