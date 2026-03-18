import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/api/get-org-context";
import { prisma } from "@/lib/prisma";
import type { CustomFieldType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

interface RouteParams {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "MEMBER");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fields = await prisma.customField.findMany({
    where: { eventId, event: { organizationId: ctx.orgId } },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(fields);
}

export async function POST(req: Request, { params }: RouteParams) {
  const { orgSlug, eventId } = await params;
  const ctx = await getOrgContext(orgSlug, "ADMIN");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: ctx.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = (await req.json()) as {
    label: string;
    type: CustomFieldType;
    options?: string[];
    required: boolean;
  };

  if (!body.label?.trim()) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const validTypes: CustomFieldType[] = ["TEXT", "NUMBER", "SELECT", "BOOLEAN"];
  if (!validTypes.includes(body.type)) {
    return NextResponse.json({ error: "Invalid field type" }, { status: 400 });
  }

  if (body.type === "SELECT" && (!body.options || body.options.length === 0)) {
    return NextResponse.json({ error: "SELECT fields require at least one option" }, { status: 400 });
  }

  const field = await prisma.customField.create({
    data: {
      eventId,
      label: body.label.trim(),
      type: body.type,
      options: body.type === "SELECT" ? (body.options as Prisma.InputJsonValue) : undefined,
      required: body.required ?? false,
    },
  });

  return NextResponse.json(field, { status: 201 });
}
