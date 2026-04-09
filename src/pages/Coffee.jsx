import React, { useEffect, useState } from "react";

export default function Reports() {
  const [embedUrl, setEmbedUrl] = useState("");
  const [error, setError] = useState("");

  const COFFEE_URL =
    "https://analytics.zoho.eu/open-view/126018000017054679/c7d0017c72f37889aaf454d75841f0212993d41aa7030dcd3dc194d15f9ca40c";

  async function loadEmbed() {
    try {
      setError("");
      setEmbedUrl(COFFEE_URL);
    } catch (err) {
      setEmbedUrl("");
      setError("Failed to load dashboard");
    }
  }

  useEffect(() => {
    loadEmbed();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">COFFEE P+Ls</h1>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-medium text-slate-700">P+Ls</div>
        </div>

        {!embedUrl ? (
          <div className="flex h-[88vh] items-center justify-center text-sm text-slate-500">
            Loading dashboard...
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