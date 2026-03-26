import React, { useEffect, useMemo, useState } from "react";

/**
 * DeliWaste.jsx
 * - Uses the same backend pattern as Forms.jsx
 * - Shows only deli waste images
 * - Defaults to last 7 days
 * - Simple gallery layout
 */

const API_BASE = "https://hrapp-api-bme6bvfn4dybnfr.ukwest-01.azurewebsites.net";

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

function safeParsePayload(payload_json) {
  if (!payload_json) return null;
  if (typeof payload_json === "object") return payload_json;
  if (typeof payload_json === "string") {
    try {
      return JSON.parse(payload_json);
    } catch {
      return null;
    }
  }
  return null;
}

function formatDateOnly(s) {
  if (!s) return "";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return String(s);

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(d)
    .replace(/\//g, "-");
}

function formatDateTime(s) {
  if (!s) return "";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return String(s);

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(d)
    .replace(/\//g, "-");
}

function getDefaultFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function extractFromData(payload, predicate) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return data.find(predicate) || null;
}

function getSite(payload, fallbackSiteCode = "") {
  const direct = (payload?.site_code ?? payload?.site ?? fallbackSiteCode).toString().trim();
  if (direct) return direct;

  const item =
    extractFromData(payload, (x) => x?.type === "dropdown" && /(site|store)/i.test(x?.title || "")) ||
    extractFromData(payload, (x) => /(please choose (the )?(site|store))/i.test(x?.title || "")) ||
    extractFromData(payload, (x) => /(choose (a )?(site|store))/i.test(x?.title || "")) ||
    extractFromData(payload, (x) =>
      ["dropdown", "multipleChoice", "choices"].includes((x?.type || "").toString())
    );

  const v = item?.value;
  if (v == null) return fallbackSiteCode || "";
  if (typeof v === "string" || typeof v === "number") return v.toString().trim();
  try {
    return JSON.stringify(v);
  } catch {
    return fallbackSiteCode || "";
  }
}

function extractDeliWasteImages(payload, fallbackSiteCode = "", createdAt = "") {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const site = getSite(payload, fallbackSiteCode);

  return data
    .filter(
      (item) =>
        item?.type === "image" &&
        String(item?.title || "").trim().toLowerCase() === "upload photo of deli waste"
    )
    .map((item, idx) => ({
      id: `${item?.value?.azure_blob_name || item?.value?.url || "img"}-${idx}`,
      title: item?.title || "Deli Waste Image",
      site,
      createdAt,
      url: item?.value?.azure_blob_url || item?.value?.url || "",
      azureBlobName: item?.value?.azure_blob_name || "",
      name: item?.value?.name || "",
      mime: item?.value?.type || "",
      size: item?.value?.size,
      width: item?.value?.width,
      height: item?.value?.height,
      isAzure: Boolean(item?.value?.azure_blob_name),
    }));
}

export default function DeliWaste() {
  const [sitesList, setSitesList] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [siteFilter, setSiteFilter] = useState("All Sites");
  const [dateFrom, setDateFrom] = useState(getDefaultFromDate());
  const [dateTo, setDateTo] = useState(getTodayDate());

  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [error, setError] = useState("");

  const [resolvedImageUrls, setResolvedImageUrls] = useState({});
  const [imageModalUrl, setImageModalUrl] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");
        setLoadingSites(true);
        const data = await apiFetch("/auth/forms/sites");
        const list = Array.isArray(data?.sites) ? data.sites : [];
        const normalized = list.map((s) => String(s).trim()).filter(Boolean);
        setSitesList(normalized);
      } catch (e) {
        setError(e.message || "Failed to load sites.");
      } finally {
        setLoadingSites(false);
      }
    })();
  }, []);

  async function loadSubmissions() {
    try {
      setError("");
      setLoadingSubs(true);

      const params = new URLSearchParams();
      params.set("limit", "200");
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (siteFilter && siteFilter !== "All Sites") params.set("site", siteFilter);

      const data = await apiFetch(`/auth/forms/submissions-list?${params.toString()}`);
      const rows = Array.isArray(data?.results) ? data.results : [];
      setSubmissions(rows);
    } catch (e) {
      setError(e.message || "Failed to load deli waste images.");
      setSubmissions([]);
    } finally {
      setLoadingSubs(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sites = useMemo(() => {
    return ["All Sites", ...sitesList.slice().sort((a, b) => a.localeCompare(b))];
  }, [sitesList]);

  const deliWasteImages = useMemo(() => {
    const out = [];

    for (const row of submissions) {
      const payload = safeParsePayload(row.payload_json);
      if (!payload) continue;

      const extracted = extractDeliWasteImages(
        payload,
        row.site_code || "",
        row.created_at || row.received_at || ""
      );

      out.push(...extracted);
    }

    out.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return out;
  }, [submissions]);

  useEffect(() => {
    let cancelled = false;

    async function resolveUrls() {
      const next = {};

      for (const img of deliWasteImages) {
        const key = img.azureBlobName || img.url;

        try {
          if (img.isAzure && img.azureBlobName) {
            const data = await apiFetch(
              `/auth/forms/image-view-url?name=${encodeURIComponent(img.azureBlobName)}`
            );
            next[key] = data?.url || "";
          } else {
            next[key] = img.url || "";
          }
        } catch (err) {
          console.error("Failed to resolve image URL:", err);
          next[key] = "";
        }
      }

      if (!cancelled) {
        setResolvedImageUrls(next);
      }
    }

    setResolvedImageUrls({});
    if (deliWasteImages.length) {
      resolveUrls();
    }

    return () => {
      cancelled = true;
    };
  }, [deliWasteImages]);

  function getResolvedImageUrl(img) {
    const key = img.azureBlobName || img.url;
    return resolvedImageUrls[key] || "";
  }

  return (
    <div className="w-full p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Deli Waste Images</h1>
          <p className="text-sm text-slate-600">
            View deli waste uploads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-500">Site</label>
            <select
              className="h-10 min-w-[160px] rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              disabled={loadingSites || !sites.length}
            >
              {sites.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-500">From</label>
            <input
              type="date"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-500">To</label>
            <input
              type="date"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <button
            onClick={loadSubmissions}
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={loadingSubs}
          >
            {loadingSubs ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loadingSubs ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600 shadow-sm">
          Loading deli waste images...
        </div>
      ) : deliWasteImages.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600 shadow-sm">
          No deli waste images found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {deliWasteImages.map((img) => {
            const imageUrl = getResolvedImageUrl(img);

            return (
              <div
                key={img.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="mb-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {img.site || "Unknown Site"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {img.createdAt ? formatDateTime(img.createdAt) : ""}
                  </div>
                </div>

                <button
                  type="button"
                  className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
                  onClick={() => imageUrl && setImageModalUrl(imageUrl)}
                  title="Click to enlarge"
                  disabled={!imageUrl}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={img.name || img.title || "Deli waste image"}
                      className="h-72 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-72 w-full items-center justify-center text-sm text-slate-400">
                      Loading image...
                    </div>
                  )}
                </button>

                
              </div>
            );
          })}
        </div>
      )}

      {imageModalUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setImageModalUrl("")}
        >
          <div
            className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="truncate text-xs text-slate-600">{imageModalUrl}</div>
              <button
                className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
                onClick={() => setImageModalUrl("")}
              >
                Close
              </button>
            </div>
            <img
              src={imageModalUrl}
              alt="Full size"
              className="max-h-[80vh] max-w-[88vw] object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}