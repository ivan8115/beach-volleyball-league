/**
 * Demo seed — creates 5 orgs with full dummy data for the logged-in user.
 * Run: npx tsx prisma/seed-demo.ts
 */
import { config } from "dotenv";
config();

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { customAlphabet } from "nanoid";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function weeksFromNow(n: number) {
  return daysFromNow(n * 7);
}

// ─── Fake member pool ────────────────────────────────────────────────────────

const FAKE_MEMBERS = [
  { name: "Alex Rivera",    email: "alex.rivera@demo.test",    skillLevel: "ADVANCED",     gender: "MALE" },
  { name: "Jordan Kim",     email: "jordan.kim@demo.test",     skillLevel: "INTERMEDIATE", gender: "FEMALE" },
  { name: "Taylor Nguyen",  email: "taylor.nguyen@demo.test",  skillLevel: "INTERMEDIATE", gender: "MALE" },
  { name: "Morgan Patel",   email: "morgan.patel@demo.test",   skillLevel: "BEGINNER",     gender: "FEMALE" },
  { name: "Casey Williams", email: "casey.williams@demo.test", skillLevel: "ADVANCED",     gender: "MALE" },
  { name: "Riley Thompson", email: "riley.thompson@demo.test", skillLevel: "OPEN",         gender: "FEMALE" },
  { name: "Drew Martinez",  email: "drew.martinez@demo.test",  skillLevel: "INTERMEDIATE", gender: "MALE" },
  { name: "Quinn Johnson",  email: "quinn.johnson@demo.test",  skillLevel: "ADVANCED",     gender: "FEMALE" },
  { name: "Avery Brown",    email: "avery.brown@demo.test",    skillLevel: "BEGINNER",     gender: "MALE" },
  { name: "Blake Davis",    email: "blake.davis@demo.test",    skillLevel: "INTERMEDIATE", gender: "FEMALE" },
  { name: "Sam Wilson",     email: "sam.wilson@demo.test",     skillLevel: "ADVANCED",     gender: "MALE" },
  { name: "Jamie Lee",      email: "jamie.lee@demo.test",      skillLevel: "INTERMEDIATE", gender: "FEMALE" },
  { name: "Chris Garcia",   email: "chris.garcia@demo.test",   skillLevel: "OPEN",         gender: "MALE" },
  { name: "Pat Chen",       email: "pat.chen@demo.test",       skillLevel: "BEGINNER",     gender: "FEMALE" },
  { name: "Reese Torres",   email: "reese.torres@demo.test",   skillLevel: "INTERMEDIATE", gender: "MALE" },
  { name: "Dana Scott",     email: "dana.scott@demo.test",     skillLevel: "ADVANCED",     gender: "FEMALE" },
  { name: "Skyler Adams",   email: "skyler.adams@demo.test",   skillLevel: "INTERMEDIATE", gender: "MALE" },
  { name: "Frankie Hall",   email: "frankie.hall@demo.test",   skillLevel: "BEGINNER",     gender: "FEMALE" },
  { name: "Rowan White",    email: "rowan.white@demo.test",    skillLevel: "INTERMEDIATE", gender: "MALE" },
  { name: "Emery Clark",    email: "emery.clark@demo.test",    skillLevel: "ADVANCED",     gender: "FEMALE" },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Find the real user
  const adminUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!adminUser) {
    console.error("No users found — sign up first, then run this script.");
    process.exit(1);
  }
  console.log(`Creating demo data for: ${adminUser.name} (${adminUser.email})`);

  // Upsert fake member users
  console.log("Creating fake member accounts…");
  const fakeUsers: Array<{ id: string; name: string }> = [];
  for (const m of FAKE_MEMBERS) {
    const existing = await prisma.user.findFirst({ where: { email: m.email } });
    if (existing) {
      fakeUsers.push({ id: existing.id, name: existing.name });
    } else {
      const u = await prisma.user.create({
        data: {
          supabaseUserId: crypto.randomUUID(),
          email: m.email,
          name: m.name,
          gender: m.gender as "MALE" | "FEMALE",
          skillLevel: m.skillLevel as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "OPEN",
          isOver18: true,
          tosAcceptedAt: new Date(),
        },
      });
      fakeUsers.push({ id: u.id, name: u.name });
    }
  }

  await createOrg1(adminUser.id, fakeUsers);
  await createOrg2(adminUser.id, fakeUsers);
  await createOrg3(adminUser.id, fakeUsers);
  await createOrg4(adminUser.id, fakeUsers);
  await createOrg5(adminUser.id, fakeUsers);

  console.log("\n✓ Demo seed complete! Open http://localhost:3000/dashboard");
}

