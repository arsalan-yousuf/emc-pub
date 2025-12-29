'use client';

import { useEffect, useState, useCallback } from "react";
import DashboardIframe from "@/components/dashboard/DashboardIframe";
import { fetchDashboardProfiles, refreshDashboardUrl } from "@/lib/dashboard-server";
import type { DashboardProfileOption } from "@/lib/dashboard-server";

interface DashboardState {
  profiles: DashboardProfileOption[];
  selectedProfileId: string | null;
  currentDashboardId: number | null;
  currentUrl: string | null;
  isAdminView: boolean;
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    profiles: [],
    selectedProfileId: null,
    currentDashboardId: null,
    currentUrl: null,
    isAdminView: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardProfiles();
      setState({
        profiles: data.profiles,
        selectedProfileId: data.initialProfileId,
        currentDashboardId: data.initialDashboardId,
        currentUrl: data.initialIframeUrl,
        isAdminView: data.isAdminView,
      });
    } catch (err) {
      console.error("Error loading dashboards:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Dashboard konnte nicht geladen werden. Bitte erneut versuchen.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleProfileChange = useCallback(async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newProfileId = event.target.value;
    const profile = state.profiles.find((p) => p.id === newProfileId);

    if (!profile || !profile.dashboardId) {
      setState(prev => ({
        ...prev,
        selectedProfileId: newProfileId,
        currentDashboardId: null,
        currentUrl: null,
      }));
      setError("Für dieses Profil ist kein Dashboard konfiguriert.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const url = await refreshDashboardUrl(profile.dashboardId);
      setState(prev => ({
        ...prev,
        selectedProfileId: newProfileId,
        currentDashboardId: profile.dashboardId,
        currentUrl: url,
      }));
    } catch (err) {
      console.error("Error loading dashboard URL:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Dashboard konnte nicht geladen werden.";
      setError(errorMessage);
      setState(prev => ({
        ...prev,
        selectedProfileId: newProfileId,
        currentDashboardId: null,
        currentUrl: null,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [state.profiles]);

  if (isLoading && !state.currentUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 min-h-screen ">
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin"></div>
            <div
              className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-pink-500 animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1s" }}
            ></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm"></div>
          </div>

          <p className="text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent animate-pulse">
            Dashboard wird geladen...
          </p>
        </div>
      </div>
    );
  }

  if (!state.currentDashboardId || !state.currentUrl) {
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
      {state.isAdminView && state.profiles.length > 0 && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="profile-select"
            className="text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Mitarbeiter-Dashboard auswählen
          </label>
          <select
            id="profile-select"
            value={state.selectedProfileId || ""}
            onChange={handleProfileChange}
            className="w-full max-w-md rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            disabled={isLoading}
          >
            {state.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div
          className="text-sm text-red-600 dark:text-red-400 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {state.currentUrl && state.currentDashboardId && (
        <DashboardIframe
          key={state.selectedProfileId}
          iframeKey={state.selectedProfileId as string}
          iframeUrl={state.currentUrl}
          dashboardId={state.currentDashboardId}
          refreshDashboardUrl={refreshDashboardUrl}
        />
      )}
    </div>
  );
}
