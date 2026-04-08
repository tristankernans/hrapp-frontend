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
  }, []);

  async function submitUpload(e) {
    e.preventDefault();

    if (!pendingFile) {
      alert("Please choose a file first.");
      return;
    }

    try {
      setSubmitting(true);

      const sasData = await apiFetch("/auth/hr/files/sas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: pendingFile.name,
          contentType: pendingFile.type,
          folder: uploadFolder,
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
        alert("Upload failed.");
        return;
      }

      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setViewFolder(uploadFolder);
      await loadFiles(uploadFolder);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function viewFile(name) {
    const data = await apiFetch(
      `/auth/hr/files/view-url?name=${encodeURIComponent(name)}`
    );
    setPreviewUrl(data.url);
    setSelectedFile(name);
  }

  async function deleteFile(name) {
    if (!confirm(`Delete ${name}?`)) return;

    await apiFetch(`/auth/hr/files?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
    });

    if (selectedFile === name) {
      setPreviewUrl("");
      setSelectedFile("");
    }

    await loadFiles(viewFolder);
  }

  const isPdf = selectedFile.toLowerCase().endsWith(".pdf");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold">HR Files</h1>

      {/* Upload Box */}
      <div className="rounded-2xl border p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold">New Upload</h2>

        <form onSubmit={submitUpload} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium">Category</label>
              <select
                value={uploadFolder}
                onChange={(e) => setUploadFolder(e.target.value)}
                className="w-full rounded-lg border px-4 py-3"
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

            {/* File Input */}
            <div>
              <label className="mb-2 block text-sm font-medium">File</label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
                >
                  {pendingFile ? "Change File" : "Choose File"}
                </button>

                <span className="truncate text-sm text-slate-600">
                  {pendingFile ? pendingFile.name : "No file chosen"}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          </div>

          {/* Selected file box */}
          {pendingFile && (
            <div className="flex justify-between rounded-lg border bg-slate-50 px-4 py-3 text-sm">
              <span>{pendingFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  setPendingFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={!pendingFile || submitting}
            className="rounded-lg bg-slate-900 px-5 py-3 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Uploading..." : "Submit Upload"}
          </button>
        </form>
      </div>

      {/* View Section */}
      <div className="mt-8 rounded-2xl border p-6 shadow-sm">
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-semibold">View Files</h2>

          <select
            value={viewFolder}
            onChange={(e) => {
              setViewFolder(e.target.value);
              loadFiles(e.target.value);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {folderOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {files.length === 0 ? (
          <div className="py-6 text-sm text-slate-500">
            No files found in this category.
          </div> 
        ) : (
          <div className="max-h-[250px] overflow-y-auto pr-2">
            {files.map((f) => (
              <div
                key={f.name}
                className="flex justify-between border-t py-2"
              >
                <span>{displayFileName(f.name)}</span>

                <div className="flex gap-4">
                  <button
                    onClick={() => viewFile(f.name)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View
                  </button>

                  <button
                    onClick={() => deleteFile(f.name)}
                    className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="mt-8 rounded-2xl border p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Preview</h2>

        {!previewUrl ? (
          <div className="flex h-[70vh] items-center justify-center text-sm text-slate-500">
            Select a file to preview
          </div>
        ) : isPdf ? (
          <iframe src={previewUrl} className="h-[70vh] w-full" />
        ) : (
          <video src={previewUrl} controls className="h-[70vh] w-full" />
        )}
      </div>
    </div>
  );
}