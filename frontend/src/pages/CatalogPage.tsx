import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategories, listTools, searchTools } from "../api/tools";
import { FieldLabel } from "../components/ui/hint";

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
        title="This tool is enabled for invocation through the gateway"
      >
        Active
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10"
      title="This tool is registered but not currently callable"
    >
      Inactive
    </span>
  );
}

export function CatalogPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const queryKey = useMemo(() => ["tools", page, query, category], [page, query, category]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      query
        ? searchTools(query, { page, category: category || undefined })
        : listTools({ page, category: category || undefined }),
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tool catalog</h1>
          <p className="text-sm text-slate-600">
            Browse and search tools registered on <span className="font-medium text-indigo-700">MIS Grid</span>.
          </p>
          <p className="text-xs text-slate-500">
            Use search for name or description; category narrows the list. Click a card to open schemas, try-it, and details.
          </p>
        </div>
        <Link className="btn-primary shrink-0" to="/tools/new" title="Register a new tool definition">
          Register Tool
        </Link>
      </div>

      <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 px-4 py-3 text-sm text-slate-700 ring-1 ring-violet-500/[0.06]">
        <span className="font-medium text-violet-950">MCP:</span> connect external clients using SSE URLs and tool ids—read the{" "}
        <Link className="text-link" to="/integrations/mcp">
          MCP integration guide
        </Link>
        .
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-900/60">Filters</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl flex-1">
            <FieldLabel
              htmlFor="catalog-search"
              label="Search"
              hint="Matches tool name and description text. Results update as you type."
            />
            <input
              id="catalog-search"
              className="input-field w-full"
              placeholder="Search tools..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:max-w-xs sm:shrink-0">
            <FieldLabel
              htmlFor="catalog-category"
              label="Category"
              hint="Limit results to a single category from your registry."
            />
            <select
              id="catalog-category"
              className="input-field w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {(categories ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading tools…</p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        {(data?.items ?? []).map((tool) => (
          <Link
            key={tool.id}
            to={`/tools/${tool.id}`}
            className="group block rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-white via-white to-indigo-50/40 p-6 shadow-sm ring-1 ring-indigo-500/[0.06] transition-all hover:border-indigo-200 hover:shadow-md hover:ring-indigo-500/15"
            title={`Open ${tool.name}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-950">{tool.name}</h3>
              <StatusBadge active={tool.active} />
            </div>
            <p className="text-sm leading-relaxed text-slate-600">{tool.description || "No description"}</p>
            <p className="mt-4 text-xs font-medium text-slate-400">
              {tool.category} · v{tool.version}
            </p>
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-slate-500">
          Page {data?.page ?? 1} of {data?.pages ?? 1}
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-secondary px-5 py-2"
            disabled={page <= 1}
            title="Go to the previous page of results"
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn-secondary px-5 py-2"
            disabled={Boolean(data && page >= data.pages)}
            title="Go to the next page of results"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
