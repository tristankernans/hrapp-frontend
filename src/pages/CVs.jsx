import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function CVs() {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedAppType, setSelectedAppType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState(""); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState("");     // YYYY-MM-DD
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [files, setFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedBlob, setSelectedBlob] = useState("");
  const [error, setError] = useState("");

  const applicationTypes = useMemo(
    () => [
      { value: "ALL", label: "All Applications" },
      { value: "Full-Time", label: "Full-Time" },
      { value: "Part-Time", label: "Part-Time" },
      { value: "Work-Experience", label: "Work-Experience" },
      { value: "Head Office", label: "Head Office" },
    ],
    []
  );

  const dateFilterLabel = useMemo(() => {
    const from = dateFrom ? dateFrom : "";
    const to = dateTo ? dateTo : "";
    if (!from && !to) return "Any Date";
    if (from && !to) return `From ${from}`;
    if (!from && to) return `Up to ${to}`;
    return `${from} → ${to}`;
  }, [dateFrom, dateTo]);

  const toDayStartMs = (ymd) => {
    if (!ymd) return null;
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  };
  const toDayEndMs = (ymd) => {
    if (!ymd) return null;
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  };

  const filteredFiles = useMemo(() => {
    let out = files;

    // application type filter
    const want = (selectedAppType || "ALL").toLowerCase();
    if (want !== "all") {
      out = out.filter((f) => {
        const metaVal =
          (f?.metadata?.applicationtype ||
            f?.metadata?.application_type ||
            f?.metadata?.apptype ||
            f?.metadata?.applicationType ||
            f?.metadata?.type ||
            "") + "";
        return metaVal.trim().toLowerCase() === want;
      });
    }

    // date range filter (uses f.lastModified)
    const fromMs = toDayStartMs(dateFrom);
    const toMs = toDayEndMs(dateTo);

    if (!fromMs && !toMs) return out;

    return out.filter((f) => {
      if (!f?.lastModified) return true; // keep unknown dates
      const t = new Date(f.lastModified).getTime();
      if (!Number.isFinite(t)) return true;
      if (fromMs && t < fromMs) return false;
      if (toMs && t > toMs) return false;
      return true;
    });
  }, [files, selectedAppType, dateFrom, dateTo]);

  const selectedFileExt = useMemo(() => {
    const name = selectedBlob.split("/").pop() || "";
    return name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  }, [selectedBlob]);

  async function loadSites() {
    setError("");
    const res = await fetch(`${API_BASE}/auth/cvs/sites`, { credentials: "include" });
    const data = await res.json();

    if (!res.ok) {
      setSites([]);
      setSelectedSite("");
      setError(data?.error || "Failed to load sites");
      return;
    }

    const list = Array.isArray(data.sites) ? data.sites : [];
    setSites(list);

    const first = list?.[0] || "";
    setSelectedSite((prev) => prev || first);
  }

  async function loadFiles(site) {
    if (!site) {
      setFiles([]);
      return;
    }

    setError("");
    const res = await fetch(`${API_BASE}/auth/cvs/files?site=${encodeURIComponent(site)}`, {
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      setFiles([]);
      setPreviewUrl("");
      setSelectedBlob("");
      setError(data?.error || "Failed to load CVs");
      return;
    }

    setFiles(Array.isArray(data.files) ? data.files : []);
  }

  async function viewFile(blobName) {
    setError("");
    const res = await fetch(
      `${API_BASE}/auth/cvs/files/view-url?name=${encodeURIComponent(blobName)}`,
      { credentials: "include" }
    );
    const data = await res.json();

    if (!res.ok) {
      setPreviewUrl("");
      setSelectedBlob("");
      setError(data?.error || "Failed to get download link");
      return;
    }

    setPreviewUrl(data.url || "");
    setSelectedBlob(blobName);
  }

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (!selectedSite) return;
    loadFiles(selectedSite);
    setPreviewUrl("");
    setSelectedBlob("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite]);

  const canInlinePreviewPdf = selectedFileExt === "pdf";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CV Submissions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a site and (optionally) filter by application type.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            disabled={sites.length === 0}
          >
            {sites.length === 0 ? (
              <option value="">No sites available</option>
            ) : (
              sites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))
            )}
          </select>

          <select
            value={selectedAppType}
            onChange={(e) => setSelectedAppType(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {applicationTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker((s) => !s)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {dateFilterLabel}
            </button>

            {showDatePicker && (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs text-slate-600">
                    From
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </label>

                  <label className="text-xs text-slate-600">
                    To
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setShowDatePicker(false);
                    }}
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => loadFiles(selectedSite)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            disabled={!selectedSite}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6">
        {/* File list */}
        <div className="rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">CVs</h2>
            <span className="text-xs text-slate-500">
              {selectedSite ? `Site: ${selectedSite}` : ""}
            </span>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="py-6 text-sm text-slate-500">No CVs found.</div>
          ) : (
            <div className={filteredFiles.length > 4 ? "max-h-[360px] overflow-y-auto pr-2" : ""}>
              {filteredFiles.map((f) => (
                <div
                  key={f.blobName}
                  className="flex items-center justify-between gap-3 border-t py-2 first:border-t-0"
                >
                  <div className="min-w-0">
                    {/*<div className="truncate text-sm font-medium">
                      {f.filename || f.blobName}
                    </div>*/}

                    {(f.metadata?.firstname || f.metadata?.lastname || f.metadata?.phone) ? (
                      <div className="mt-0.5 text-xs text-slate-600">
                        <span className="font-medium">
                          {f.metadata?.firstname || ""} {f.metadata?.lastname || ""}
                        </span>
                        {f.metadata?.phone ? (
                          <span className="text-slate-500"> • {f.metadata.phone}</span>
                        ) : null}
                        {(() => {
                          const appType =
                            f.metadata?.applicationtype ||
                            f.metadata?.application_type ||
                            f.metadata?.applicationType ||
                            f.metadata?.apptype ||
                            f.metadata?.type ||
                            "";
                          return appType ? (
                            <span className="text-slate-500"> • {appType}</span>
                          ) : null;
                        })()}
                      </div>
                    ) : null}

                    <div className="text-xs text-slate-500">
                      {f.lastModified
                        ? new Date(f.lastModified).toLocaleString()
                        : "Unknown date"}
                      {" • "}
                      {(f.size / 1024).toFixed(1)} KB
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <button
                      onClick={() => viewFile(f.blobName)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View / Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-semibold">Preview</h2>

          {!previewUrl ? (
            <div className="flex h-[75vh] items-center justify-center text-sm text-slate-500">
              Select a CV to view or download
            </div>
          ) : canInlinePreviewPdf ? (
            <iframe
              src={previewUrl}
              className="h-[75vh] w-full rounded"
              title="CV Preview"
            />
          ) : (
            <div className="flex h-[75vh] flex-col items-center justify-center gap-3 text-sm text-slate-600">
              <div>
                This file type can’t be previewed in-browser. Click below to download.
              </div>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Download CV
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}