// ─── Org 1: Active summer league, mid-season ────────────────────────────────
// Lots of scores entered, standings visible

async function createOrg1(adminId: string, pool: Array<{ id: string; name: string }>) {
  console.log("\n[1/5] Sunset Beach VB League — active summer league");
  const org = await upsertOrg(adminId, {
    name: "Sunset Beach VB",
    slug: "sunset-beach-vb",
    timezone: "America/Los_Angeles",
  });

  const members = await addMembers(org.id, pool.slice(0, 12));
  const venue = await createVenue(org.id, "Mission Beach Sports Complex", "San Diego", "CA");
  const court1 = await createCourt(venue.id, "Court A");
  const court2 = await createCourt(venue.id, "Court B");

  // League event — ACTIVE, week 4 of 8
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      type: "LEAGUE",
      name: "Summer Co-Ed League 2026",
      status: "ACTIVE",
      visibility: "PUBLIC",
      description: "8-week co-ed doubles league. All skill levels welcome.",
      startDate: weeksFromNow(-3),
      weeks: 8,
      minRosterSize: 2,
      maxRosterSize: 4,
      maxTeams: 8,
      registrationFee: 40,
      refundPolicy: "NONE",
      seedingType: "MANUAL",
      leagueMaxSets: 3,
      leaguePointsToWinSet: 21,
      leaguePointsToWinDecider: 15,
      collectAvailability: true,
    },
  });

  const div = await prisma.division.create({
    data: { eventId: event.id, name: "Open", bracketType: "SINGLE_ELIM", playoffTeams: 4, switchToSingleElimAtSemifinals: false },
  });

  // 6 teams
  const teamNames = ["Sand Sharks", "Wave Riders", "Beach Bombers", "Spike Squad", "Net Ninjas", "Dig Deep"];
  const teams: string[] = [];
  for (let i = 0; i < 6; i++) {
    const t = await prisma.team.create({
      data: { name: teamNames[i], eventId: event.id, divisionId: div.id, registrationStatus: "REGISTERED" },
    });
    teams.push(t.id);
    await prisma.teamMember.create({
      data: { teamId: t.id, userId: members[i * 2].userId, role: "CAPTAIN", registrationStatus: "REGISTERED" },
    });
    if (members[i * 2 + 1]) {
      await prisma.teamMember.create({
        data: { teamId: t.id, userId: members[i * 2 + 1].userId, role: "PLAYER", registrationStatus: "REGISTERED" },
      });
    }
  }

  // Timeslots: Tue & Thu 6pm
  await prisma.timeSlot.createMany({
    data: [
      { eventId: event.id, dayOfWeek: "TUE", startTime: "18:00", courtId: court1.id },
      { eventId: event.id, dayOfWeek: "THU", startTime: "18:00", courtId: court2.id },
    ],
  });

  // Generate 3 weeks of games (weeks 1-3 completed, week 4 in progress)
  const pairings = [
    [0,1],[2,3],[4,5],[0,2],[1,3],[4,0],[5,2],[1,4],[3,5],[0,3],[2,4],[1,5],
  ];
  const scores: Array<[number,number][]> = [
    // Week 1
    [[21,15],[19,21],[21,17]], [[21,14],[21,18]], [[21,19],[18,21],[15,12]],
    // Week 2
    [[21,13],[21,16]], [[15,21],[21,17],[21,14]], [[21,18],[21,16]],
    // Week 3
    [[17,21],[21,14],[21,19]], [[21,15],[21,18]], [[21,16],[16,21],[21,13]],
    // Week 4 — partially scored
    [[21,18],[21,17]], null!, null!,
  ];

  for (let i = 0; i < pairings.length; i++) {
    const [h, a] = pairings[i];
    const week = Math.floor(i / 3) + 1;
    const scheduledAt = new Date(event.startDate!);
    scheduledAt.setDate(scheduledAt.getDate() + (week - 1) * 7 + (i % 2 === 0 ? 1 : 3));
    scheduledAt.setHours(18, 0, 0, 0);

    const gameScores = scores[i];
    const status = gameScores ? (week < 4 ? "COMPLETED" : "IN_PROGRESS") : "SCHEDULED";

    const game = await prisma.game.create({
      data: {
        eventId: event.id,
        divisionId: div.id,
        homeTeamId: teams[h],
        awayTeamId: teams[a],
        courtId: i % 2 === 0 ? court1.id : court2.id,
        week,
        status,
        isBye: false,
        scheduledAt,
      },
    });

    if (gameScores) {
      for (let s = 0; s < gameScores.length; s++) {
        await prisma.gameSet.create({
          data: { gameId: game.id, setNumber: s + 1, homeScore: gameScores[s][0], awayScore: gameScores[s][1], completedAt: new Date() },
        });
      }
    }
  }

  // A few announcements
  await prisma.announcement.create({
    data: {
      organizationId: org.id,
      eventId: event.id,
      targetType: "EVENT",
      targetId: event.id,
      title: "Week 4 Schedule Posted",
      body: "Games for week 4 are now live! Check the schedule tab for your match times. Courts will be chalked by 5:45pm.",
      postedById: adminId,
    },
  });

  console.log("  ✓ Sunset Beach VB — 6 teams, 3 weeks scored");
}

