"use client";

import { useState } from "react";
import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const options = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "Current Year" },
  { value: "custom", label: "Custom Range" },
];

export function FilterBar() {
  const [value, setValue] = useState("year");

  return (
    <Select
      value={value}
      onValueChange={(next) => next && setValue(next)}
    >
      <SelectTrigger className="glass-panel h-9 gap-2 rounded-xl px-3">
        <CalendarRange className="size-[15px] text-text-tertiary" />
        <SelectValue>
          {(value: string) =>
            options.find((option) => option.value === value)?.label ?? value
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
