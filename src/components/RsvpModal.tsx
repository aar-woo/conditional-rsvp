"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ConditionBuilder,
  type Condition,
} from "@/components/ConditionBuilder";
import { Check, X, GitBranch, ChevronDown } from "lucide-react";
import type { Rsvp, ConditionVisibility } from "@/types";

interface RsvpModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  currentRsvp?: Rsvp | null;
  onSuccess: () => void;
}

type RsvpOption = "yes" | "no" | "conditional";

const OPTIONS: {
  value: RsvpOption;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "yes",
    label: "I'm in",
    icon: <Check className="h-4 w-4 text-green-600" />,
    description: "Confirmed going",
  },
  {
    value: "no",
    label: "Can't make it",
    icon: <X className="h-4 w-4 text-red-500" />,
    description: "Not attending",
  },
  {
    value: "conditional",
    label: "Conditional",
    icon: <GitBranch className="h-4 w-4 text-blue-500" />,
    description: "I'll go if…",
  },
];

export function RsvpModal({
  open,
  onClose,
  eventId,
  currentRsvp,
  onSuccess,
}: RsvpModalProps) {
  const initialResponse = currentRsvp?.response;
  const [selected, setSelected] = useState<RsvpOption>(
    initialResponse === "yes" ||
      initialResponse === "no" ||
      initialResponse === "conditional"
      ? initialResponse
      : "yes",
  );
  const [conditions, setConditions] = useState<Condition[]>(
    currentRsvp?.rsvp_conditions?.map((c) => ({
      condition_type: c.condition_type,
      threshold: c.threshold ?? undefined,
      target_user_id: c.target_user_id ?? undefined,
      target_username: c.profiles?.username ?? undefined,
    })) ?? []
  );
  const [conditionVisibility, setConditionVisibility] =
    useState<ConditionVisibility>(
      currentRsvp?.condition_visibility ?? "private",
    );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasChanges = useMemo(() => {
    if (!currentRsvp) return true;
    if (selected !== currentRsvp.response) return true;
    if (selected === "conditional") {
      if (conditionVisibility !== currentRsvp.condition_visibility) return true;
      const saved = (currentRsvp.rsvp_conditions ?? []).map(
        (c) => `${c.condition_type}:${c.threshold ?? ""}:${c.target_user_id ?? ""}`,
      ).sort();
      const current = conditions.map(
        (c) => `${c.condition_type}:${c.threshold ?? ""}:${c.target_user_id ?? ""}`,
      ).sort();
      if (saved.length !== current.length) return true;
      return current.some((c, i) => c !== saved[i]);
    }
    return false;
  }, [selected, conditions, conditionVisibility, currentRsvp]);

  // Use rAF so the check runs after the browser has finished layout
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    });
    return () => cancelAnimationFrame(raf);
  }, [selected, conditions]);

  async function handleSubmit() {
    if (selected === "conditional" && conditions.length === 0) {
      setError("Add at least one condition.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        response: selected,
        conditions,
        condition_visibility: conditionVisibility,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save RSVP");
      setLoading(false);
      return;
    }
    setLoading(false);
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Your RSVP</DialogTitle>
          <DialogDescription>
            Choose how you want to respond to this event.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={() => {
              const el = scrollRef.current;
              if (!el) return;
              setCanScrollDown(
                el.scrollHeight - el.scrollTop - el.clientHeight > 4,
              );
            }}
            className="overflow-y-auto max-h-[55vh] space-y-4"
          >
            <div className="space-y-2">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelected(opt.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selected === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {opt.icon}
                  <div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {opt.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selected === "conditional" && (
              <div className="border-t pt-4 space-y-4">
                <ConditionBuilder
                  conditions={conditions}
                  onChange={setConditions}
                />
                <div>
                  <p className="text-sm font-medium mb-2">
                    Who can see your conditions?
                  </p>
                  <div className="space-y-1.5">
                    {(
                      [
                        { value: "private", label: "Just me" },
                        { value: "host", label: "Host only" },
                        { value: "group", label: "Everyone" },
                      ] as { value: ConditionVisibility; label: string }[]
                    ).map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="conditionVisibility"
                          value={opt.value}
                          checked={conditionVisibility === opt.value}
                          onChange={() => setConditionVisibility(opt.value)}
                          className="accent-primary"
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {canScrollDown && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-1 pt-8 bg-gradient-to-t from-background to-transparent">
              <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !hasChanges} className="flex-1">
            {loading ? "Saving…" : "Save RSVP"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