// ─── Org 2: Tournament org — bracket in progress ────────────────────────────

async function createOrg2(adminId: string, pool: Array<{ id: string; name: string }>) {
  console.log("[2/5] SoCal Volleyball Club — single elim tournament");
  const org = await upsertOrg(adminId, {
    name: "SoCal VB Club",
    slug: "socal-vb-club",
    timezone: "America/Los_Angeles",
  });

  const members = await addMembers(org.id, pool.slice(4, 16));
  const venue = await createVenue(org.id, "Venice Beach Courts", "Los Angeles", "CA");
  const court1 = await createCourt(venue.id, "Main Court");
  const court2 = await createCourt(venue.id, "Side Court");

  // Tournament — ACTIVE (bracket in progress, QF done, SF scheduled)
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      type: "TOURNAMENT",
      name: "Summer Slam 2026",
      status: "ACTIVE",
      visibility: "PUBLIC",
      description: "16-team single-elimination tournament. $500 prize pool.",
      tournamentStartDate: daysFromNow(-2),
      bracketType: "SINGLE_ELIM",
      minRosterSize: 2,
      maxRosterSize: 2,
      maxTeams: 8,
      registrationFee: 75,
      refundPolicy: "NONE",
      seedingType: "MANUAL",
      tournamentMaxSets: 3,
      tournamentPointsToWinSet: 21,
      tournamentPointsToWinDecider: 15,
    },
  });

  const div = await prisma.division.create({
    data: { eventId: event.id, name: "Open", bracketType: "SINGLE_ELIM", playoffTeams: 8, switchToSingleElimAtSemifinals: false },
  });

  const teamNames = ["Pacific Smash", "Voltage VB", "Desert Storm", "High Tide", "Block Party", "Dig Dynasty", "Ace Club", "Net Force"];
  const teams: string[] = [];
  for (let i = 0; i < 8; i++) {
    const t = await prisma.team.create({
      data: { name: teamNames[i], eventId: event.id, divisionId: div.id, registrationStatus: "REGISTERED" },
    });
    teams.push(t.id);
    const m1idx = (i * 2) % members.length;
    const m2idx = (i * 2 + 1) % members.length;
    await prisma.teamMember.create({ data: { teamId: t.id, userId: members[m1idx].userId, role: "CAPTAIN", registrationStatus: "REGISTERED" } });
    await prisma.teamMember.create({ data: { teamId: t.id, userId: members[m2idx].userId, role: "PLAYER", registrationStatus: "REGISTERED" } });
  }

  // QF games (round 1) — all completed
  const qfMatchups = [[0,7],[1,6],[2,5],[3,4]];
  const qfWinners = [0,1,2,3]; // index into teams
  const qfGames: string[] = [];
  for (let i = 0; i < 4; i++) {
    const [h, a] = qfMatchups[i];
    const g = await prisma.game.create({
      data: {
        eventId: event.id, divisionId: div.id,
        homeTeamId: teams[h], awayTeamId: teams[a],
        courtId: i % 2 === 0 ? court1.id : court2.id,
        round: 1, position: i, bracketSide: "WINNERS",
        status: "COMPLETED", isBye: false, isBracketBye: false, isBracketReset: false,
        scheduledAt: daysFromNow(-2),
      },
    });
    qfGames.push(g.id);
    await prisma.gameSet.createMany({
      data: [
        { gameId: g.id, setNumber: 1, homeScore: 21, awayScore: 16, completedAt: new Date() },
        { gameId: g.id, setNumber: 2, homeScore: 21, awayScore: 18, completedAt: new Date() },
      ],
    });
  }

  // SF games (round 2) — scheduled, winners slotted in
  const sfGames: string[] = [];
  for (let i = 0; i < 2; i++) {
    const g = await prisma.game.create({
      data: {
        eventId: event.id, divisionId: div.id,
        homeTeamId: teams[qfWinners[i * 2]],
        awayTeamId: teams[qfWinners[i * 2 + 1]],
        courtId: court1.id,
        round: 2, position: i, bracketSide: "WINNERS",
        status: "SCHEDULED", isBye: false, isBracketBye: false, isBracketReset: false,
        scheduledAt: daysFromNow(1),
      },
    });
    sfGames.push(g.id);
  }

  // Final — scheduled
  await prisma.game.create({
    data: {
      eventId: event.id, divisionId: div.id,
      homeTeamId: null, awayTeamId: null,
      courtId: court1.id,
      round: 3, position: 0, bracketSide: "WINNERS",
      status: "SCHEDULED", isBye: false, isBracketBye: false, isBracketReset: false,
      scheduledAt: daysFromNow(2),
    },
  });

  console.log("  ✓ SoCal VB Club — 8 teams, QF done, SF tomorrow");
}

