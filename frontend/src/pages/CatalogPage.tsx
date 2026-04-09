import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategories, listTools, searchTools } from "../api/tools";

export function CatalogPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const queryKey = useMemo(() => ["tools", page, query, category], [page, query, category]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => (query ? searchTools(query, { page, category: category || undefined }) : listTools({ page, category: category || undefined })),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tool Catalog</h1>
        <Link className="rounded bg-slate-900 px-3 py-2 text-sm text-white" to="/tools/new">Register Tool</Link>
      </div>
      <div className="flex gap-2">
        <input className="w-full rounded border p-2" placeholder="Search tools..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="rounded border p-2" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      {isLoading ? <p>Loading tools...</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {(data?.items ?? []).map((tool) => (
          <Link key={tool.id} to={`/tools/${tool.id}`} className="rounded border p-3 hover:bg-slate-50">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">{tool.name}</h3>
              <span className={`rounded px-2 py-1 text-xs ${tool.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{tool.active ? "active" : "inactive"}</span>
            </div>
            <p className="text-sm text-slate-600">{tool.description || "No description"}</p>
            <p className="mt-2 text-xs text-slate-500">{tool.category} • {tool.version}</p>
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>
          Page {data?.page ?? 1} / {data?.pages ?? 1}
        </span>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={Boolean(data && page >= data.pages)} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

