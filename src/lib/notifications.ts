/**
 * Fire-and-forget email notification helpers.
 * All functions are async and should be called with `void`.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail, sendEmailBatch } from "@/lib/email";
import {
  registrationConfirmationEmail,
  freeAgentConfirmationEmail,
  welcomeToTeamEmail,
  announcementEmail,
  schedulePublishedEmail,
  bracketPublishedEmail,
} from "@/lib/email-templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Registration ──────────────────────────────────────────────────────────────

export async function notifyRegistrationConfirmed(opts: {
  userId: string;
  orgId: string;
  orgSlug: string;
  eventId: string;
  teamId: string;
  teamName: string;
  role: "CAPTAIN" | "PLAYER";
}) {
  const [user, org, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: opts.userId }, select: { email: true, name: true } }),
    prisma.organization.findUnique({ where: { id: opts.orgId }, select: { name: true } }),
    prisma.event.findUnique({ where: { id: opts.eventId }, select: { name: true } }),
  ]);
  if (!user || !org || !event) return;

  const { subject, html, text } = registrationConfirmationEmail({
    playerName: user.name,
    orgName: org.name,
    eventName: event.name,
    teamName: opts.teamName,
    role: opts.role,
    eventUrl: `${APP_URL}/${opts.orgSlug}/events/${opts.eventId}`,
  });

  await sendEmail({ to: user.email, subject, html, text });
}

export async function notifyFreeAgentConfirmed(opts: {
  userId: string;
  orgId: string;
  orgSlug: string;
  eventId: string;
}) {
  const [user, org, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: opts.userId }, select: { email: true, name: true } }),
    prisma.organization.findUnique({ where: { id: opts.orgId }, select: { name: true } }),
    prisma.event.findUnique({ where: { id: opts.eventId }, select: { name: true } }),
  ]);
  if (!user || !org || !event) return;

  const { subject, html, text } = freeAgentConfirmationEmail({
    playerName: user.name,
    orgName: org.name,
    eventName: event.name,
    eventUrl: `${APP_URL}/${opts.orgSlug}/events/${opts.eventId}`,
  });

  await sendEmail({ to: user.email, subject, html, text });
}

export async function notifyWelcomeToTeam(opts: {
  addedUserId: string;
  addedByUserId: string;
  orgId: string;
  orgSlug: string;
  eventId: string;
  teamId: string;
  teamName: string;
}) {
  const [addedUser, addedByUser, org, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: opts.addedUserId }, select: { email: true, name: true } }),
    prisma.user.findUnique({ where: { id: opts.addedByUserId }, select: { name: true } }),
    prisma.organization.findUnique({ where: { id: opts.orgId }, select: { name: true } }),
    prisma.event.findUnique({ where: { id: opts.eventId }, select: { name: true } }),
  ]);
  if (!addedUser || !addedByUser || !org || !event) return;

  const { subject, html, text } = welcomeToTeamEmail({
    playerName: addedUser.name,
    orgName: org.name,
    eventName: event.name,
    teamName: opts.teamName,
    addedByName: addedByUser.name,
    teamUrl: `${APP_URL}/${opts.orgSlug}/events/${opts.eventId}/team/${opts.teamId}`,
  });

  await sendEmail({ to: addedUser.email, subject, html, text });
}

// ─── Announcements ─────────────────────────────────────────────────────────────

export async function notifyAnnouncementPosted(opts: {
  orgId: string;
  orgSlug: string;
  eventId?: string | null;
  title: string;
  body: string;
  targetType: string;
}) {
  const [org, event] = await Promise.all([
    prisma.organization.findUnique({ where: { id: opts.orgId }, select: { name: true } }),
    opts.eventId
      ? prisma.event.findUnique({ where: { id: opts.eventId }, select: { name: true } })
      : Promise.resolve(null),
  ]);
  if (!org) return;

  // Gather recipient emails
  let recipients: { email: string; name: string }[] = [];

  if (opts.eventId) {
    // Event announcement: email all registered team members + free agents
    const [teamMembers, freeAgents] = await Promise.all([
      prisma.teamMember.findMany({
        where: {
          team: { eventId: opts.eventId, deletedAt: null, registrationStatus: "REGISTERED" },
          deletedAt: null,
        },
        select: { user: { select: { email: true, name: true } } },
        distinct: ["userId"],
      }),
      prisma.freeAgent.findMany({
        where: { eventId: opts.eventId },
        select: { user: { select: { email: true, name: true } } },
      }),
    ]);
    const seen = new Set<string>();
    for (const tm of teamMembers) {
      if (!seen.has(tm.user.email)) { seen.add(tm.user.email); recipients.push(tm.user); }
    }
    for (const fa of freeAgents) {
      if (!seen.has(fa.user.email)) { seen.add(fa.user.email); recipients.push(fa.user); }
    }
  } else {
    // Org-wide announcement: email all org members
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: opts.orgId },
      select: { user: { select: { email: true, name: true } } },
    });
    const seen = new Set<string>();
    for (const m of members) {
      if (!seen.has(m.user.email)) { seen.add(m.user.email); recipients.push(m.user); }
    }
  }

  if (recipients.length === 0) return;

  const eventUrl = opts.eventId ? `${APP_URL}/${opts.orgSlug}/events/${opts.eventId}` : undefined;
  const orgUrl = `${APP_URL}/${opts.orgSlug}/dashboard`;

  await sendEmailBatch(
    recipients.map((r) => {
      const { subject, html, text } = announcementEmail({
        playerName: r.name,
        orgName: org.name,
        eventName: event?.name,
        title: opts.title,
        body: opts.body,
        eventUrl,
        orgUrl,
      });
      return { to: r.email, subject, html, text };
    })
  );
}

// ─── Schedule & bracket published ─────────────────────────────────────────────

export async function notifySchedulePublished(opts: {
  orgId: string;
  orgSlug: string;
  eventId: string;
  gameCount: number;
}) {
  const [org, event] = await Promise.all([
    prisma.organization.findUnique({ where: { id: opts.orgId }, select: { name: true } }),
    prisma.event.findUnique({ where: { id: opts.eventId }, select: { name: true } }),
  ]);
  if (!org || !event) return;

  // Fetch all registered team members grouped by team
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      team: { eventId: opts.eventId, deletedAt: null, registrationStatus: "REGISTERED" },
      deletedAt: null,
    },
    select: {
      user: { select: { email: true, name: true } },
      team: { select: { name: true } },
    },
    distinct: ["userId"],
  });

  if (teamMembers.length === 0) return;

  const scheduleUrl = `${APP_URL}/${opts.orgSlug}/events/${opts.eventId}/schedule`;

  await sendEmailBatch(
    teamMembers.map((tm) => {
      const { subject, html, text } = schedulePublishedEmail({
        playerName: tm.user.name,
        orgName: org.name,
        eventName: event.name,
        teamName: tm.team.name,
        gameCount: opts.gameCount,
        scheduleUrl,
      });
      return { to: tm.user.email, subject, html, text };
    })
  );
}

export async function notifyBracketPublished(opts: {
  orgId: string;
  orgSlug: string;
  eventId: string;
}) {
  const [org, event] = await Promise.all([
    prisma.organization.findUnique({ where: { id: opts.orgId }, select: { name: true } }),
    prisma.event.findUnique({ where: { id: opts.eventId }, select: { name: true } }),
  ]);
  if (!org || !event) return;

  const teamMembers = await prisma.teamMember.findMany({
    where: {
      team: { eventId: opts.eventId, deletedAt: null, registrationStatus: "REGISTERED" },
      deletedAt: null,
    },
    select: {
      user: { select: { email: true, name: true } },
      team: { select: { name: true } },
    },
    distinct: ["userId"],
  });

  if (teamMembers.length === 0) return;

  const scheduleUrl = `${APP_URL}/${opts.orgSlug}/events/${opts.eventId}/schedule`;

  await sendEmailBatch(
    teamMembers.map((tm) => {
      const { subject, html, text } = bracketPublishedEmail({
        playerName: tm.user.name,
        orgName: org.name,
        eventName: event.name,
        teamName: tm.team.name,
        scheduleUrl,
      });
      return { to: tm.user.email, subject, html, text };
    })
  );
}