// ─── Org 3: League in registration phase ────────────────────────────────────

async function createOrg3(adminId: string, pool: Array<{ id: string; name: string }>) {
  console.log("[3/5] Bay Area Beach League — registration open");
  const org = await upsertOrg(adminId, {
    name: "Bay Area Beach League",
    slug: "bay-area-beach",
    timezone: "America/Los_Angeles",
  });

  const members = await addMembers(org.id, pool.slice(8, 18));
  const venue = await createVenue(org.id, "Crissy Field Beach", "San Francisco", "CA");
  const court1 = await createCourt(venue.id, "North Court");
  const court2 = await createCourt(venue.id, "South Court");
  await createCourt(venue.id, "Center Court");

  // Upcoming league — REGISTRATION open, starts in 2 weeks
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      type: "LEAGUE",
      name: "Fall Classic League",
      status: "REGISTRATION",
      visibility: "PUBLIC",
      description: "6-week fall league. Intermediate and above.",
      startDate: weeksFromNow(2),
      weeks: 6,
      minRosterSize: 2,
      maxRosterSize: 4,
      maxTeams: 10,
      registrationDeadline: weeksFromNow(1),
      registrationFee: 50,
      refundPolicy: "PARTIAL",
      refundDeadline: daysFromNow(7),
      seedingType: "MANUAL",
      leagueMaxSets: 3,
      leaguePointsToWinSet: 21,
      leaguePointsToWinDecider: 15,
    },
  });

  const div = await prisma.division.create({
    data: { eventId: event.id, name: "Intermediate", bracketType: "SINGLE_ELIM", playoffTeams: 4, switchToSingleElimAtSemifinals: false },
  });

  // 5 teams registered, 2 waitlisted
  const teamNames = ["Golden Gate Spikers", "Fog City Aces", "Bay Blasters", "Alcatraz Blockers", "Ferry Flyers", "Oakland Crushers", "Richmond Rockets"];
  for (let i = 0; i < teamNames.length; i++) {
    const isWaitlisted = i >= 5;
    const t = await prisma.team.create({
      data: {
        name: teamNames[i],
        eventId: event.id,
        divisionId: div.id,
        registrationStatus: isWaitlisted ? "WAITLISTED" : "REGISTERED",
      },
    });
    const memberIdx = i % members.length;
    await prisma.teamMember.create({
      data: { teamId: t.id, userId: members[memberIdx].userId, role: "CAPTAIN", registrationStatus: "REGISTERED" },
    });
    if (isWaitlisted) {
      await prisma.waitlist.create({ data: { eventId: event.id, teamId: t.id, position: i - 4 } });
    }
  }

  // A free agent
  await prisma.freeAgent.create({
    data: { eventId: event.id, userId: members[members.length - 1].userId, notes: "Looking for a team! Intermediate level, available most evenings.", status: "AVAILABLE" },
  });

  // Timeslots
  await prisma.timeSlot.createMany({
    data: [
      { eventId: event.id, dayOfWeek: "WED", startTime: "17:30", courtId: court1.id },
      { eventId: event.id, dayOfWeek: "SAT", startTime: "09:00", courtId: court2.id },
    ],
  });

  // Announcement
  await prisma.announcement.create({
    data: {
      organizationId: org.id,
      targetType: "ORG",
      targetId: org.id,
      title: "Fall Classic Registration Now Open!",
      body: "Registration for our Fall Classic League is open. Spots are filling fast — sign up now to guarantee your place. Waitlisted teams will be promoted as spots open up.",
      postedById: adminId,
    },
  });

  console.log("  ✓ Bay Area Beach League — 5 registered, 2 waitlisted, 1 free agent");
}

