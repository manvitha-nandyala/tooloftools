import { useEffect, useId, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { createTool, getCategories, getTool, listTools, updateTool } from "../api/tools";
import { CurlImportSection } from "../components/tools/CurlImportSection";
import { FieldLabel } from "../components/ui/hint";
import type { CurlParsePatch } from "../lib/parse-curl";
import { emptyToolForm } from "../lib/tool-form-defaults";
import { cn } from "../lib/utils";

const MONACO_JSON_OPTS = {
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  fontSize: 13,
  padding: { top: 10, bottom: 10 },
};

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mis-panel p-6 md:p-7">
      <div className="border-b border-indigo-100/80 pb-4">
        <h2 className="mis-section-title">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p> : null}
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

function JsonEditorCard({
  label,
  hint,
  value,
  onChange,
  height,
  highlight,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string | undefined) => void;
  height: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-indigo-500/[0.06]",
        highlight && "outline outline-2 outline-offset-2 outline-amber-500"
      )}
    >
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50/50 px-4 py-2.5">
        <p className="text-sm font-medium text-indigo-950">{label}</p>
        {hint ? <p className="mt-1 text-[11px] leading-snug text-slate-600">{hint}</p> : null}
      </div>
      <div className="mis-json-surface">
        <Editor height={height} defaultLanguage="json" value={value} onChange={onChange} options={MONACO_JSON_OPTS} />
      </div>
    </div>
  );
}

