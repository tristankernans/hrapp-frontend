import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
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

export default function HR() {
  const folderOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      { value: "handbooks", label: "Handbooks" },
      { value: "training", label: "Training" },
      { value: "policies", label: "Policies" },
      { value: "forms", label: "Forms" },
      { value: "cvs", label: "CVs" },
    ],
    []
  );

  const [uploadFolder, setUploadFolder] = useState("handbooks");
  const [viewFolder, setViewFolder] = useState("");
  const [pendingFile, setPendingFile] = useState(null);

  const [files, setFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const displayFileName = (fullName) => {
    const base = String(fullName || "").split("/").pop() || "";
    const noExt = base.replace(/\.[^/.]+$/, "");
    return noExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  };

  async function loadFiles(prefix = viewFolder) {
    try {
      setError("");

      const qs = prefix ? `?prefix=${encodeURIComponent(prefix + "/")}` : "";
      const data = await apiFetch(`/auth/hr/files${qs}`);

      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setFiles([]);
      setError(err.message || "Failed to load files");
    }
  }

  useEffect(() => {
    loadFiles(viewFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitUpload(e) {
    e.preventDefault();

    if (!pendingFile) {
      alert("Please choose a file first.");
      return;
    }

    try {
      setError("");
      setSubmitting(true);

      const folderToUse = uploadFolder === "" ? "" : uploadFolder;

      const sasData = await apiFetch("/auth/hr/files/sas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: pendingFile.name,
          contentType: pendingFile.type,
          folder: folderToUse,
        }),
      });

      const { uploadUrl } = sasData;

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": pendingFile.type || "application/octet-stream",
        },
        body: pendingFile,
      });

      if (!putRes.ok) {
        alert("Upload failed. Check console/network for details.");
        return;
      }

      setPendingFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setViewFolder(folderToUse);
      await loadFiles(folderToUse);
    } catch (err) {
      alert(err.message || "Upload failed. Check console/network for details.");
    } finally {
      setSubmitting(false);
    }
  }

  async function viewFile(name) {
    try {
      setError("");

      const data = await apiFetch(
        `/auth/hr/files/view-url?name=${encodeURIComponent(name)}`
      );

      setPreviewUrl(data.url || "");
      setSelectedFile(name);
    } catch (err) {
      alert(err.message || "Failed to get preview URL");
    }
  }

  async function deleteFile(name) {
    if (!confirm(`Delete ${name}?`)) return;

    try {
      setError("");

      await apiFetch(`/auth/hr/files?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });

      if (selectedFile === name) {
        setPreviewUrl("");
        setSelectedFile("");
      }

      await loadFiles(viewFolder);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  const isPdf = selectedFile.toLowerCase().endsWith(".pdf");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">HR Resources</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload and view HR files by category.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-slate-900">New Upload</h2>

          <form onSubmit={submitUpload} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  {folderOptions
                    .filter((o) => o.value !== "")
                    .map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
                />
              </div>
            </div>

            {pendingFile ? (
              <div className="text-sm text-slate-600">
                Selected file: <span className="font-medium">{pendingFile.name}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !pendingFile}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Uploading..." : "Submit Upload"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">View Files</h2>

            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Category</label>
              <select
                value={viewFolder}
                onChange={(e) => {
                  const v = e.target.value;
                  setViewFolder(v);
                  loadFiles(v);
                  setPreviewUrl("");
                  setSelectedFile("");
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
              >
                {folderOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">Recent Files</div>
              <div className="text-xs text-slate-500">
                {viewFolder ? `Category: ${viewFolder}` : "All categories"}
              </div>
            </div>

            {files.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                No files found in this category.
              </div>
            ) : (
              <div className={files.length > 5 ? "max-h-[360px] overflow-y-auto" : ""}>
                {files.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 first:border-t-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {displayFileName(f.name)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {f.lastModified
                          ? new Date(f.lastModified).toLocaleString("en-IE")
                          : "Unknown date"}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-4">
                      <button
                        onClick={() => viewFile(f.name)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() => deleteFile(f.name)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Preview</h2>

          {!previewUrl ? (
            <div className="flex h-[75vh] items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">
              Select a file to preview
            </div>
          ) : isPdf ? (
            <iframe
              src={previewUrl}
              className="h-[75vh] w-full rounded-xl border border-slate-200"
              title="PDF Preview"
            />
          ) : (
            <video
              src={previewUrl}
              controls
              className="h-[75vh] w-full rounded-xl border border-slate-200 bg-black object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}