// ─── Org 4: Draft event + multiple venues ───────────────────────────────────

async function createOrg4(adminId: string, pool: Array<{ id: string; name: string }>) {
  console.log("[4/5] East Coast VB — draft event, multiple venues");
  const org = await upsertOrg(adminId, {
    name: "East Coast VB",
    slug: "east-coast-vb",
    timezone: "America/New_York",
  });

  await addMembers(org.id, pool.slice(0, 8));
  const venue1 = await createVenue(org.id, "South Beach Complex", "Miami Beach", "FL");
  await createCourt(venue1.id, "Court 1");
  await createCourt(venue1.id, "Court 2");
  await createCourt(venue1.id, "Court 3");

  const venue2 = await createVenue(org.id, "North Shore Park", "Miami", "FL");
  await createCourt(venue2.id, "Court A");
  await createCourt(venue2.id, "Court B");

  // Active league
  await prisma.event.create({
    data: {
      organizationId: org.id,
      type: "LEAGUE",
      name: "Winter Warm-Up League",
      status: "ACTIVE",
      visibility: "PUBLIC",
      startDate: weeksFromNow(-2),
      weeks: 10,
      minRosterSize: 2,
      maxRosterSize: 6,
      registrationFee: 60,
      refundPolicy: "NONE",
      seedingType: "RANDOM",
      leagueMaxSets: 3,
      leaguePointsToWinSet: 21,
      leaguePointsToWinDecider: 15,
    },
  });

  // Draft tournament — hasn't been published yet
  await prisma.event.create({
    data: {
      organizationId: org.id,
      type: "TOURNAMENT",
      name: "Spring Invitational 2026",
      status: "DRAFT",
      visibility: "PRIVATE",
      description: "Invite-only tournament for top-ranked teams from our winter league.",
      tournamentStartDate: weeksFromNow(8),
      bracketType: "DOUBLE_ELIM",
      minRosterSize: 2,
      maxRosterSize: 2,
      registrationFee: 100,
      refundPolicy: "PARTIAL",
      seedingType: "MANUAL",
      tournamentMaxSets: 3,
      tournamentPointsToWinSet: 21,
      tournamentPointsToWinDecider: 15,
    },
  });

  await prisma.announcement.create({
    data: {
      organizationId: org.id,
      targetType: "ORG",
      targetId: org.id,
      title: "Welcome to East Coast VB!",
      body: "Thanks for joining. Our Winter Warm-Up League is already underway. Stay tuned for news about the Spring Invitational — invites go out to top-10 teams at the end of the season.",
      postedById: adminId,
    },
  });

  console.log("  ✓ East Coast VB — 2 venues, 1 active league + 1 draft tournament");
}

