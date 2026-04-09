import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-900/60">{label}</p>
        <code className="mt-1 block break-all text-xs text-slate-800">{value}</code>
      </div>
      <button type="button" className="btn-secondary shrink-0 px-3 py-1.5 text-xs" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function McpGuidePage() {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const sseUrl = origin ? `${origin}/mcp/sse` : "";
  const messagesUrl = origin ? `${origin}/mcp/messages/` : "";

  const cursorExample = origin
    ? `{
  "mcpServers": {
    "mis-grid": {
      "url": "${origin}/mcp/sse"
    }
  }
}`
    : "";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">MCP integration</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          This deployment exposes a{" "}
          <span className="font-medium text-slate-800">Model Context Protocol</span> server over SSE and an
          authenticated HTTP gateway. Both paths invoke the same tool registry and{" "}
          <span className="font-medium text-slate-800">invocation gateway</span> as production.
        </p>
      </div>

      <section className="mis-panel space-y-4 p-6">
        <h2 className="text-sm font-semibold text-indigo-950">SSE transport (external MCP clients)</h2>
        <p className="text-sm text-slate-600">
          Point an MCP-compatible client at these URLs on <strong>this</strong> origin. Replace the host when you use a
          custom domain or Railway URL.
        </p>
        {origin ? (
          <div className="space-y-3">
            <CopyRow label="SSE (GET)" value={sseUrl} />
            <CopyRow label="Messages (POST)" value={messagesUrl} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading URLs…</p>
        )}
        <p className="text-xs leading-relaxed text-slate-500">
          Exact client configuration depends on your app (Cursor, Claude Desktop, etc.). Consult your client&apos;s MCP
          docs for where to paste the SSE URL. The message endpoint is used by the MCP SDK for follow-up requests after
          the SSE session starts.
        </p>
      </section>

      <section className="mis-panel space-y-4 p-6">
        <h2 className="text-sm font-semibold text-indigo-950">Tool names and arguments</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-slate-600">
          <li>
            <strong className="font-medium text-slate-800">MCP tool name</strong> is the registry{" "}
            <strong className="font-medium text-slate-800">tool id</strong> (UUID), not the display name. Find it on any
            tool&apos;s <Link className="text-link" to="/catalog">catalog</Link> → detail page → <strong>Info</strong>{" "}
            tab, or in the MCP callout at the top of the detail view.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Arguments</strong> must satisfy the tool&apos;s{" "}
            <strong>input schema</strong> (JSON Schema) on the <strong>Schema</strong> tab.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Output</strong> is documented by the <strong>output schema</strong>.
            Through MCP, successful results are returned as MCP <strong>text</strong> content whose body is JSON from the
            gateway (same shape as the HTTP API response body).
          </li>
        </ul>
      </section>

      <section className="mis-panel space-y-4 p-6">
        <h2 className="text-sm font-semibold text-indigo-950">Two ways to invoke tools</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/70">SSE MCP</p>
            <p className="mt-2 text-sm text-slate-600">
              Use the URLs above with an MCP client. <code className="text-xs text-slate-800">list_tools</code> returns
              active tools; <code className="text-xs text-slate-800">call_tool</code> uses the registry id as{" "}
              <code className="text-xs text-slate-800">name</code>.
            </p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900/70">Browser (HTTP)</p>
            <p className="mt-2 text-sm text-slate-600">
              <Link className="text-link" to="/playground">Playground</Link> and each tool&apos;s{" "}
              <strong>Try</strong> tab call <code className="text-xs text-slate-800">POST /api/v1/mcp/call</code> with
              your session. You must be logged in; this is not the raw SSE transport.
            </p>
          </div>
        </div>
      </section>

      <section className="mis-panel space-y-3 p-6">
        <h2 className="text-sm font-semibold text-indigo-950">Example client config (illustrative)</h2>
        <p className="text-xs text-slate-500">
          Shapes vary by client version—adjust keys to match your editor&apos;s MCP documentation.
        </p>
        {origin ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4">
            <pre className="text-xs leading-relaxed text-emerald-100">{cursorExample}</pre>
          </div>
        ) : null}
      </section>

      <p className="text-xs leading-relaxed text-slate-500">
        The SSE MCP endpoint is reachable without a browser session. If you need network restrictions or auth on MCP
        traffic, plan that at the edge or in the API layer—contact your platform admin for production policy.
      </p>
    </div>
  );
}
