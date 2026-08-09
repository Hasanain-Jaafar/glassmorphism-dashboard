"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  useAuth,
  type Profile,
  type UserRole,
} from "@/components/providers/auth-provider";
import { AddAccountDialog } from "@/components/settings/add-account-dialog";
import { EditAccountDialog } from "@/components/settings/edit-account-dialog";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  sales_rep: "Sales Representative",
};

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function TeamAccessSection() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Profile[] | null>(null);
  const [editingAccount, setEditingAccount] = useState<Profile | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Profile | null>(null);

  function fetchAccounts() {
    const supabase = createClient();
    return supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, avatar_url, role, is_active, has_car, start_date"
      )
      .order("full_name");
  }

  async function loadAccounts() {
    const { data, error } = await fetchAccounts();
    if (error) {
      toast.error(error.message);
      return;
    }
    setAccounts((data as Profile[]) ?? []);
  }

  useEffect(() => {
    fetchAccounts().then(({ data, error }) => {
      if (error) {
        toast.error(error.message);
        return;
      }
      setAccounts((data as Profile[]) ?? []);
    });
  }, []);

  async function handleToggleActive(id: string, isActive: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !isActive })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isActive ? "Access revoked" : "Access restored");
    loadAccounts();
  }

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground sm:text-base">
            Team &amp; Access
          </h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Add, edit, and manage who can sign in and what they can do.
          </p>
        </div>

        <AddAccountDialog onCreated={loadAccounts} />
      </div>

      {accounts === null ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <p className="mt-5 text-sm text-text-tertiary">No accounts yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-glass-border">
          {accounts.map((account) => {
            const isSelf = account.id === user?.id;
            return (
              <li
                key={account.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {account.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={account.avatar_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      initials(account.full_name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {account.full_name}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-text-tertiary">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {account.email}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!account.is_active && (
                    <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                      Deactivated
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                      account.role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-foreground/[0.06] text-text-secondary"
                    )}
                  >
                    {account.role === "admin" && (
                      <ShieldCheck className="size-3" />
                    )}
                    {roleLabels[account.role]}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" />}
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingAccount(account)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isSelf}
                        onClick={() =>
                          handleToggleActive(account.id, account.is_active)
                        }
                      >
                        {account.is_active ? (
                          <Ban className="size-3.5" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        {account.is_active ? "Revoke" : "Restore"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={isSelf}
                        onClick={() => setDeletingAccount(account)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          isSelf={editingAccount.id === user?.id}
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          onSaved={loadAccounts}
        />
      )}

      {deletingAccount && (
        <DeleteAccountDialog
          account={deletingAccount}
          open={!!deletingAccount}
          onOpenChange={(open) => !open && setDeletingAccount(null)}
          onDeleted={loadAccounts}
        />
      )}
    </div>
  );
}