// ─── Org 5: Completed season ─────────────────────────────────────────────────

async function createOrg5(adminId: string, pool: Array<{ id: string; name: string }>) {
  console.log("[5/5] Mountain West VB — completed season, analytics data");
  const org = await upsertOrg(adminId, {
    name: "Mountain West VB",
    slug: "mountain-west-vb",
    timezone: "America/Denver",
  });

  const members = await addMembers(org.id, pool.slice(0, 16));
  const venue = await createVenue(org.id, "Denver Sports Park", "Denver", "CO");
  const court1 = await createCourt(venue.id, "Sand Court 1");
  const court2 = await createCourt(venue.id, "Sand Court 2");

  // Completed league
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      type: "LEAGUE",
      name: "Spring 2026 League",
      status: "COMPLETED",
      visibility: "PUBLIC",
      description: "6-week spring league. All divisions.",
      startDate: weeksFromNow(-10),
      weeks: 6,
      minRosterSize: 2,
      maxRosterSize: 4,
      maxTeams: 6,
      registrationFee: 45,
      refundPolicy: "NONE",
      seedingType: "MANUAL",
      leagueMaxSets: 3,
      leaguePointsToWinSet: 21,
      leaguePointsToWinDecider: 15,
    },
  });

  const div = await prisma.division.create({
    data: { eventId: event.id, name: "Open", bracketType: "SINGLE_ELIM", playoffTeams: 4, switchToSingleElimAtSemifinals: false },
  });

  const teamNames = ["Rocky Mountain High", "Mile High Spikers", "Front Range Aces", "Peaks & Valleys", "Summit Slammers", "Continental Dig"];
  const teams: string[] = [];
  for (let i = 0; i < 6; i++) {
    const t = await prisma.team.create({
      data: { name: teamNames[i], eventId: event.id, divisionId: div.id, registrationStatus: "REGISTERED" },
    });
    teams.push(t.id);
    await prisma.teamMember.create({ data: { teamId: t.id, userId: members[i * 2].userId, role: "CAPTAIN", registrationStatus: "REGISTERED" } });
    await prisma.teamMember.create({ data: { teamId: t.id, userId: members[i * 2 + 1].userId, role: "PLAYER", registrationStatus: "REGISTERED" } });
  }

  await prisma.timeSlot.createMany({
    data: [
      { eventId: event.id, dayOfWeek: "TUE", startTime: "18:30", courtId: court1.id },
      { eventId: event.id, dayOfWeek: "SAT", startTime: "10:00", courtId: court2.id },
    ],
  });

  // Full 6-week round-robin — all completed
  const pairings = [
    [0,1],[2,3],[4,5],[0,2],[1,4],[3,5],[0,3],[2,5],[1,5],[4,2],[0,4],[1,3],[0,5],[2,4],[3,1],
  ];
  const allScores: Array<[number,number][]> = [
    [[21,17],[21,14]],[[21,13],[21,18]],[[21,19],[18,21],[21,14]],
    [[21,15],[21,12]],[[17,21],[21,16],[21,18]],[[21,14],[21,16]],
    [[19,21],[21,17],[21,16]],[[21,18],[21,15]],[[21,11],[21,19]],
    [[21,16],[21,14]],[[18,21],[21,17],[21,13]],[[21,19],[21,16]],
    [[21,14],[21,17]],[[21,18],[21,15]],[[19,21],[21,14],[21,18]],
  ];

  for (let i = 0; i < pairings.length; i++) {
    const [h, a] = pairings[i];
    const week = Math.floor(i / 3) + 1;
    const scheduledAt = new Date(event.startDate!);
    scheduledAt.setDate(scheduledAt.getDate() + (week - 1) * 7 + (i % 2 === 0 ? 1 : 5));
    scheduledAt.setHours(18, 30, 0, 0);

    const game = await prisma.game.create({
      data: {
        eventId: event.id, divisionId: div.id,
        homeTeamId: teams[h], awayTeamId: teams[a],
        courtId: i % 2 === 0 ? court1.id : court2.id,
        week, status: "COMPLETED", isBye: false, scheduledAt,
      },
    });

    for (let s = 0; s < allScores[i].length; s++) {
      await prisma.gameSet.create({
        data: { gameId: game.id, setNumber: s + 1, homeScore: allScores[i][s][0], awayScore: allScores[i][s][1], completedAt: new Date() },
      });
    }
  }

  // Player stats for a few games
  const firstGame = await prisma.game.findFirst({ where: { eventId: event.id }, orderBy: { week: "asc" } });
  if (firstGame) {
    for (const teamId of [firstGame.homeTeamId!, firstGame.awayTeamId!]) {
      const teamMembers = await prisma.teamMember.findMany({ where: { teamId, deletedAt: null }, select: { userId: true } });
      for (const tm of teamMembers) {
        await prisma.gameStat.upsert({
          where: { gameId_userId: { gameId: firstGame.id, userId: tm.userId } },
          create: {
            gameId: firstGame.id, teamId, userId: tm.userId,
            kills: Math.floor(Math.random() * 15) + 5,
            aces: Math.floor(Math.random() * 5),
            digs: Math.floor(Math.random() * 20) + 5,
            blocks: Math.floor(Math.random() * 8),
            errors: Math.floor(Math.random() * 6),
          },
          update: {},
        });
      }
    }
  }

  await prisma.announcement.create({
    data: {
      organizationId: org.id,
      eventId: event.id,
      targetType: "EVENT",
      targetId: event.id,
      title: "Spring 2026 League — Final Standings",
      body: "The Spring 2026 League has wrapped up! Rocky Mountain High takes the championship with an undefeated record. Full standings are in the standings tab. Registration for the Summer League opens June 1st.",
      postedById: adminId,
    },
  });

  console.log("  ✓ Mountain West VB — completed 6-week season, full scores + stats");
}

