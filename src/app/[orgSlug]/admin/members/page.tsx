"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Member {
  id: string;
  role: "ADMIN" | "SCORER" | "MEMBER";
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    skillLevel: string;
  };
}

export default function AdminMembersPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/org/${orgSlug}/members`)
      .then((r) => r.json())
      .then((data: Member[]) => {
        setMembers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load members.");
        setLoading(false);
      });
  }, [orgSlug]);

  async function handleRoleChange(memberId: string, newRole: "ADMIN" | "SCORER" | "MEMBER") {
    const res = await fetch(`/api/org/${orgSlug}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the organization?")) return;

    const res = await fetch(`/api/org/${orgSlug}/members/${memberId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading members…</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-sm text-muted-foreground">{members.length} total</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Skill</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const initials = member.user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.avatarUrl ?? undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {member.user.skillLevel.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        handleRoleChange(member.id, v as "ADMIN" | "SCORER" | "MEMBER")
                      }
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SCORER">Scorer</SelectItem>
                        <SelectItem value="MEMBER">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 text-xs"
                      onClick={() => handleRemove(member.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
