import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Reports() {
  const [dashboards, setDashboards] = useState([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [error, setError] = useState("");

  async function loadDashboards() {
    try {
      setError("");

      const res = await fetch(`${API_BASE}/auth/reports/dashboards`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setDashboards([]);
        setSelectedSite("");
        setEmbedUrl("");
        setError(data?.error || "Failed to load dashboards");
        return;
      }

      const list = data.dashboards || [];
      setDashboards(list);

      const first = list?.[0]?.site || "";
      setSelectedSite((prev) => prev || first);
    } catch (err) {
      console.error("loadDashboards error:", err);
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

      const res = await fetch(
        `${API_BASE}/auth/reports/embed-url?site=${encodeURIComponent(site)}`,
        {
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setEmbedUrl("");
        setError(data?.error || "Failed to load dashboard");
        return;
      }

      setEmbedUrl(data.url || "");
    } catch (err) {
      console.error("loadEmbed error:", err);
      setEmbedUrl("");
      setError("Failed to load dashboard");
    }
  }

  useEffect(() => {
    loadDashboards();
  }, []);

  useEffect(() => {
    loadEmbed(selectedSite);
  }, [selectedSite]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Deli/Butchery P+Ls</h1>
          <p className="mt-1 text-sm text-slate-500"></p>
        </div>

        <div className="flex items-center gap-3"></div>
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
            width="1200"
            height="600"
            allowFullScreen={true}
            src="https://analytics.zoho.eu/ZDBSlideshow.cc?SLIDEID=126018000016554030&SLIDEKEY=0380d9ef681a952544518d55e345978b63383167d88e7500b021f4ce5cafa7b9&INTERVAL=25&AUTOPLAY=true&INCLUDETITLE=true&INCLUDEDESC=true&SOCIALWIDGETS=false"
          ></iframe>
        )}
      </div>
    </div>
  );
}