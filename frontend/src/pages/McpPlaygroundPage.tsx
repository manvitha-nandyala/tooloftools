import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { callToolViaMcp } from "../api/mcp";
import { listTools } from "../api/tools";

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">MCP Playground</h1>
      <select className="w-full rounded border p-2" value={toolId} onChange={(e) => setToolId(e.target.value)}>
        <option value="">Select a tool</option>
        {(data?.items ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            {t.id}
          </option>
        ))}
      </select>
      <Editor height="260px" defaultLanguage="json" value={args} onChange={(v) => setArgs(v ?? "{}")} options={{ minimap: { enabled: false } }} />
      <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" onClick={run} disabled={loading}>
        {loading ? "Calling..." : "Call Tool"}
      </button>
      <pre className="overflow-auto rounded bg-slate-100 p-3 text-xs">{result}</pre>
    </div>
  );
}

