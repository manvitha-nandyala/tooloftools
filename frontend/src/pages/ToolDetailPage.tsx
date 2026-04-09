import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { callToolViaMcp } from "../api/mcp";
import { getTool, validateToolInput } from "../api/tools";

type Tab = "schema" | "try" | "info";

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

  if (isLoading) return <p>Loading tool...</p>;
  if (!tool) return <p>Tool not found.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{tool.name}</h1>
          <p className="text-sm text-slate-600">{tool.description}</p>
        </div>
        <Link className="rounded border px-3 py-2 text-sm" to={`/tools/${tool.id}/edit`}>
          Edit
        </Link>
      </div>
      <div className="flex gap-2">
        {(["schema", "try", "info"] as const).map((t) => (
          <button key={t} className={`rounded px-3 py-2 text-sm ${tab === t ? "bg-slate-900 text-white" : "border"}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "schema" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded border">
            <p className="border-b p-2 text-sm font-medium">Input Schema</p>
            <Editor height="320px" defaultLanguage="json" value={JSON.stringify(tool.input_schema, null, 2)} options={{ readOnly: true, minimap: { enabled: false } }} />
          </div>
          <div className="rounded border">
            <p className="border-b p-2 text-sm font-medium">Output Schema</p>
            <Editor height="320px" defaultLanguage="json" value={JSON.stringify(tool.output_schema ?? {}, null, 2)} options={{ readOnly: true, minimap: { enabled: false } }} />
          </div>
        </div>
      ) : null}
      {tab === "try" ? (
        <div className="space-y-3">
          <Editor height="260px" defaultLanguage="json" value={input} onChange={(v) => setInput(v ?? "{}")} options={{ minimap: { enabled: false } }} />
          <div className="flex gap-2">
            <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={runValidation}>
              Validate Input
            </button>
            <button className="rounded border px-3 py-2 text-sm" onClick={executeTool}>
              Execute Tool
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Validation Result</p>
            <pre className="overflow-auto rounded bg-slate-100 p-3 text-xs">{validationResult || "No validation run yet."}</pre>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Last Request Payload</p>
            <pre className="overflow-auto rounded bg-slate-100 p-3 text-xs">{lastRequestPayload || "No execution payload yet."}</pre>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Execution Output</p>
            <pre className="overflow-auto rounded bg-slate-100 p-3 text-xs">{executionResult || "No execution output yet."}</pre>
          </div>
        </div>
      ) : null}
      {tab === "info" ? (
        <div className="grid gap-2 text-sm">
          <p><span className="font-medium">ID:</span> {tool.id}</p>
          <p><span className="font-medium">Category:</span> {tool.category}</p>
          <p><span className="font-medium">Version:</span> {tool.version}</p>
          <p><span className="font-medium">Owner:</span> {tool.owner}</p>
          <p><span className="font-medium">Endpoint:</span> {tool.endpoint}</p>
          <p><span className="font-medium">Docs:</span> {tool.documentation_url}</p>
          <pre className="overflow-auto rounded bg-slate-100 p-3 text-xs">{JSON.stringify(tool.auth_config ?? {}, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}

