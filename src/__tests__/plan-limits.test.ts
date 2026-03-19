import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mockPrisma is available when vi.mock factory runs (hoisted to top)
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    subscription: { findUnique: vi.fn() },
    event: { count: vi.fn() },
    organizationMember: { count: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { checkEventLimit, checkAdminLimit } from "@/lib/plan-limits";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkEventLimit", () => {
  it("returns null (allowed) when under the event limit", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: { maxEvents: 5, maxAdmins: 2 },
    });
    mockPrisma.event.count.mockResolvedValue(3);

    const result = await checkEventLimit("org-1");
    expect(result).toBeNull();
  });

  it("returns an error string when at the event limit", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: { maxEvents: 2, maxAdmins: 1 },
    });
    mockPrisma.event.count.mockResolvedValue(2);

    const result = await checkEventLimit("org-1");
    expect(result).toContain("2 event");
    expect(result).toContain("Upgrade");
  });

  it("returns an error string when over the event limit", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: { maxEvents: 2, maxAdmins: 1 },
    });
    mockPrisma.event.count.mockResolvedValue(5);

    const result = await checkEventLimit("org-1");
    expect(result).not.toBeNull();
  });

  it("returns null for unlimited plan (maxEvents = -1)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: { maxEvents: -1, maxAdmins: -1 },
    });
    mockPrisma.event.count.mockResolvedValue(9999);

    const result = await checkEventLimit("org-1");
    expect(result).toBeNull();
    // Should not query event count when unlimited
    expect(mockPrisma.event.count).not.toHaveBeenCalled();
  });

  it("defaults to Free tier (maxEvents = 2) when no subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.event.count.mockResolvedValue(2);

    const result = await checkEventLimit("org-1");
    expect(result).toContain("2 event");
  });

  it("allows first event when no subscription (count = 0)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.event.count.mockResolvedValue(0);

    const result = await checkEventLimit("org-1");
    expect(result).toBeNull();
  });

  it("includes singular 'event' in message for limit of 1", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: { maxEvents: 1, maxAdmins: 1 },
    });
    mockPrisma.event.count.mockResolvedValue(1);

    const result = await checkEventLimit("org-1");
    expect(result).toContain("1 event");
    expect(result).not.toContain("1 events");
  });
});

describe("checkAdminLimit", () => {
  it("returns null (allowed) when under the admin limit", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: { maxEvents: 5, maxAdmins: 3 },
    });
    mockPrisma.organizationMember.count.mockResolvedValue(2);

    const result = await checkAdminLimit("org-1");
    expect(result).toBeNull();
  });

  it("returns an error string when at the admin limit", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: { maxEvents: 2, maxAdmins: 1 },
    });
    mockPrisma.organizationMember.count.mockResolvedValue(1);

    const result = await checkAdminLimit("org-1");
    expect(result).toContain("1 admin");
    expect(result).toContain("Upgrade");
  });

  it("returns null for unlimited plan (maxAdmins = -1)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      plan: { maxEvents: -1, maxAdmins: -1 },
    });
    mockPrisma.organizationMember.count.mockResolvedValue(9999);

    const result = await checkAdminLimit("org-1");
    expect(result).toBeNull();
    expect(mockPrisma.organizationMember.count).not.toHaveBeenCalled();
  });

  it("defaults to Free tier (maxAdmins = 1) when no subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.organizationMember.count.mockResolvedValue(1);

    const result = await checkAdminLimit("org-1");
    expect(result).toContain("1 admin");
  });

  it("allows first admin when no subscription (count = 0)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.organizationMember.count.mockResolvedValue(0);

    const result = await checkAdminLimit("org-1");
    expect(result).toBeNull();
  });
});
