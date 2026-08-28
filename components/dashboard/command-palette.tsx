"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, Moon, Sun, UserPlus, UserCog, Building2 } from "lucide-react";
import { navGroups } from "@/lib/nav";
import { customers } from "@/lib/customers-data";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

const roleLabels: Record<TeamMember["role"], string> = {
  admin: "Administrator",
  sales_rep: "Sales Representative",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const router = useRouter();
  const { setTheme } = useTheme();
  const { isAdmin: admin } = useAuth();

  useEffect(() => {
    fetchTeamMembers()
      .then(setTeamMembers)
      .catch(() => {
        // Search just degrades to nav/theme commands only.
      });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key?.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function runCommand(command: () => void) {
    setOpen(false);
    command();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-panel flex h-9 w-full max-w-xs items-center gap-2 rounded-xl px-3 text-sm text-text-tertiary transition-colors hover:text-text-secondary"
      >
        <Search className="size-[15px] shrink-0" />
        <span className="truncate">Search or jump to...</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded-md border border-glass-border px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary sm:flex">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="border-glass-border bg-popover/95 backdrop-blur-2xl"
      >
        <Command>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {navGroups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    disabled={!item.enabled}
                    onSelect={() =>
                      item.enabled && runCommand(() => router.push(item.href))
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                    {!item.enabled && <CommandShortcut>Soon</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`${customer.company} ${customer.contactPerson}`}
                  onSelect={() =>
                    runCommand(() => router.push("/customers"))
                  }
                >
                  <Building2 className="size-4" />
                  {customer.company}
                  <CommandShortcut>{customer.contactPerson}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            {teamMembers.length > 0 && (
              <CommandGroup heading="Salespeople">
                {teamMembers.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={`${person.name} ${roleLabels[person.role]}`}
                    onSelect={() =>
                      runCommand(() => router.push(`/team?person=${person.id}`))
                    }
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                      {person.initials}
                    </span>
                    {person.name}
                    <CommandShortcut>{roleLabels[person.role]}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {admin && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Quick Actions">
                  <CommandItem
                    onSelect={() =>
                      runCommand(() => router.push("/settings?tab=team"))
                    }
                  >
                    <UserPlus className="size-4" />
                    Add Salesperson
                  </CommandItem>
                  <CommandItem
                    value="Company Targets year monthly goal"
                    onSelect={() =>
                      runCommand(() => router.push("/targets?tab=company"))
                    }
                  >
                    <Building2 className="size-4" />
                    Company Targets
                  </CommandItem>
                  <CommandItem
                    value="Individual Targets edit rep targets"
                    onSelect={() =>
                      runCommand(() =>
                        router.push("/targets?tab=individual")
                      )
                    }
                  >
                    <UserCog className="size-4" />
                    Individual Targets
                  </CommandItem>
                </CommandGroup>
              </>
            )}
            <CommandSeparator />
            <CommandGroup heading="Theme">
              <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                <Sun className="size-4" />
                Light mode
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                <Moon className="size-4" />
                Dark mode
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
