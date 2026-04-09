import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";

const navItems: { to: string; label: string; description: string }[] = [
  { to: "/catalog", label: "Catalog", description: "Browse and search registered tools" },
  { to: "/tools/new", label: "Register", description: "Create a new tool definition" },
  {
    to: "/integrations/mcp",
    label: "MCP guide",
    description: "Connect MCP clients (SSE URLs, tool names, arguments, responses)",
  },
  {
    to: "/playground",
    label: "Playground",
    description: "Call tools via the authenticated HTTP API (same gateway as MCP, not raw SSE)",
  },
  { to: "/metrics", label: "Metrics", description: "Usage and invocation statistics" },
  { to: "/admin", label: "Admin", description: "Users and API keys" },
];

function navClassName({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-2 py-2 text-[13px] font-medium leading-tight transition-colors ${
    isActive
      ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/40"
      : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-950"
  }`;
}

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="mis-shell min-h-screen">
      <header className="sticky top-0 z-10 border-b border-indigo-200/40 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/catalog" className="group flex items-baseline gap-1.5 text-lg font-bold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">MIS</span>
            <span className="text-slate-800 transition group-hover:text-indigo-950">Grid</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.username}</span>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-sm"
              onClick={logout}
              title="End your session and return to login"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-[11rem_1fr]">
        <aside className="md:sticky md:top-28 md:h-fit">
          <div className="mis-panel p-2">
            <p className="mis-section-title px-1.5 pb-2 pt-0.5">Menu</p>
            <p className="mb-2 px-1.5 text-[11px] leading-snug text-slate-500">Jump to a workspace area.</p>
            <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navClassName}
                  title={item.description}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>
        <main className="mis-panel min-h-[min(70vh,720px)] p-8 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
