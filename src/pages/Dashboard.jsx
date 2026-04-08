import { Link } from "react-router-dom";

const tiles = [
  { label: "HR", to: "/hr", icon: "👥" },
  { label: "REPORTS", to: "/reports", icon: "📊" },
  { label: "CVS", to: "/cvs", icon: "📄" },
  { label: "DELI WASTE", to: "/deliwaste", icon: "🗑️" },
  { label: "CALLOUT", to: "/callout", icon: "👷" },
  { label: "FORMS", to: "/forms", icon: "📋" },
  { label: "FRUIT & VEG", to: "/fruitveg", icon: "🍎" },
  { label: "BUTCHERY & DELI", to: "/butchery", icon: "🥩" },
  { label: "CHILLED", to: "/chilled", icon: "❄️"},
  { label: "DELI", to: "/deli", icon: "🍔"},
];

function Tile({ label, to, icon }) {
  return (
    <Link
      to={to}
      className="
        group flex flex-col items-center justify-center
        rounded-2xl px-6 py-7
        transition
        hover:bg-slate-50 hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-amber-300
      "
    >
      <div
        className="
          flex h-20 w-20 items-center justify-center
          rounded-2xl border border-slate-200
          bg-white text-4xl
          group-hover:scale-[1.03] transition
        "
      >
        {icon}
      </div>
      <div className="mt-3 text-sm font-semibold tracking-wide text-slate-700">
        {label}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-medium text-slate-700">
          Welcome to The Kernans Dashboard
        </h1>

        {/* gold line */}
        <div className="mt-3 h-[2px] w-full bg-red-400" />

        {/* grid */}
        <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {tiles.map((t) => (
            <Tile key={t.to} {...t} />
          ))}
        </div>

        {/* bottom gold line */}
        <div className="mt-10 h-[2px] w-full bg-red-400" />
      </div>
    </div>
  );
}