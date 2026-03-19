import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Prisma mock ───────────────────────────────────────────────────────────────
const { mockPrisma } = vi.hoisted(() => {
  const mockTx = {
    team: { update: vi.fn() },
    waitlist: {
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const mockPrisma = {
    waitlist: { findFirst: vi.fn() },
    organization: { findFirst: vi.fn() },
    event: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
    _mockTx: mockTx,
  };
  return { mockPrisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

// ── Email mock ────────────────────────────────────────────────────────────────
const { mockSendEmail } = vi.hoisted(() => {
  return { mockSendEmail: vi.fn() };
});

vi.mock("@/lib/email", () => ({ sendEmail: mockSendEmail }));

// email-templates uses layout() but we only need it not to crash
vi.mock("@/lib/email-templates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email-templates")>();
  return actual;
});

import { promoteFromWaitlist } from "@/lib/waitlist";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: org + event found
  mockPrisma.organization.findFirst.mockResolvedValue({ name: "Beach Org" });
  mockPrisma.event.findUnique.mockResolvedValue({ name: "Summer League" });
});

// ── Helper factories ──────────────────────────────────────────────────────────

function makeWaitlistEntry(overrides: {
  id?: string;
  teamId?: string;
  position?: number;
  teamName?: string;
  captainEmail?: string | null;
  captainName?: string | null;
} = {}) {
  const {
    id = "wl-1",
    teamId = "team-1",
    position = 1,
    teamName = "Sand Spikers",
    captainEmail = "captain@example.com",
    captainName = "Alex Smith",
  } = overrides;

  return {
    id,
    teamId,
    position,
    eventId: "event-1",
    team: {
      id: teamId,
      name: teamName,
      members:
        captainEmail && captainName
          ? [{ user: { email: captainEmail, name: captainName } }]
          : [],
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("promoteFromWaitlist", () => {
  describe("early exit conditions", () => {
    it("returns early without any DB writes when no teams are on the waitlist", async () => {
      mockPrisma.waitlist.findFirst.mockResolvedValue(null);

      await promoteFromWaitlist("event-1", "beach-org");

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("waitlist promotion", () => {
    it("queries waitlist ordered by position ascending to pick the lowest-position team", async () => {
      mockPrisma.waitlist.findFirst.mockResolvedValue(makeWaitlistEntry({ position: 1 }));

      await promoteFromWaitlist("event-1", "beach-org");

      expect(mockPrisma.waitlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: "event-1" },
          orderBy: { position: "asc" },
        })
      );
    });

    it("updates promoted team registrationStatus to REGISTERED inside a transaction", async () => {
      const entry = makeWaitlistEntry({ teamId: "team-1", position: 1 });
      mockPrisma.waitlist.findFirst.mockResolvedValue(entry);

      await promoteFromWaitlist("event-1", "beach-org");

      const tx = mockPrisma._mockTx;
      expect(tx.team.update).toHaveBeenCalledWith({
        where: { id: "team-1" },
        data: { registrationStatus: "REGISTERED" },
      });
    });

    it("deletes the promoted team's waitlist entry inside a transaction", async () => {
      const entry = makeWaitlistEntry({ id: "wl-1", position: 1 });
      mockPrisma.waitlist.findFirst.mockResolvedValue(entry);

      await promoteFromWaitlist("event-1", "beach-org");

      const tx = mockPrisma._mockTx;
      expect(tx.waitlist.delete).toHaveBeenCalledWith({ where: { id: "wl-1" } });
    });

    it("decrements positions of all remaining waitlisted teams after the promoted position", async () => {
      const entry = makeWaitlistEntry({ position: 1 });
      mockPrisma.waitlist.findFirst.mockResolvedValue(entry);

      await promoteFromWaitlist("event-1", "beach-org");

      const tx = mockPrisma._mockTx;
      expect(tx.waitlist.updateMany).toHaveBeenCalledWith({
        where: { eventId: "event-1", position: { gt: 1 } },
        data: { position: { decrement: 1 } },
      });
    });

    it("promotes lowest-position team when multiple teams are on the waitlist (position 1 before 2)", async () => {
      // promoteFromWaitlist always picks findFirst with orderBy asc —
      // simulate being given position 1 (the lowest)
      const firstEntry = makeWaitlistEntry({ teamId: "team-first", position: 1 });
      mockPrisma.waitlist.findFirst.mockResolvedValue(firstEntry);

      await promoteFromWaitlist("event-1", "beach-org");

      const tx = mockPrisma._mockTx;
      expect(tx.team.update).toHaveBeenCalledWith({
        where: { id: "team-first" },
        data: { registrationStatus: "REGISTERED" },
      });
    });
  });

  describe("captain notification", () => {
    it("sends email to captain when captain exists on promoted team", async () => {
      mockPrisma.waitlist.findFirst.mockResolvedValue(
        makeWaitlistEntry({
          captainEmail: "captain@example.com",
          captainName: "Alex Smith",
          teamName: "Sand Spikers",
        })
      );

      await promoteFromWaitlist("event-1", "beach-org");

      expect(mockSendEmail).toHaveBeenCalledOnce();
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "captain@example.com" })
      );
    });

    it("email subject mentions team name and event name", async () => {
      mockPrisma.waitlist.findFirst.mockResolvedValue(
        makeWaitlistEntry({ teamName: "Sand Spikers" })
      );
      mockPrisma.event.findUnique.mockResolvedValue({ name: "Summer League" });

      await promoteFromWaitlist("event-1", "beach-org");

      const callArg = mockSendEmail.mock.calls[0][0] as { subject: string };
      expect(callArg.subject).toContain("Sand Spikers");
      expect(callArg.subject).toContain("Summer League");
    });

    it("does NOT send email when the team has no captain (members array is empty)", async () => {
      mockPrisma.waitlist.findFirst.mockResolvedValue(
        makeWaitlistEntry({ captainEmail: null, captainName: null })
      );

      await promoteFromWaitlist("event-1", "beach-org");

      // Transaction should still run (team promoted) but no email
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("does NOT send email when org cannot be found", async () => {
      mockPrisma.waitlist.findFirst.mockResolvedValue(makeWaitlistEntry());
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await promoteFromWaitlist("event-1", "beach-org");

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("does NOT send email when event cannot be found", async () => {
      mockPrisma.waitlist.findFirst.mockResolvedValue(makeWaitlistEntry());
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await promoteFromWaitlist("event-1", "beach-org");

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("email html contains the captain's name", async () => {
      mockPrisma.waitlist.findFirst.mockResolvedValue(
        makeWaitlistEntry({ captainName: "Jordan Rivera" })
      );

      await promoteFromWaitlist("event-1", "beach-org");

      const callArg = mockSendEmail.mock.calls[0][0] as { html: string };
      expect(callArg.html).toContain("Jordan Rivera");
    });
  });

  describe("event URL construction", () => {
    it("uses NEXT_PUBLIC_APP_URL env var when constructing the event link in email", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://app.beachvb.example";
      mockPrisma.waitlist.findFirst.mockResolvedValue(makeWaitlistEntry());

      await promoteFromWaitlist("event-1", "beach-org");

      const callArg = mockSendEmail.mock.calls[0][0] as { html: string; text: string };
      expect(callArg.html).toContain("https://app.beachvb.example/beach-org/events/event-1");
      expect(callArg.text).toContain("https://app.beachvb.example/beach-org/events/event-1");

      delete process.env.NEXT_PUBLIC_APP_URL;
    });
  });
});
