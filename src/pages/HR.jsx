import React, { useEffect, useMemo, useState } from "react";

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
      { value: "", label: "All folders" },
      { value: "handbooks", label: "Handbooks" },
      { value: "training", label: "Training" },
      { value: "policies", label: "Policies" },
      { value: "forms", label: "Forms" },
      { value: "cvs", label: "CVs" },
    ],
    []
  );

  const [selectedFolder, setSelectedFolder] = useState("");
  const [files, setFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [error, setError] = useState("");

  const displayFileName = (fullName) => {
    const base = String(fullName || "").split("/").pop() || "";
    const noExt = base.replace(/\.[^/.]+$/, "");
    return noExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  };

  async function loadFiles(prefix = selectedFolder) {
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
    loadFiles(selectedFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError("");

      const folderToUse = selectedFolder === "" ? "" : selectedFolder;

      const sasData = await apiFetch("/auth/hr/files/sas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder: folderToUse,
        }),
      });

      const { uploadUrl } = sasData;

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!putRes.ok) {
        alert("Upload failed. Check console/network for details.");
        return;
      }

      await loadFiles(selectedFolder);
      e.target.value = "";
    } catch (err) {
      alert(err.message || "Upload failed. Check console/network for details.");
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

      await loadFiles(selectedFolder);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  const isPdf = selectedFile.toLowerCase().endsWith(".pdf");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">HR Resources</h1>

        <div className="flex items-center gap-3">
          <select
            value={selectedFolder}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedFolder(v);
              loadFiles(v);
              setPreviewUrl("");
              setSelectedFile("");
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {folderOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            Upload file
            <input type="file" hidden onChange={uploadFile} />
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6">
        <div className="rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Files</h2>
            <span className="text-xs text-slate-500">
              {selectedFolder ? `Folder: ${selectedFolder}` : "All folders"}
            </span>
          </div>

          {files.length === 0 ? (
            <div className="py-6 text-sm text-slate-500">
              No files found in this folder.
            </div>
          ) : (
            <div className={files.length > 4 ? "max-h-[360px] overflow-y-auto pr-2" : ""}>
              {files.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center justify-between gap-3 border-t py-2 first:border-t-0"
                >
                  <span className="truncate text-sm">{displayFileName(f.name)}</span>

                  <div className="flex shrink-0 gap-3">
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

        <div className="rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-semibold">Preview</h2>

          {!previewUrl ? (
            <div className="flex h-[75vh] items-center justify-center text-sm text-slate-500">
              Select a file to preview
            </div>
          ) : isPdf ? (
            <iframe
              src={previewUrl}
              className="h-[75vh] w-full rounded"
              title="PDF Preview"
            />
          ) : (
            <video
              src={previewUrl}
              controls
              className="h-[75vh] w-full rounded bg-black object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}