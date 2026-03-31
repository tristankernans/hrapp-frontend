import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

export default function Reports() {
  const [dashboards, setDashboards] = useState([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [error, setError] = useState("");

  async function loadDashboards() {
    try {
      setError("");

      const data = await apiFetch("/auth/reports/dashboards");

      const list = Array.isArray(data?.dashboards) ? data.dashboards : [];
      setDashboards(list);

      const first = list?.[0]?.site || "";
      setSelectedSite((prev) => prev || first);
    } catch (err) {
      setDashboards([]);
      setSelectedSite("");
      setEmbedUrl("");
      setError(err.message || "Failed to load dashboards");
    }
  }

  async function loadEmbed(site) {
    if (!site) {
      setEmbedUrl("");
      return;
    }

    try {
      setError("");

      const data = await apiFetch(
        `/auth/reports/embed-url?site=${encodeURIComponent(site)}`
      );

      setEmbedUrl(data?.url || "");
    } catch (err) {
      setEmbedUrl("");
      setError(err.message || "Failed to load dashboard");
    }
  }

  useEffect(() => {
    loadDashboards();
  }, []);

  useEffect(() => {
    loadEmbed(selectedSite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a site to view its Zoho Analytics dashboard. If no sites appear please contact IT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={dashboards.length === 0}
          >
            {dashboards.length === 0 ? (
              <option value="">No dashboards available</option>
            ) : (
              dashboards.map((d) => (
                <option key={d.site} value={d.site}>
                  {d.site}
                </option>
              ))
            )}
          </select>

          <a
            href={embedUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className={`rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ${
              !embedUrl ? "pointer-events-none opacity-50" : "hover:bg-slate-800"
            }`}
          >
            Open in new tab
          </a>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-medium text-slate-700">
            {selectedSite ? `${selectedSite} Dashboard` : "Dashboard"}
          </div>
        </div>

        {!embedUrl ? (
          <div className="flex h-[88vh] items-center justify-center text-sm text-slate-500">
            Select a dashboard
          </div>
        ) : (
          <iframe
            title="Zoho Dashboard"
            src={embedUrl}
            className="h-[88vh] w-full"
          />
        )}
      </div>
    </div>
  );
}