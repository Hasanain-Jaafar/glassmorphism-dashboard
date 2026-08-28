"use client";

import { CalendarRange, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { periodOptions, type Period } from "@/lib/sales-analytics";
import type { Salesperson } from "@/lib/mock-data";

export function AnalyticsFilterBar({
  people,
  personId,
  onPersonChange,
  period,
  onPeriodChange,
}: {
  people: Salesperson[];
  personId: string;
  onPersonChange: (value: string) => void;
  period: Period;
  onPeriodChange: (value: Period) => void;
}) {
  const personLabel =
    personId === "all"
      ? "All Salespeople"
      : (people.find((p) => p.id === personId)?.name ?? "All Salespeople");

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Select
        value={personId}
        onValueChange={(next) => next && onPersonChange(next)}
      >
        <SelectTrigger className="glass-panel h-9 gap-2 rounded-xl px-3">
          <User className="size-[15px] text-text-tertiary" />
          <SelectValue>{() => personLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all">All Salespeople</SelectItem>
          {people.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              {person.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={period}
        onValueChange={(next) => next && onPeriodChange(next as Period)}
      >
        <SelectTrigger className="glass-panel h-9 gap-2 rounded-xl px-3">
          <CalendarRange className="size-[15px] text-text-tertiary" />
          <SelectValue>
            {(value: string) =>
              periodOptions.find((option) => option.value === value)?.label ??
              value
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
