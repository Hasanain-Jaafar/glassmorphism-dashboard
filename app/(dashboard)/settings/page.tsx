"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Building2, User, Users } from "lucide-react";
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
import { TeamAccessSection } from "@/components/settings/team-access-section";
import { CompanyDefaultsSection } from "@/components/settings/company-defaults-section";
import { useAuth } from "@/components/providers/auth-provider";

export default function SettingsPage() {
  const { isAdmin: admin } = useAuth();

  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    requestedTab === "team" && admin ? "team" : "profile"
  );

  // Keyed on admin too since it resolves after mount — see the identical
  // pattern (and rationale) in app/(dashboard)/team/page.tsx.
  const tabSyncKey = `${requestedTab}:${admin}`;
  const [prevTabSyncKey, setPrevTabSyncKey] = useState(tabSyncKey);
  if (tabSyncKey !== prevTabSyncKey) {
    setPrevTabSyncKey(tabSyncKey);
    if (requestedTab === "team" && admin) {
      setActiveTab("team");
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
            {admin && (
              <TabsTab value="team">
                <Users className="size-[15px]" />
                Team &amp; Access
              </TabsTab>
            )}
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

          {admin && (
            <TabsPanel value="team">
              <TeamAccessSection />
            </TabsPanel>
          )}

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
