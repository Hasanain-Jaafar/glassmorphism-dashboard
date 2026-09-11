"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** Parses a "yyyy-MM-dd" value as a local date, not UTC. */
function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/** "yyyy-MM-dd", matching the <input type="date"> value this replaces. */
function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function DatePicker({
  id,
  value,
  onChange,
  min,
  placeholder = "Pick a date",
  disabled,
  className,
}: {
  id?: string
  /** "yyyy-MM-dd", or "" for no date. */
  value: string
  onChange: (value: string) => void
  /** "yyyy-MM-dd" floor — dates before this are disabled. */
  min?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = parseDateValue(value)
  const minDate = min ? parseDateValue(min) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          !selected && "text-muted-foreground",
          className
        )}
      >
        <span>{selected ? format(selected, "MMM d, yyyy") : placeholder}</span>
        <CalendarIcon className="size-3.5 shrink-0 text-text-tertiary" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2.5">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? minDate}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(date) => {
            onChange(date ? toDateValue(date) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
