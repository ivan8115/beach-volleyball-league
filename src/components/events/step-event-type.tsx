"use client";

import type { EventType } from "@/generated/prisma/enums";

interface StepEventTypeProps {
  onSelect: (type: EventType) => void;
}

export function StepEventType({ onSelect }: StepEventTypeProps) {
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div>
        <h2 className="text-2xl font-bold text-center">What type of event?</h2>
        <p className="mt-1 text-center text-muted-foreground">Choose the format for your event</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 w-full max-w-2xl">
        <button
          type="button"
          onClick={() => onSelect("LEAGUE")}
          className="flex flex-col items-start gap-2 rounded-xl border-2 p-6 text-left transition-colors hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="text-3xl">🏐</div>
          <h3 className="text-lg font-semibold">League</h3>
          <p className="text-sm text-muted-foreground">
            Multi-week season with weekly scheduled games. Round-robin play within
            divisions, followed by a playoff bracket.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onSelect("TOURNAMENT")}
          className="flex flex-col items-start gap-2 rounded-xl border-2 p-6 text-left transition-colors hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="text-3xl">🏆</div>
          <h3 className="text-lg font-semibold">Tournament</h3>
          <p className="text-sm text-muted-foreground">
            1–2 day event with pool play and/or single or double elimination bracket.
            One payment per team.
          </p>
        </button>
      </div>
    </div>
  );
}
