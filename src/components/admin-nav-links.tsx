"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavLinksProps {
  orgSlug: string;
  isAdmin: boolean;
}

export function AdminNavLinks({ orgSlug, isAdmin }: AdminNavLinksProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    // Exact match for overview, prefix match for everything else
    if (href === `/${orgSlug}/admin`) return pathname === href;
    return pathname.startsWith(href);
  }

  const linkClass = (href: string) =>
    `rounded-md px-3 py-1.5 text-sm transition-colors ${
      isActive(href)
        ? "bg-primary/10 text-primary font-medium"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <>
      <Link href={`/${orgSlug}/admin`} className={linkClass(`/${orgSlug}/admin`)}>
        Overview
      </Link>
      <Link href={`/${orgSlug}/admin/events`} className={linkClass(`/${orgSlug}/admin/events`)}>
        Events
      </Link>
      <Link href={`/${orgSlug}/admin/venues`} className={linkClass(`/${orgSlug}/admin/venues`)}>
        Venues
      </Link>
      <Link href={`/${orgSlug}/admin/members`} className={linkClass(`/${orgSlug}/admin/members`)}>
        Members
      </Link>
      <Link
        href={`/${orgSlug}/admin/announcements`}
        className={linkClass(`/${orgSlug}/admin/announcements`)}
      >
        Announcements
      </Link>
      <Link href={`/${orgSlug}/admin/activity`} className={linkClass(`/${orgSlug}/admin/activity`)}>
        Activity
      </Link>
      <Link
        href={`/${orgSlug}/admin/leaderboard`}
        className={linkClass(`/${orgSlug}/admin/leaderboard`)}
      >
        Leaderboard
      </Link>
      {isAdmin && (
        <>
          <Link
            href={`/${orgSlug}/admin/analytics`}
            className={linkClass(`/${orgSlug}/admin/analytics`)}
          >
            Analytics
          </Link>
          <Link
            href={`/${orgSlug}/admin/billing`}
            className={linkClass(`/${orgSlug}/admin/billing`)}
          >
            Billing
          </Link>
          <Link
            href={`/${orgSlug}/admin/settings`}
            className={linkClass(`/${orgSlug}/admin/settings`)}
          >
            Settings
          </Link>
        </>
      )}
    </>
  );
}