export function ToolFormPage({ mode }: { mode: "create" | "edit" }) {
  const uid = useId();
  const navigate = useNavigate();
  const { toolId = "" } = useParams();
  const isEdit = mode === "edit";
  const { data: tool } = useQuery({
    queryKey: ["tool-form", toolId],
    queryFn: () => getTool(toolId),
    enabled: isEdit && Boolean(toolId),
  });

  const [form, setForm] = useState(() => emptyToolForm());
  const [submitError, setSubmitError] = useState("");
  /** After curl parse: highlight fields the user must complete */
  const [attentionKeys, setAttentionKeys] = useState<Set<string>>(() => new Set());
  /** Category: pick from API list or "Other" with free text */
  const [categoryIsOther, setCategoryIsOther] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: toolsForTags } = useQuery({
    queryKey: ["tools-tag-presets"],
    queryFn: () => listTools({ page: 1, size: 200 }),
  });

  const tagPresets = useMemo(() => {
    const s = new Set<string>();
    toolsForTags?.items?.forEach((t) => (t.tags ?? []).forEach((tag) => s.add(tag)));
    return [...s].sort();
  }, [toolsForTags]);

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
    setAttentionKeys(new Set());
    const c = tool.category ?? "";
    if (!c) {
      setCategoryIsOther(false);
    } else if (categories.length > 0) {
      setCategoryIsOther(!categories.includes(c));
    } else {
      setCategoryIsOther(false);
    }
  }, [tool, categories]);

  function mergeCurlPatch(patch: CurlParsePatch) {
    setForm((f) => ({ ...f, ...patch }));
    setAttentionKeys(new Set(["id", "name", "description", "category", "tags", "output_schema"]));
  }

  function clearAttention(key: string) {
    setAttentionKeys((prev) => {
      const n = new Set(prev);
      n.delete(key);
      return n;
    });
  }

  function attentionWrap(key: string, node: ReactNode) {
    return (
      <div className={cn(attentionKeys.has(key) && "rounded-xl ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50")}>
        {node}
      </div>
    );
  }


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
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
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

  const id = (s: string) => `${uid}-${s}`;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{isEdit ? "Edit Tool" : "Register Tool"}</h1>
        <p className="text-sm text-slate-600">
          Define identity, schemas, and JSON configs. Editors stay within the layout—no sideways scrolling.
        </p>
        <p className="text-xs text-slate-500">
          <strong className="font-medium text-slate-600">Tip:</strong> Invalid JSON in any editor will block save—use the hints under each block as a guide.
        </p>
      </div>

      {!isEdit ? <CurlImportSection onParsed={(patch) => mergeCurlPatch(patch)} /> : null}

      <FormSection
        title="Tool identity"
        description="Stable ID, how the gateway reaches the tool, and who owns it. Tool ID cannot change after creation."
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="block min-w-0">
            {attentionWrap(
              "id",
              <>
                <FieldLabel
                  htmlFor={id("tid")}
                  label="Tool ID"
                  hint="Unique id: lowercase alphanumerics, one dot, optional _ or - in the second part (e.g. team.myaction). Cannot be renamed later."
                />
                <input
                  id={id("tid")}
                  className="input-field"
                  placeholder="e.g. acme.myendpoint"
                  value={form.id}
                  disabled={isEdit}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, id: e.target.value }));
                    if (e.target.value.trim()) clearAttention("id");
                  }}
                />
              </>
            )}
          </div>
          <div className="block min-w-0">
            {attentionWrap(
              "name",
              <>
                <FieldLabel htmlFor={id("name")} label="Display name" hint="Human-readable name shown in the catalog and UI." />
                <input
                  id={id("name")}
                  className="input-field"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    if (e.target.value.trim()) clearAttention("name");
                  }}
                />
              </>
            )}
          </div>
          <div className="block min-w-0">
            {attentionWrap(
              "category",
              <>
                <FieldLabel
                  htmlFor={id("cat")}
                  label="Category"
                  hint="Groups tools in filters and reporting. Choose a list value or Other to type a new one."
                />
                <select
                  id={id("cat")}
                  className="input-field"
                  value={categoryIsOther ? "__other__" : form.category}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__other__") {
                      setCategoryIsOther(true);
                      setForm((f) => ({ ...f, category: "" }));
                    } else {
                      setCategoryIsOther(false);
                      setForm((f) => ({ ...f, category: v }));
                      if (v.trim()) clearAttention("category");
                    }
                  }}
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__other__">Other…</option>
                </select>
                {categoryIsOther ? (
                  <input
                    className="input-field mt-2"
                    placeholder="Type a new category name"
                    value={form.category}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, category: e.target.value }));
                      if (e.target.value.trim()) clearAttention("category");
                    }}
                  />
                ) : null}
              </>
            )}
          </div>
          <div className="block min-w-0">
            <FieldLabel htmlFor={id("ver")} label="Version" hint="Semantic version string for this registration." />
            <input
              id={id("ver")}
              className="input-field"
              placeholder="1.0.0"
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
            />
          </div>
          <div className="block min-w-0">
            <FieldLabel
              htmlFor={id("tt")}
              label="Tool type"
              hint="Usually REST_API for HTTP-backed tools. Must match what the gateway expects."
            />
            <input
              id={id("tt")}
              className="input-field"
              placeholder="REST_API"
              value={form.tool_type}
              onChange={(e) => setForm((f) => ({ ...f, tool_type: e.target.value }))}
            />
          </div>
          <div className="block min-w-0 sm:col-span-2">
            <FieldLabel
              htmlFor={id("ep")}
              label="Endpoint URL"
              hint="Full URL the platform calls (may include path placeholders like {id} if your gateway supports them)."
            />
            <input
              id={id("ep")}
              className="input-field"
              placeholder="https://..."
              value={form.endpoint}
              onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
            />
          </div>
          <div className="block min-w-0">
            <FieldLabel label="Owner" htmlFor={id("own")} optional hint="Team or person responsible for this tool." />
            <input
              id={id("own")}
              className="input-field"
              placeholder="Team or owner"
              value={form.owner}
              onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
            />
          </div>
          <div className="block min-w-0">
            <FieldLabel
              label="Documentation URL"
              htmlFor={id("doc")}
              optional
              hint="Link to external docs or runbooks for integrators."
            />
            <input
              id={id("doc")}
              className="input-field"
              placeholder="https://..."
              value={form.documentation_url}
              onChange={(e) => setForm((f) => ({ ...f, documentation_url: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-4 block min-w-0">
          {attentionWrap(
            "description",
            <>
              <FieldLabel htmlFor={id("desc")} label="Description" hint="Short summary shown on the catalog card and tool page." />
              <textarea
                id={id("desc")}
                className="input-field min-h-[100px] resize-y"
                placeholder="What does this tool do?"
                value={form.description}
                onChange={(e) => {
                  setForm((f) => ({ ...f, description: e.target.value }));
                  if (e.target.value.trim()) clearAttention("description");
                }}
              />
            </>
          )}
        </div>
        <div className="mt-4 block min-w-0">
          {attentionWrap(
            "tags",
            <>
              <FieldLabel
                htmlFor={id("tags")}
                label="Tags"
                hint="Pick from existing tags via suggestions, or type new ones (comma-separated)."
              />
              <input
                id={id("tags")}
                className="input-field"
                placeholder="e.g. payroll, read-only"
                value={form.tags}
                list={tagPresets.length ? id("tag-datalist") : undefined}
                onChange={(e) => {
                  setForm((f) => ({ ...f, tags: e.target.value }));
                  if (e.target.value.trim()) clearAttention("tags");
                }}
              />
              {tagPresets.length > 0 ? (
                <datalist id={id("tag-datalist")}>
                  {tagPresets.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              ) : null}
            </>
          )}
        </div>
      </FormSection>

      <FormSection
        title="Schemas"
        description="JSON Schema describing request bodies and responses. Used for validation and documentation."
      >
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <JsonEditorCard
            label="Input schema JSON"
            height="260px"
            value={form.input_schema}
            onChange={(v) => setForm((f) => ({ ...f, input_schema: v ?? "{}" }))}
            hint="Describe the shape of arguments callers may send (types, required fields, enums)."
          />
          <JsonEditorCard
            label="Output schema JSON"
            height="260px"
            value={form.output_schema}
            onChange={(v) => {
              setForm((f) => ({ ...f, output_schema: v ?? "{}" }));
              clearAttention("output_schema");
            }}
            hint="Response body shape (not inferred from curl). Define JSON Schema for what the API returns on success."
            highlight={attentionKeys.has("output_schema")}
          />
        </div>
      </FormSection>

      <FormSection
        title="Runtime & auth"
        description="How the gateway invokes downstream services: HTTP metadata, credentials, and throttling."
      >
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
          <JsonEditorCard
            label="Metadata JSON"
            height="220px"
            value={form.metadata}
            onChange={(v) => setForm((f) => ({ ...f, metadata: v ?? "{}" }))}
            hint="Often includes http_method (GET/POST) and other routing hints for REST tools."
          />
          <JsonEditorCard
            label="Auth config JSON"
            height="220px"
            value={form.auth_config}
            onChange={(v) => setForm((f) => ({ ...f, auth_config: v ?? "{}" }))}
            hint="e.g. static_headers for API keys or cookies merged into downstream requests."
          />
          <JsonEditorCard
            label="Rate limit JSON"
            height="220px"
            value={form.rate_limit}
            onChange={(v) => setForm((f) => ({ ...f, rate_limit: v ?? "{}" }))}
            hint="Limits requests per minute or similar—protects your endpoint from overload."
          />
        </div>
      </FormSection>

      {submitError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary px-8" type="submit" title={isEdit ? "Persist changes to this tool" : "Register and open the new tool"}>
          {isEdit ? "Save changes" : "Create tool"}
        </button>
      </div>
    </form>
  );
}
