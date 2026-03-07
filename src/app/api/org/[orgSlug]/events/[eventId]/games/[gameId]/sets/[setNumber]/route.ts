import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    orgSlug: string;
    eventId: string;
    gameId: string;
    setNumber: string;
  }>;
}

export async function PUT(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId, gameId, setNumber: setNumberStr } = await params;
  const ctx = await getOrgContext(orgSlug, "SCORER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const setNumber = parseInt(setNumberStr);
  if (isNaN(setNumber) || setNumber < 1) {
    return NextResponse.json({ error: "Invalid setNumber" }, { status: 400 });
  }

  const game = await prisma.game.findFirst({
    where: { id: gameId, eventId, event: { organizationId: ctx.orgId }, deletedAt: null },
    include: { sets: true, event: true },
  });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  if (game.isBye) {
    return NextResponse.json({ error: "Cannot enter scores for bye games" }, { status: 400 });
  }

  const body = (await req.json()) as {
    homeScore: number;
    awayScore: number;
  };

  if (typeof body.homeScore !== "number" || typeof body.awayScore !== "number") {
    return NextResponse.json({ error: "homeScore and awayScore are required numbers" }, { status: 400 });
  }
  if (body.homeScore < 0 || body.awayScore < 0) {
    return NextResponse.json({ error: "Scores cannot be negative" }, { status: 400 });
  }
  if (body.homeScore === body.awayScore) {
    return NextResponse.json({ error: "Ties are not allowed in volleyball" }, { status: 400 });
  }

  // Determine maxSets from event config
  const event = game.event;
  const maxSets =
    event.type === "LEAGUE"
      ? (event.leagueMaxSets ?? 3)
      : (event.tournamentMaxSets ?? 3);

  if (setNumber > maxSets) {
    return NextResponse.json(
      { error: `Set number exceeds maxSets (${maxSets})` },
      { status: 400 },
    );
  }

  const existingSet = game.sets.find((s) => s.setNumber === setNumber);

  await prisma.$transaction(async (tx) => {
    if (existingSet) {
      // Create history record before updating
      await tx.gameScoreHistory.create({
        data: {
          gameSetId: existingSet.id,
          previousHomeScore: existingSet.homeScore,
          previousAwayScore: existingSet.awayScore,
          newHomeScore: body.homeScore,
          newAwayScore: body.awayScore,
          changedById: ctx.userId,
        },
      });

      await tx.gameSet.update({
        where: { id: existingSet.id },
        data: {
          homeScore: body.homeScore,
          awayScore: body.awayScore,
          completedAt: new Date(),
        },
      });
    } else {
      await tx.gameSet.create({
        data: {
          gameId,
          setNumber,
          homeScore: body.homeScore,
          awayScore: body.awayScore,
          completedAt: new Date(),
        },
      });
    }

    // Re-fetch all sets for this game (after upsert) to check completion
    const allSets = await tx.gameSet.findMany({
      where: { gameId },
      orderBy: { setNumber: "asc" },
    });

    let homeSetWins = 0;
    let awaySetWins = 0;
    for (const s of allSets) {
      if (s.setNumber === setNumber) {
        // Use the newly entered scores
        if (body.homeScore > body.awayScore) homeSetWins++;
        else awaySetWins++;
      } else {
        if (s.homeScore > s.awayScore) homeSetWins++;
        else awaySetWins++;
      }
    }

    const setsToWin = Math.ceil(maxSets / 2);
    if (homeSetWins >= setsToWin || awaySetWins >= setsToWin) {
      await tx.game.update({
        where: { id: gameId },
        data: { status: "COMPLETED" },
      });
    } else if (game.status === "SCHEDULED") {
      await tx.game.update({
        where: { id: gameId },
        data: { status: "IN_PROGRESS" },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
