/**
 * Promotes the next team from the waitlist when a registered spot opens up.
 * Call inside a transaction after a team is withdrawn/deleted.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { layout } from "@/lib/email-templates";

export async function promoteFromWaitlist(eventId: string, orgSlug: string): Promise<void> {
  // Find the next team on the waitlist (lowest position)
  const next = await prisma.waitlist.findFirst({
    where: { eventId },
    orderBy: { position: "asc" },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          members: {
            where: { role: "CAPTAIN", deletedAt: null },
            select: { user: { select: { email: true, name: true } } },
            take: 1,
          },
        },
      },
    },
  });

  if (!next) return; // No one waiting

  const [org, event] = await Promise.all([
    prisma.organization.findFirst({
      where: { events: { some: { id: eventId } } },
      select: { name: true },
    }),
    prisma.event.findUnique({ where: { id: eventId }, select: { name: true } }),
  ]);

  // Promote the team in a transaction
  await prisma.$transaction(async (tx) => {
    // Promote to registered
    await tx.team.update({
      where: { id: next.teamId },
      data: { registrationStatus: "REGISTERED" },
    });

    // Remove from waitlist
    await tx.waitlist.delete({ where: { id: next.id } });

    // Shift remaining positions down by 1
    await tx.waitlist.updateMany({
      where: { eventId, position: { gt: next.position } },
      data: { position: { decrement: 1 } },
    });
  });

  // Notify the captain
  const captain = next.team.members[0]?.user;
  if (captain && org && event) {
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const eventUrl = `${APP_URL}/${orgSlug}/events/${eventId}`;

    const html = layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090b;">You're off the waitlist!</h1>
      <p style="margin:12px 0;font-size:14px;color:#3f3f46;line-height:1.6;">
        Hi ${captain.name}, a spot has opened up and <strong>${next.team.name}</strong> has been promoted from the waitlist for <strong>${event.name}</strong>.
      </p>
      <p style="margin:12px 0;font-size:14px;color:#3f3f46;line-height:1.6;">
        Your registration is now confirmed.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#71717a;white-space:nowrap;padding-right:16px;">Organization</td>
          <td style="padding:6px 0;font-size:13px;color:#09090b;font-weight:500;">${org.name}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#71717a;white-space:nowrap;padding-right:16px;">Event</td>
          <td style="padding:6px 0;font-size:13px;color:#09090b;font-weight:500;">${event.name}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#71717a;white-space:nowrap;padding-right:16px;">Team</td>
          <td style="padding:6px 0;font-size:13px;color:#09090b;font-weight:500;">${next.team.name}</td>
        </tr>
      </table>
      <a href="${eventUrl}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">View event</a>
    `);

    await sendEmail({
      to: captain.email,
      subject: `You're in! ${next.team.name} promoted from waitlist for ${event.name}`,
      html,
      text: `Hi ${captain.name},\n\nA spot opened up and ${next.team.name} has been promoted from the waitlist for ${event.name} (${org.name}).\n\nYour registration is now confirmed.\n\nView event: ${eventUrl}`,
    });
  }
}
