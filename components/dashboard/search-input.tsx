import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

/**
 * The search field used across list pages — a leading icon, the input, and
 * (once there's something to clear) a trailing X button. Kept as one
 * component so all of them clear the same way instead of each page
 * reimplementing the button.
 */
export function SearchInput({
  icon: Icon,
  value,
  onChange,
  placeholder,
  className,
}: {
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <InputGroup className={cn("glass-panel filter-control sm:max-w-xs", className)}>
      <InputGroupAddon>
        <Icon className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Clear search"
            size="icon-xs"
            onClick={() => onChange("")}
          >
            <X className="size-3.5" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
