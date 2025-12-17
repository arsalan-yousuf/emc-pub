'use client';

import { useEffect, useState } from "react";
import DashboardIframe from "@/components/dashboard/DashboardIframe";
import { fetchDashboardProfiles, refreshDashboardUrl } from "@/lib/dashboard-server";
import type { DashboardProfileOption } from "@/lib/dashboard-server";

export default function ProtectedPage() {
  const [profiles, setProfiles] = useState<DashboardProfileOption[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [currentDashboardId, setCurrentDashboardId] = useState<number | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchDashboardProfiles();
        setProfiles(data.profiles);
        setSelectedProfileId(data.initialProfileId);
        setCurrentDashboardId(data.initialDashboardId);
        setCurrentUrl(data.initialIframeUrl);
        setIsAdminView(data.isAdminView);
      } catch (err) {
        console.error("Error loading dashboards:", err);
        setError("Dashboard konnte nicht geladen werden. Bitte erneut versuchen.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newProfileId = event.target.value;
    setSelectedProfileId(newProfileId);
    const profile = profiles.find((p) => p.id === newProfileId);
    if (!profile || !profile.dashboardId) {
      setCurrentDashboardId(null);
      setCurrentUrl(null);
      setError("Für dieses Profil ist kein Dashboard konfiguriert.");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const url = await refreshDashboardUrl(profile.dashboardId);
      setCurrentDashboardId(profile.dashboardId);
      setCurrentUrl(url);
    } catch (err) {
      console.error("Error loading dashboard URL:", err);
      setError("Dashboard konnte nicht geladen werden.");
      setCurrentDashboardId(null);
      setCurrentUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !currentUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="loading" style={{ margin: "0 auto" }}></div>
          <p className="text-sm text-muted-foreground mt-4">Dashboard wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!currentDashboardId || !currentUrl) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-2">Dashboard nicht konfiguriert</p>
          <p className="text-sm text-muted-foreground">
            Bitte kontaktieren Sie Ihren Administrator, um Ihr Dashboard einzurichten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdminView && profiles.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Mitarbeiter-Dashboard auswählen
          </label>
          <select
            value={selectedProfileId || ""}
            onChange={handleChange}
            className="w-full max-w-md rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      <DashboardIframe
        key={selectedProfileId}
        iframeKey={selectedProfileId as string}
        iframeUrl={currentUrl}
        dashboardId={currentDashboardId}
        refreshDashboardUrl={refreshDashboardUrl}
      />
    </div>
  );
}
