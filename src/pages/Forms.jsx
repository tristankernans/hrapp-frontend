import React, { useEffect, useMemo, useState } from "react";

/**
 * Forms.jsx
 * - Reads Paperform submissions stored in MySQL via your backend
 * - Uses Azure SAS URLs for private blob images when azure_blob_name exists
 */

async function apiFetch(path) {
  const res = await fetch(path, {
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

function formatDateTime(s) {
  if (!s) return "";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return String(s);

  const out = new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

  return out.replace(/\//g, "-");
}

function formatDateOnly(s) {
  if (!s) return "";

  const m = String(s).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  let d;

  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    d = new Date(Date.UTC(year, month - 1, day));
  } else {
    d = new Date(s);
  }

  if (!Number.isFinite(d.getTime())) return String(s);

  const out = new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: m ? "UTC" : undefined,
  }).format(d);

  return out.replace(/\//g, "-");
}

function extractFromData(payload, predicate) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return data.find(predicate) || null;
}

function getSite(payload) {
  const direct = (payload?.site_code ?? payload?.site ?? "").toString().trim();
  if (direct) return direct;

  const item =
    extractFromData(payload, (x) => x?.type === "dropdown" && /(site|store)/i.test(x?.title || "")) ||
    extractFromData(payload, (x) => /(please choose (the )?(site|store))/i.test(x?.title || "")) ||
    extractFromData(payload, (x) => /(choose (a )?(site|store))/i.test(x?.title || "")) ||
    extractFromData(payload, (x) =>
      ["dropdown", "multipleChoice", "choices"].includes((x?.type || "").toString())
    );

  const v = item?.value;
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return v.toString().trim();

  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

function getInspector(payload) {
  const item =
    extractFromData(payload, (x) => x?.type === "text" && /inspector/i.test(x?.title || "")) ||
    extractFromData(payload, (x) => /inspector name/i.test(x?.title || ""));
  return (item?.value ?? "").toString().trim();
}

function getInspectionDate(payload) {
  const item =
    extractFromData(payload, (x) => x?.type === "date" && /inspection date/i.test(x?.title || "")) ||
    extractFromData(payload, (x) => /inspection date/i.test(x?.title || ""));
  return (item?.value ?? "").toString().trim();
}

function getNotes(payload) {
  const item =
    extractFromData(payload, (x) => x?.type === "text" && /notes|concern/i.test(x?.title || "")) ||
    extractFromData(payload, (x) => /notes/i.test(x?.title || ""));
  return (item?.value ?? "").toString().trim();
}

function extractImages(payload) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const out = [];

  for (const item of data) {
    if (item?.type !== "image") continue;

    const azureBlobName = item?.value?.azure_blob_name || "";
    const azureUrl = item?.value?.azure_blob_url || "";
    const fallbackUrl = item?.value?.url || "";

    out.push({
      title: item?.title || "Image",
      description: item?.description || "",
      url: azureUrl || fallbackUrl,
      azureBlobName,
      name: item?.value?.name || "",
      mime: item?.value?.type || "",
      size: item?.value?.size,
      width: item?.value?.width,
      height: item?.value?.height,
      isAzure: Boolean(azureBlobName),
    });
  }

  return out;
}

function extractAnswers(payload) {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const rows = [];

  for (const item of data) {
    if (!item?.title) continue;
    if (item.type === "image") continue;
    if (item.type === "dropdown" && /site/i.test(item.title || "")) continue;

    const value =
      item?.value == null
        ? ""
        : typeof item.value === "object"
        ? JSON.stringify(item.value)
        : String(item.value);

    if (!value.trim()) continue;

    rows.push({
      title: String(item.title),
      type: item.type || "",
      value,
      description: item.description || "",
    });
  }

  return rows;
}

export default function Forms() {
  const [sitesList, setSitesList] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  const [siteFilter, setSiteFilter] = useState("All Sites");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [error, setError] = useState("");

  const [imageModalUrl, setImageModalUrl] = useState("");
  const [resolvedImageUrls, setResolvedImageUrls] = useState({});

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
      params.set("limit", "100");
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (siteFilter && siteFilter !== "All Sites") params.set("site", siteFilter);

      const data = await apiFetch(`/auth/forms/submissions-list?${params.toString()}`);
      const rows = Array.isArray(data?.results) ? data.results : [];

      setSubmissions(rows);
      const first = rows[0]?.submission_id || rows[0]?.id || "";
      setSelectedId(first);
    } catch (e) {
      setError(e.message || "Failed to load submissions.");
      setSubmissions([]);
      setSelectedId("");
    } finally {
      setLoadingSubs(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteFilter]);

  const enrichedAll = useMemo(() => {
    return submissions.map((row) => {
      const payload = safeParsePayload(row.payload_json);
      const summary = payload
        ? {
            site: row.site_code || getSite(payload),
            inspector: getInspector(payload),
            inspectionDate: getInspectionDate(payload),
            notes: getNotes(payload),
          }
        : { site: row.site_code || "", inspector: "", inspectionDate: "", notes: "" };

      return { ...row, _payload: payload, _summary: summary };
    });
  }, [submissions]);

  const enriched = enrichedAll;

  const sites = useMemo(() => {
    return ["All Sites", ...sitesList.slice().sort((a, b) => a.localeCompare(b))];
  }, [sitesList]);

  useEffect(() => {
    if (!enriched.length) {
      setSelectedId("");
      return;
    }

    const exists = enriched.some((r) => (r.submission_id || r.id) === selectedId);
    if (!exists) {
      const first = enriched[0]?.submission_id || enriched[0]?.id || "";
      setSelectedId(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteFilter, enrichedAll, enriched.length]);

  const selected = useMemo(() => {
    return enriched.find((r) => (r.submission_id || r.id) === selectedId) || null;
  }, [enriched, selectedId]);

  const payload = selected?._payload || null;
  const images = useMemo(() => (payload ? extractImages(payload) : []), [payload]);
  const answers = useMemo(() => (payload ? extractAnswers(payload) : []), [payload]);

  useEffect(() => {
    let cancelled = false;

    async function resolveUrls() {
      const next = {};

      for (const img of images) {
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
    if (images.length) {
      resolveUrls();
    }

    return () => {
      cancelled = true;
    };
  }, [images]);

  function getResolvedImageUrl(img) {
    const key = img.azureBlobName || img.url;
    return resolvedImageUrls[key] || "";
  }

  return (
    <div className="w-full p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Forms</h1>
          <p className="text-sm text-slate-600">
            View Paperform submissions saved into MySQL (including uploaded images).
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">Submissions</div>
              <div className="text-xs text-slate-500">{enriched.length}</div>
            </div>

            <div className={enriched.length > 4 ? "max-h-[520px] overflow-y-auto" : ""}>
              {enriched.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-600">
                  {loadingSubs ? "Loading..." : "No submissions found."}
                </div>
              ) : (
                enriched.map((r) => {
                  const id = r.submission_id || r.id;
                  const active = id === selectedId;
                  const site = r._summary?.site || r.site_code || "—";
                  const inspector = r._summary?.inspector || "—";
                  const insDate = r._summary?.inspectionDate
                    ? formatDateOnly(r._summary.inspectionDate)
                    : "";
                  const when = formatDateTime(r.created_at || r.received_at);

                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedId(id)}
                      className={[
                        "w-full text-left px-4 py-3 border-b last:border-b-0",
                        active ? "bg-slate-50" : "bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="truncate text-sm font-semibold text-slate-900">{site}</div>
                      <div className="truncate text-xs text-slate-600">
                        Inspector: <span className="font-medium">{inspector}</span>
                        {insDate ? <span> • {insDate}</span> : null}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-500">{when}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">Submission Details</div>
              <div className="text-xs text-slate-500">
                {selected?.submission_id
                  ? `Submission: ${selected.submission_id}`
                  : "Select a submission to view details."}
              </div>
            </div>

            {!selected ? (
              <div className="px-4 py-12 text-center text-sm text-slate-600">
                Select a submission on the left.
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Site</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {selected._summary?.site || selected.site_code || "—"}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Inspector</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {selected._summary?.inspector || "—"}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Inspection Date</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {selected._summary?.inspectionDate
                        ? formatDateOnly(selected._summary.inspectionDate)
                        : "—"}
                    </div>
                  </div>
                </div>

                {selected._summary?.notes ? (
                  <div className="mt-4 rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-700">Notes</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {selected._summary.notes}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Images</div>
                    <div className="text-xs text-slate-500">{images.length}</div>
                  </div>

                  {images.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-600">
                      No images found in this submission.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {images.map((img, idx) => {
                        const imageUrl = getResolvedImageUrl(img);

                        return (
                          <div
                            key={`${img.azureBlobName || img.url}-${idx}`}
                            className="rounded-lg border border-slate-200 p-3"
                          >
                            <div className="text-xs font-semibold text-slate-800">{img.title}</div>

                            {img.description ? (
                              <div className="text-xs text-slate-500">{img.description}</div>
                            ) : null}

                            <button
                              type="button"
                              className="mt-2 block w-full overflow-hidden rounded-md border border-slate-200 bg-white"
                              onClick={() => imageUrl && setImageModalUrl(imageUrl)}
                              title="Click to enlarge"
                              disabled={!imageUrl}
                            >
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={img.name || img.title || "Uploaded image"}
                                  className="h-40 w-full object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-40 w-full items-center justify-center text-sm text-slate-400">
                                  Loading image...
                                </div>
                              )}
                            </button>

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              {img.name ? <span className="truncate">{img.name}</span> : null}
                              {img.mime ? <span>{img.mime}</span> : null}
                              {Number.isFinite(img.size) ? (
                                <span>{Math.round(img.size / 1024)} KB</span>
                              ) : null}
                              {img.width && img.height ? (
                                <span>
                                  {img.width}×{img.height}
                                </span>
                              ) : null}
                              {img.isAzure ? <span className="text-emerald-600">Azure</span> : null}
                              {imageUrl ? (
                                <a
                                  className="text-slate-700 underline"
                                  href={imageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open
                                </a>
                              ) : (
                                <span className="text-slate-400">Preparing...</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="mb-2 text-sm font-semibold text-slate-900">Answers</div>

                  {answers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-600">
                      No non-image answers found.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <div className="max-h-[360px] overflow-y-auto">
                        {answers.map((a, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 border-b border-slate-200 px-3 py-2 last:border-b-0"
                          >
                            <div className="col-span-12 md:col-span-5">
                              <div className="text-xs font-semibold text-slate-800">{a.title}</div>
                              {a.type ? (
                                <div className="text-[11px] text-slate-500">{a.type}</div>
                              ) : null}
                            </div>

                            <div className="col-span-12 md:col-span-7">
                              <div className="whitespace-pre-wrap text-sm text-slate-700">
                                {a.value}
                              </div>
                              {a.description ? (
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {a.description}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <details className="mt-6 rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    Raw payload
                  </summary>
                  <pre className="mt-3 max-h-[360px] overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>

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