"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Building2, Sparkles, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Reveal } from "@/components/motion/reveal";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/profile-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { AiAssistantSection } from "@/components/settings/ai-assistant-section";
import { CompanyDefaultsSection } from "@/components/settings/company-defaults-section";
import { useAuth } from "@/components/providers/auth-provider";

const settingsTabs = ["profile", "notifications", "assistant", "company"] as const;
type SettingsTab = (typeof settingsTabs)[number];

function resolveSettingsTab(tab: string | null, admin: boolean): SettingsTab {
  if (!(settingsTabs as readonly string[]).includes(tab ?? "")) return "profile";
  if (tab === "company" && !admin) return "profile";
  return tab as SettingsTab;
}

export default function SettingsPage() {
  const { isAdmin: admin } = useAuth();

  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(
    resolveSettingsTab(requestedTab, admin)
  );

  // Keyed on admin too since it resolves after mount — see the identical
  // pattern (and rationale) in app/(dashboard)/team/page.tsx.
  const tabSyncKey = `${requestedTab}:${admin}`;
  const [prevTabSyncKey, setPrevTabSyncKey] = useState(tabSyncKey);
  if (tabSyncKey !== prevTabSyncKey) {
    setPrevTabSyncKey(tabSyncKey);
    if (requestedTab) {
      setActiveTab(resolveSettingsTab(requestedTab, admin));
    }
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Settings"
          description="Manage your profile, notifications, and workspace defaults"
        />
      </Reveal>

      <Reveal delay={0.05}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTab value="profile">
              <User className="size-[15px]" />
              Profile
            </TabsTab>
            <TabsTab value="notifications">
              <Bell className="size-[15px]" />
              Notifications
            </TabsTab>
            <TabsTab value="assistant">
              <Sparkles className="size-[15px]" />
              AI Assistant
            </TabsTab>
            {admin && (
              <TabsTab value="company">
                <Building2 className="size-[15px]" />
                Company Defaults
              </TabsTab>
            )}
            <TabsIndicator />
          </TabsList>

          <TabsPanel value="profile">
            <ProfileSection />
          </TabsPanel>

          <TabsPanel value="notifications">
            <NotificationsSection />
          </TabsPanel>

          <TabsPanel value="assistant">
            <AiAssistantSection />
          </TabsPanel>

          {admin && (
            <TabsPanel value="company">
              <CompanyDefaultsSection />
            </TabsPanel>
          )}
        </Tabs>
      </Reveal>
    </div>
  );
}
