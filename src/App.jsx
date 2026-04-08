import React from "react";
import logo from "./assets/logo.png";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import AuthProvider, { RequireAuth, useAuth } from "./Auth.jsx";
import Login from "./Login.jsx";

// ✅ import the pages you create
import Dashboard from "./pages/Dashboard.jsx";
import HR from "./pages/HR.jsx";
import Reports from "./pages/Reports.jsx";
import CVs from "./pages/CVs.jsx";
import DeliWaste from "./pages/DeliWaste.jsx";
import Callout from "./pages/Callout.jsx";
import Forms from "./pages/Forms.jsx";
import FruitAndVeg from "./pages/FruitAndVeg.jsx";
import Butchery from "./pages/Butchery.jsx";
import Chilled from "./pages/Chilled.jsx";
import Deli from "./pages/Deli.jsx";

function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="bg-white">
      {/* Top bar */}
      <div className="border-b border-slate-200 px-4 py-3">
  <div className="grid grid-cols-3 items-center">
    {/* LEFT */}
    <div className="flex items-center">
      <img src={logo} alt="Kernans" className="h-8 w-8" />
    </div>

    {/* CENTER */}
    <div className="flex justify-center">
      <Link
        to="/"
        className="text-sm font-medium text-slate-700 hover:text-slate-900"
      >
        Home
      </Link>
    </div>

    {/* RIGHT */}
    <div className="flex items-center justify-end gap-3">
      <span className="text-sm text-slate-600">
        {user?.displayName || user?.email}
      </span>

      <button
        onClick={logout}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
      >
        Logout
      </button>
    </div>
  </div>
</div>

      {/* Page content */}
      <div className="p-6">
        <Routes>
          {/* ✅ Dashboard tiles page */}
          <Route path="/" element={<Dashboard />} />

          {/* ✅ Sections */}
          <Route path="/hr" element={<HR />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/cvs" element={<CVs />} />
          <Route path="/deliwaste" element={<DeliWaste />} />
          <Route path="/callout" element={<Callout />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/fruitveg" element={<FruitAndVeg />} />
          <Route path="/butchery" element={<Butchery />} />
          <Route path="/deli" element={<Deli />} />
          <Route path="/chilled" element={<Chilled />} />

          {/* ✅ Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Everything else requires auth */}
          <Route
            path="/*"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}