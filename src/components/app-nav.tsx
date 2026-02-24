"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppNavProps {
  userName: string;
  avatarUrl?: string | null;
}

export function AppNav({ userName, avatarUrl }: AppNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-semibold">
          Beach VB League
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={`text-sm ${pathname === "/dashboard" ? "font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Dashboard
          </Link>
          <Link
            href="/profile"
            className={`text-sm ${pathname === "/profile" ? "font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Profile
          </Link>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl ?? undefined} alt={userName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
