import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

/** GET — admins can list all responses, members get their own */
export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isAdmin = ctx.role === "ADMIN" || ctx.role === "SCORER";

  const responses = await prisma.customFieldResponse.findMany({
    where: {
      customField: { eventId, event: { organizationId: ctx.orgId } },
      ...(isAdmin ? {} : { userId: ctx.userId }),
    },
    include: {
      customField: { select: { id: true, label: true, type: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(responses);
}

/** POST — player submits their responses to custom fields */
export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    responses: Array<{ fieldId: string; value: string }>;
  };

  if (!Array.isArray(body.responses)) {
    return NextResponse.json({ error: "responses array is required" }, { status: 400 });
  }

  // Fetch all custom fields for this event
  const fields = await prisma.customField.findMany({
    where: { eventId, event: { organizationId: ctx.orgId } },
  });
  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  // Validate required fields are present
  for (const field of fields) {
    if (field.required) {
      const resp = body.responses.find((r) => r.fieldId === field.id);
      if (!resp || !resp.value.trim()) {
        return NextResponse.json(
          { error: `"${field.label}" is required` },
          { status: 400 },
        );
      }
    }
  }

  // Validate all submitted field IDs belong to this event
  for (const resp of body.responses) {
    if (!fieldMap.has(resp.fieldId)) {
      return NextResponse.json({ error: `Unknown field: ${resp.fieldId}` }, { status: 400 });
    }
  }

  // Upsert responses (delete existing then create)
  await prisma.$transaction(async (tx) => {
    await tx.customFieldResponse.deleteMany({
      where: {
        userId: ctx.userId,
        customFieldId: { in: fields.map((f) => f.id) },
      },
    });

    for (const resp of body.responses) {
      if (!resp.value.trim()) continue;
      await tx.customFieldResponse.create({
        data: {
          customFieldId: resp.fieldId,
          userId: ctx.userId,
          value: resp.value.trim(),
        },
      });
    }
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
