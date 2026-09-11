"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

/**
 * Sales activity here follows the local Sat–Fri work week, not the
 * Sun–Sat default react-day-picker (and every native <input type="date">)
 * ships with.
 */
const WEEK_STARTS_ON = 6

function Calendar({
  className,
  classNames,
  weekStartsOn = WEEK_STARTS_ON,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={weekStartsOn}
      className={cn("p-0", className)}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-3",
        month: "flex flex-col gap-3",
        month_caption: "flex items-center justify-center px-8 h-8",
        caption_label: "text-sm font-medium text-foreground",
        nav: "flex items-center justify-between absolute inset-x-0 top-0 h-8",
        button_previous:
          "inline-flex size-7 items-center justify-center rounded-[6px] text-text-secondary transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        button_next:
          "inline-flex size-7 items-center justify-center rounded-[6px] text-text-secondary transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-8 text-center text-[0.7rem] font-medium text-text-tertiary",
        week: "mt-1 flex w-full",
        day: "p-0 text-center",
        day_button: cn(
          "inline-flex size-8 items-center justify-center rounded-[6px] text-sm font-normal text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        ),
        today: "[&>button]:border [&>button]:border-primary/50",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        outside: "[&>button]:text-text-tertiary/60",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-35",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...chevronProps} />
          ) : (
            <ChevronRight className="size-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
