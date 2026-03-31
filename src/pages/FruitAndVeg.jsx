import React, { useEffect, useState } from "react";

export default function Reports() {
  const [dashboards, setDashboards] = useState([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [error, setError] = useState("");

  const FRUIT_AND_VEG_URL =
    "https://analytics.zoho.eu/open-view/126018000016544021/77be75d25b4ba68a97a89b1454bb6197ee4988ed27eba0bcddc21165a7f2cd28";

  async function loadDashboards() {
    try {
      setError("");

     
    } catch (err) {
      setDashboards([]);
      setSelectedSite("");
      setEmbedUrl("");
      setError("Failed to load dashboards");
    }
  }

  async function loadEmbed(site) {
    if (!site) {
      setEmbedUrl("");
      return;
    }

    try {
      setError("");
      setEmbedUrl(FRUIT_AND_VEG_URL);
    } catch (err) {
      setEmbedUrl("");
      setError("Failed to load dashboard");
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
          <h1 className="text-2xl font-semibold">Fruit & Veg P+Ls</h1>
          <p className="mt-1 text-sm text-slate-500"></p>
        </div>

        <div className="flex items-center gap-3">
          {dashboards.length > 0 && (
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {dashboards.map((d, i) => (
                <option key={`${d.site || "site"}-${i}`} value={d.site}>
                  {d.site}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-medium text-slate-700">P+Ls</div>
        </div>

        {!embedUrl ? (
          <div className="flex h-[88vh] items-center justify-center text-sm text-slate-500">
            Select a dashboard
          </div>
        ) : (
          <iframe
            src={embedUrl}
            className="h-[88vh] w-full"
            title="Fruit & Veg P+Ls"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}