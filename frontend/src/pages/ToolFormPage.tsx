import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { createTool, getTool, updateTool } from "../api/tools";

export function ToolFormPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const { toolId = "" } = useParams();
  const isEdit = mode === "edit";
  const { data: tool } = useQuery({ queryKey: ["tool-form", toolId], queryFn: () => getTool(toolId), enabled: isEdit && Boolean(toolId) });

  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    category: "",
    version: "1.0.0",
    tool_type: "REST_API",
    endpoint: "",
    owner: "",
    documentation_url: "",
    tags: "",
    input_schema: '{\n  "type": "object",\n  "properties": {}\n}',
    output_schema: '{\n  "type": "object",\n  "properties": {}\n}',
    metadata: '{\n  "http_method": "POST"\n}',
    auth_config: '{\n  "type": "static_headers",\n  "static_headers": {\n    "x-mis-token": "",\n    "mis-client": "",\n    "Cookie": ""\n  }\n}',
    rate_limit: '{\n  "requests_per_minute": 60\n}',
  });
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!tool) return;
    setForm({
      id: tool.id,
      name: tool.name,
      description: tool.description ?? "",
      category: tool.category ?? "",
      version: tool.version,
      tool_type: tool.tool_type,
      endpoint: tool.endpoint ?? "",
      owner: tool.owner ?? "",
      documentation_url: tool.documentation_url ?? "",
      tags: (tool.tags ?? []).join(","),
      input_schema: JSON.stringify(tool.input_schema, null, 2),
      output_schema: JSON.stringify(tool.output_schema ?? {}, null, 2),
      metadata: JSON.stringify(tool.metadata ?? { http_method: "POST" }, null, 2),
      auth_config: JSON.stringify(tool.auth_config ?? { type: "static_headers", static_headers: {} }, null, 2),
      rate_limit: JSON.stringify(tool.rate_limit ?? { requests_per_minute: 60 }, null, 2),
    });
  }, [tool]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError("");
    try {
      const payload = {
        id: form.id,
        name: form.name,
        description: form.description,
        category: form.category,
        version: form.version,
        tool_type: form.tool_type,
        endpoint: form.endpoint,
        owner: form.owner || undefined,
        documentation_url: form.documentation_url || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        input_schema: JSON.parse(form.input_schema),
        output_schema: JSON.parse(form.output_schema),
        metadata: JSON.parse(form.metadata),
        auth_config: JSON.parse(form.auth_config),
        rate_limit: JSON.parse(form.rate_limit),
      };
      if (isEdit) {
        await updateTool(toolId, payload);
        navigate(`/tools/${toolId}`);
      } else {
        const created = await createTool(payload);
        navigate(`/tools/${created.id}`);
      }
    } catch (err) {
      setSubmitError(`Failed to save tool. Check JSON fields and values. ${String(err)}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-semibold">{isEdit ? "Edit Tool" : "Register Tool"}</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded border p-2" placeholder="Tool ID" value={form.id} disabled={isEdit} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} />
        <input className="rounded border p-2" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <input className="rounded border p-2" placeholder="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        <input className="rounded border p-2" placeholder="Version" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
        <input className="rounded border p-2" placeholder="Type" value={form.tool_type} onChange={(e) => setForm((f) => ({ ...f, tool_type: e.target.value }))} />
        <input className="rounded border p-2" placeholder="Endpoint" value={form.endpoint} onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))} />
        <input className="rounded border p-2" placeholder="Owner (optional)" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
        <input className="rounded border p-2" placeholder="Documentation URL (optional)" value={form.documentation_url} onChange={(e) => setForm((f) => ({ ...f, documentation_url: e.target.value }))} />
      </div>
      <textarea className="w-full rounded border p-2" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      <input className="w-full rounded border p-2" placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded border">
          <p className="border-b p-2 text-sm font-medium">Input Schema JSON</p>
          <Editor height="280px" defaultLanguage="json" value={form.input_schema} onChange={(v) => setForm((f) => ({ ...f, input_schema: v ?? "{}" }))} options={{ minimap: { enabled: false } }} />
        </div>
        <div className="rounded border">
          <p className="border-b p-2 text-sm font-medium">Output Schema JSON</p>
          <Editor height="280px" defaultLanguage="json" value={form.output_schema} onChange={(v) => setForm((f) => ({ ...f, output_schema: v ?? "{}" }))} options={{ minimap: { enabled: false } }} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border">
          <p className="border-b p-2 text-sm font-medium">Metadata JSON (eg: http_method)</p>
          <Editor
            height="220px"
            defaultLanguage="json"
            value={form.metadata}
            onChange={(v) => setForm((f) => ({ ...f, metadata: v ?? "{}" }))}
            options={{ minimap: { enabled: false } }}
          />
        </div>
        <div className="rounded border">
          <p className="border-b p-2 text-sm font-medium">Auth Config JSON (supports static headers)</p>
          <Editor
            height="220px"
            defaultLanguage="json"
            value={form.auth_config}
            onChange={(v) => setForm((f) => ({ ...f, auth_config: v ?? "{}" }))}
            options={{ minimap: { enabled: false } }}
          />
        </div>
        <div className="rounded border">
          <p className="border-b p-2 text-sm font-medium">Rate Limit JSON</p>
          <Editor
            height="220px"
            defaultLanguage="json"
            value={form.rate_limit}
            onChange={(v) => setForm((f) => ({ ...f, rate_limit: v ?? "{}" }))}
            options={{ minimap: { enabled: false } }}
          />
        </div>
      </div>
      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
      <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">
        {isEdit ? "Save Changes" : "Create Tool"}
      </button>
    </form>
  );
}

