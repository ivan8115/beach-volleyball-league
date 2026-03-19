import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

function csvEscape(value: string): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(fields: string[]): string {
  return fields.map(csvEscape).join(",");
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const type = url.searchParams.get("type") ?? "roster";

  // ICS is member-accessible; CSV requires admin
  const minRole = format === "ics" ? "MEMBER" : "ADMIN";
  const ctx = await getOrgContext(orgSlug, minRole as "MEMBER" | "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify event belongs to this org
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ─── ICS Export ────────────────────────────────────────────────────────────
  if (format === "ics") {
    const games = await prisma.game.findMany({
      where: {
        eventId,
        deletedAt: null,
        isBye: false,
        status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] },
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        court: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Beach Volleyball League//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const game of games) {
      const start = new Date(game.scheduledAt);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
      const homeName = game.homeTeam?.name ?? "TBD";
      const awayName = game.awayTeam?.name ?? "TBD";
      const summary = icsEscape(`${homeName} vs ${awayName}`);
      const location = game.court ? icsEscape(`Court: ${game.court.name}`) : "";
      const description = game.court
        ? icsEscape(`${event.name} — Court: ${game.court.name}`)
        : icsEscape(event.name);

      lines.push(
        "BEGIN:VEVENT",
        `DTSTART:${formatIcsDate(start)}`,
        `DTEND:${formatIcsDate(end)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        ...(location ? [`LOCATION:${location}`] : []),
        `UID:game-${game.id}@beachvb`,
        "END:VEVENT"
      );
    }

    lines.push("END:VCALENDAR");

    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="schedule-${eventId}.ics"`,
      },
    });
  }

  // ─── CSV: Roster ───────────────────────────────────────────────────────────
  if (format === "csv" && type === "roster") {
    const teams = await prisma.team.findMany({
      where: { eventId, registrationStatus: "REGISTERED", deletedAt: null },
      include: {
        members: {
          where: { deletedAt: null },
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const rows = [csvRow(["Team", "Player Name", "Email", "Role", "Registration Status"])];
    for (const team of teams) {
      for (const member of team.members) {
        rows.push(
          csvRow([
            team.name,
            member.user.name,
            member.user.email,
            member.role,
            member.registrationStatus,
          ])
        );
      }
    }

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="roster-${eventId}.csv"`,
      },
    });
  }

  // ─── CSV: Standings ────────────────────────────────────────────────────────
  if (format === "csv" && type === "standings") {
    const teams = await prisma.team.findMany({
      where: { eventId, registrationStatus: "REGISTERED", deletedAt: null },
      select: { id: true, name: true },
    });

    const games = await prisma.game.findMany({
      where: {
        eventId,
        status: { in: ["COMPLETED", "FORFEITED"] },
        isBye: false,
        deletedAt: null,
      },
      include: { sets: true },
    });

    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

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
    }

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

    const result = Array.from(standings.values())
      .map((e) => ({
        ...e,
        setRatio: e.setsPlayed > 0 ? e.setsWon / e.setsPlayed : 0,
        pointRatio: e.pointsPlayed > 0 ? e.pointsScored / e.pointsPlayed : 0,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.setRatio !== a.setRatio) return b.setRatio - a.setRatio;
        return b.pointRatio - a.pointRatio;
      });

    const rows = [
      csvRow(["Rank", "Team", "Wins", "Losses", "Sets Won", "Sets Lost", "Set %", "Points Won", "Points Lost", "Points %"]),
    ];
    result.forEach((e, i) => {
      rows.push(
        csvRow([
          String(i + 1),
          e.teamName,
          String(e.wins),
          String(e.losses),
          String(e.setsWon),
          String(e.setsLost),
          (e.setRatio * 100).toFixed(1),
          String(e.pointsScored),
          String(e.pointsAgainst),
          (e.pointRatio * 100).toFixed(1),
        ])
      );
    });

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="standings-${eventId}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format or type" }, { status: 400 });
}
