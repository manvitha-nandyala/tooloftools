import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { callToolViaMcp } from "../api/mcp";
import { listTools } from "../api/tools";
import { FieldLabel } from "../components/ui/hint";

const MONACO_OPTS = {
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  fontSize: 13,
  padding: { top: 8, bottom: 8 },
};

export function McpPlaygroundPage() {
  const { data } = useQuery({ queryKey: ["tools-playground"], queryFn: () => listTools({ page: 1, size: 100 }) });
  const [toolId, setToolId] = useState("");
  const [args, setArgs] = useState('{\n  "x": "value"\n}');
  const [result, setResult] = useState("No calls yet.");
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!toolId) return;
    setLoading(true);
    try {
      const parsed = JSON.parse(args);
      const response = await callToolViaMcp({ tool_id: toolId, arguments: parsed });
      setResult(JSON.stringify(response, null, 2));
    } catch (err) {
      setResult(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">MCP Playground</h1>
        <p className="text-sm text-slate-600">
          Exercise the same MCP call path the platform uses—handy for debugging auth, payloads, and responses.
        </p>
        <p className="text-xs text-slate-500">
          Select a tool, edit JSON on the left, then call. The right panel shows the raw gateway response (including errors).
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <FieldLabel
            htmlFor="playground-tool"
            label="Tool"
            hint="Only tools you can see in the catalog appear here. Pick one to address the MCP request."
          />
          <select id="playground-tool" className="input-field" value={toolId} onChange={(e) => setToolId(e.target.value)}>
            <option value="">Select a tool</option>
            {(data?.items ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.id})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn-primary w-full shrink-0 sm:w-auto sm:min-w-[140px]"
          onClick={run}
          disabled={loading || !toolId}
          title={!toolId ? "Choose a tool first" : "Send arguments through the MCP gateway"}
        >
          {loading ? "Calling…" : "Call tool"}
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-indigo-100/90 bg-white shadow-sm ring-1 ring-indigo-500/[0.06]">
          <div className="shrink-0 border-b border-indigo-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-indigo-950">Arguments (JSON)</h2>
            <p className="text-xs text-slate-600">Must be valid JSON. Should match the tool&apos;s input schema when possible.</p>
          </div>
          <div className="mis-json-surface min-h-0 flex-1">
            <Editor height="220px" defaultLanguage="json" value={args} onChange={(v) => setArgs(v ?? "{}")} options={MONACO_OPTS} />
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-emerald-100/90 bg-white shadow-sm ring-1 ring-emerald-500/[0.08]">
          <div className="shrink-0 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50/80 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-emerald-950">Response</h2>
            <p className="text-xs text-slate-600">Pretty-printed JSON or error text from the gateway.</p>
          </div>
          <pre className="min-h-[220px] flex-1 overflow-auto whitespace-pre-wrap break-words bg-slate-50/80 p-4 font-mono text-xs leading-relaxed text-slate-800">
            {result}
          </pre>
        </div>
      </div>
    </div>
  );
}
