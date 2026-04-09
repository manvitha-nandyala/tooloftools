import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { callToolViaMcp } from "../api/mcp";
import { getTool, validateToolInput } from "../api/tools";

type Tab = "schema" | "try" | "info";

const TAB_HELP: Record<Tab, string> = {
  schema: "Read-only JSON Schema: what callers may send and what the tool returns.",
  try: "Validate JSON locally, then run the same path as production MCP calls.",
  info: "Registry fields, endpoint, documentation link, and auth config snapshot.",
};

const MONACO_OPTS = {
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  fontSize: 13,
};

const readOnlyMonaco = { ...MONACO_OPTS, readOnly: true };

function McpToolCallout({ toolId }: { toolId: string }) {
  const [copied, setCopied] = useState(false);
  const copyId = useCallback(() => {
    void navigator.clipboard.writeText(toolId).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [toolId]);

  return (
    <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 to-violet-50/50 p-4 ring-1 ring-indigo-500/[0.08]">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900/70">MCP</p>
      <p className="mt-1 text-sm text-slate-700">
        <strong className="font-medium text-slate-900">Tool name</strong> for{" "}
        <code className="rounded bg-white/80 px-1 py-0.5 text-xs text-slate-800">list_tools</code> /{" "}
        <code className="rounded bg-white/80 px-1 py-0.5 text-xs text-slate-800">call_tool</code> is this registry id:
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <code className="min-w-0 flex-1 break-all rounded-lg border border-indigo-100 bg-white/90 px-3 py-2 text-xs text-slate-800">
          {toolId}
        </code>
        <button type="button" className="btn-secondary shrink-0 px-3 py-2 text-xs" onClick={copyId}>
          {copied ? "Copied" : "Copy id"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        See{" "}
        <Link className="text-link" to="/integrations/mcp">
          How to connect with MCP
        </Link>{" "}
        for SSE URLs, arguments, and response shape.
      </p>
    </div>
  );
}

export function ToolDetailPage() {
  const { toolId = "" } = useParams();
  const [tab, setTab] = useState<Tab>("schema");
  const [input, setInput] = useState('{\n  "x": "sample"\n}');
  const [validationResult, setValidationResult] = useState<string>("");
  const [executionResult, setExecutionResult] = useState<string>("");
  const [lastRequestPayload, setLastRequestPayload] = useState<string>("");

  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool", toolId],
    queryFn: () => getTool(toolId),
    enabled: Boolean(toolId),
  });

  async function runValidation() {
    try {
      const payload = JSON.parse(input);
      const result = await validateToolInput(toolId, payload);
      setValidationResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setValidationResult(String(err));
    }
  }

  async function executeTool() {
    try {
      const payload = JSON.parse(input);
      setLastRequestPayload(JSON.stringify(payload, null, 2));
      const result = await callToolViaMcp({ tool_id: toolId, arguments: payload });
      setExecutionResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setExecutionResult(String(err));
    }
  }

  if (isLoading) return <p className="text-sm text-slate-600">Loading tool…</p>;
  if (!tool) return <p className="text-sm text-slate-600">Tool not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{tool.name}</h1>
          <p className="text-sm text-slate-600">{tool.description}</p>
        </div>
        <Link className="btn-secondary shrink-0 self-start" to={`/tools/${tool.id}/edit`} title="Change tool definition and JSON configs">
          Edit
        </Link>
      </div>

      <McpToolCallout toolId={tool.id} />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tool views">
          {(["schema", "try", "info"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
                tab === t
                  ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500/40"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50"
              }`}
              title={TAB_HELP[t]}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">{TAB_HELP[tab]}</p>
      </div>

      {tab === "schema" ? (
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-indigo-500/[0.06]">
            <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50/50 px-4 py-2.5">
              <p className="text-sm font-medium text-indigo-950">Input schema</p>
              <p className="mt-2 text-[11px] leading-snug text-slate-600">Defines allowed arguments and validation rules for this tool.</p>
              <p className="mt-2 text-[11px] leading-snug text-slate-600">
                Callers must supply JSON matching this schema when invoking via MCP (SSE) or HTTP.
              </p>
            </div>
            <div className="mis-json-surface">
              <Editor
                height="300px"
                defaultLanguage="json"
                value={JSON.stringify(tool.input_schema, null, 2)}
                options={readOnlyMonaco}
              />
            </div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-indigo-500/[0.06]">
            <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50/50 px-4 py-2.5">
              <p className="text-sm font-medium text-indigo-950">Output schema</p>
              <p className="mt-2 text-[11px] leading-snug text-slate-600">Describes the shape of a successful response body.</p>
            </div>
            <div className="mis-json-surface">
              <Editor
                height="300px"
                defaultLanguage="json"
                value={JSON.stringify(tool.output_schema ?? {}, null, 2)}
                options={readOnlyMonaco}
              />
            </div>
          </div>
        </div>
      ) : null}

      {tab === "try" ? (
        <div className="space-y-4">
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-violet-500/[0.08]">
            <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50/50 px-4 py-2.5">
              <p className="text-sm font-medium text-indigo-950">Input JSON</p>
              <p className="mt-2 text-[11px] leading-snug text-slate-600">Edit the payload you want to validate or send to the gateway.</p>
            </div>
            <div className="mis-json-surface">
              <Editor
                height="220px"
                defaultLanguage="json"
                value={input}
                onChange={(v) => setInput(v ?? "{}")}
                options={MONACO_OPTS}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              title="Check JSON against the input schema without calling the downstream service"
              onClick={runValidation}
            >
              Validate input
            </button>
            <button
              type="button"
              className="btn-secondary"
              title="Invoke the tool via MCP with the JSON above"
              onClick={executeTool}
            >
              Execute tool
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Validation result</p>
            <pre className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
              {validationResult || "No validation run yet."}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Last request payload</p>
            <pre className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
              {lastRequestPayload || "No execution payload yet."}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Execution output</p>
            <pre className="max-h-64 overflow-auto rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs leading-relaxed text-slate-800">
              {executionResult || "No execution output yet."}
            </pre>
          </div>
        </div>
      ) : null}

      {tab === "info" ? (
        <div className="mis-panel space-y-4 p-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="font-medium text-slate-900">ID:</span>{" "}
              <span className="text-slate-700">{tool.id}</span>
            </p>
            <p>
              <span className="font-medium text-slate-900">Category:</span>{" "}
              <span className="text-slate-700">{tool.category}</span>
            </p>
            <p>
              <span className="font-medium text-slate-900">Version:</span>{" "}
              <span className="text-slate-700">{tool.version}</span>
            </p>
            <p>
              <span className="font-medium text-slate-900">Owner:</span>{" "}
              <span className="text-slate-700">{tool.owner ?? "—"}</span>
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-slate-900">Endpoint:</span>{" "}
              <span className="break-all text-slate-700">{tool.endpoint}</span>
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-slate-900">Docs:</span>{" "}
              <span className="break-all text-slate-700">{tool.documentation_url ?? "—"}</span>
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-800">Auth config</p>
            <pre className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              {JSON.stringify(tool.auth_config ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