// ─── Utilities ───────────────────────────────────────────────────────────────

async function upsertOrg(adminId: string, data: {
  name: string; slug: string; timezone: string; website?: string;
}) {
  const existing = await prisma.organization.findFirst({ where: { slug: data.slug } });
  if (existing) {
    await prisma.organizationMember.upsert({
      where: { userId_organizationId: { userId: adminId, organizationId: existing.id } },
      create: { userId: adminId, organizationId: existing.id, role: "ADMIN" },
      update: { role: "ADMIN" },
    });
    return existing;
  }
  const org = await prisma.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      joinCode: nanoid(),
      timezone: data.timezone,
      ...(data.website && { website: data.website }),
    },
  });
  await prisma.organizationMember.create({
    data: { userId: adminId, organizationId: org.id, role: "ADMIN" },
  });
  return org;
}

async function addMembers(orgId: string, users: Array<{ id: string; name: string }>) {
  const result: Array<{ userId: string; name: string }> = [];
  for (const u of users) {
    await prisma.organizationMember.upsert({
      where: { userId_organizationId: { userId: u.id, organizationId: orgId } },
      create: { userId: u.id, organizationId: orgId, role: "MEMBER" },
      update: {},
    });
    result.push({ userId: u.id, name: u.name });
  }
  return result;
}

async function createVenue(orgId: string, name: string, city: string, state: string) {
  return prisma.venue.create({ data: { organizationId: orgId, name, address: `${city}, ${state}` } });
}

async function createCourt(venueId: string, name: string) {
  return prisma.court.create({ data: { venueId, name } });
}

// ─── Run ─────────────────────────────────────────────────────────────────────

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
