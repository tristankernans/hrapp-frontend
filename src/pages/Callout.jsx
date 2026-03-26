import { useEffect, useState } from "react";

const API_BASE = "http://localhost:3001";

export default function Callouts() {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [callouts, setCallouts] = useState([]);

  const [form, setForm] = useState({
    callout_date: "",
    manager_name: "",
    company_name: "",
    reason: "",
  });

  async function loadSites() {
    try {
      const res = await fetch(`${API_BASE}/api/my-sites`, {
        credentials: "include",
      });

      if (!res.ok) {
        setSites([]);
        setSelectedSite("");
        return;
      }

      const data = await res.json();
      const list = Array.isArray(data?.sites) ? data.sites : [];

      setSites(list);
      setSelectedSite((prev) => prev || list[0] || "");
    } catch (err) {
      console.error("loadSites error:", err);
      setSites([]);
      setSelectedSite("");
    }
  }

  async function loadCallouts(site) {
    if (!site) {
      setCallouts([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/callouts?site=${encodeURIComponent(site)}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        setCallouts([]);
        return;
      }

      const data = await res.json();
      setCallouts(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      console.error("loadCallouts error:", err);
      setCallouts([]);
    }
  }

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    if (selectedSite) loadCallouts(selectedSite);
    else setCallouts([]);
  }, [selectedSite]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSite) return;

    try {
      const res = await fetch(`${API_BASE}/api/callouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          site_code: selectedSite,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("submit failed:", res.status, text);
        return;
      }

      setForm({
        callout_date: "",
        manager_name: "",
        company_name: "",
        reason: "",
      });

      loadCallouts(selectedSite);
    } catch (err) {
      console.error("handleSubmit error:", err);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Service Callouts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Please log your callouts here.
        </p>
      </div>

      <div className="mt-8 rounded-xl border p-6">
        <h2 className="mb-4 text-sm font-semibold">New Callout</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">Site</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={sites.length === 0}
              required
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
          </div>

          <div>
            <label className="text-sm text-slate-600">Date</label>
            <input
              type="date"
              value={form.callout_date}
              onChange={(e) =>
                setForm({ ...form, callout_date: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Manager Name</label>
            <input
              type="text"
              value={form.manager_name}
              onChange={(e) =>
                setForm({ ...form, manager_name: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Company Called</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) =>
                setForm({ ...form, company_name: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-slate-600">Reason for Callout</label>
            <textarea
              rows="4"
              value={form.reason}
              onChange={(e) =>
                setForm({ ...form, reason: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="md:col-span-2">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={!selectedSite}
            >
              Submit Callout
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 rounded-xl border p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Callouts</h2>
          <span className="text-xs text-slate-500">
            {selectedSite ? `Site: ${selectedSite}` : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-700">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Manager</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Company</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Reason</th>
              </tr>
            </thead>
            <tbody>
              {callouts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No callouts for this site yet.
                  </td>
                </tr>
              ) : (
                callouts.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 align-top">
                       {new Date(c.callout_date).toLocaleDateString("en-IE")}
                    </td>
                    <td className="px-4 py-3 align-top">{c.manager_name}</td>
                    <td className="px-4 py-3 align-top">{c.company_name}</td>
                    <td className="px-4 py-3 align-top">{c.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}