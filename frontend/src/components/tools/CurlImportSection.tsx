import { useState } from "react";
import type { CurlParsePatch } from "../../lib/parse-curl";
import { parseCurlCommand } from "../../lib/parse-curl";

function hasSensitiveHeaders(authConfigJson: string): boolean {
  try {
    const o = JSON.parse(authConfigJson) as { static_headers?: Record<string, string> };
    const h = o.static_headers ?? {};
    for (const k of Object.keys(h)) {
      const lk = k.toLowerCase();
      if (
        lk === "authorization" ||
        lk === "cookie" ||
        lk.includes("token") ||
        lk.includes("secret") ||
        lk.includes("api-key") ||
        lk === "x-api-key"
      ) {
        return true;
      }
    }
  } catch {
    return true;
  }
  return false;
}

export type CurlParsedMeta = {
  placeholders: string[];
  warnings: string[];
  infos: string[];
};

type Props = {
  onParsed: (patch: CurlParsePatch, meta: CurlParsedMeta) => void;
};

export function CurlImportSection({ onParsed }: Props) {
  const [curlText, setCurlText] = useState("");
  const [parsedOk, setParsedOk] = useState<CurlParsedMeta | null>(null);
  const [parseErrors, setParseErrors] = useState<string[] | null>(null);
  const [showSecretBanner, setShowSecretBanner] = useState(false);

  function handleParse() {
    setParseErrors(null);
    setParsedOk(null);
    setShowSecretBanner(false);
    const r = parseCurlCommand(curlText);
    if (!r.ok) {
      setParseErrors(r.errors);
      return;
    }
    setShowSecretBanner(hasSensitiveHeaders(r.patch.auth_config ?? "{}"));
    onParsed(r.patch, {
      placeholders: r.placeholders,
      warnings: r.warnings,
      infos: r.infos,
    });
    setParsedOk({
      placeholders: r.placeholders,
      warnings: r.warnings,
      infos: r.infos,
    });
  }

  return (
    <section className="mis-panel p-6 md:p-7">
      <div className="border-b border-indigo-100/80 pb-4">
        <h2 className="mis-section-title">Import from curl</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Paste a curl command. We only fill <strong>endpoint</strong> (with GUIDs turned into {"{placeholders}"}),{" "}
          <strong>HTTP method</strong>, <strong>headers</strong> → auth config, and <strong>input schema</strong> from
          the body/query. You fill tool ID, name, description, category, tags, and output schema below.
        </p>
      </div>
      <div className="mt-5 space-y-4">
        <textarea
          className="input-field min-h-[100px] resize-y font-mono text-xs"
          placeholder={`curl -X POST https://api.example.com/v1/items -H "Authorization: Bearer …" -H "Content-Type: application/json" -d '{"name":"test"}'`}
          value={curlText}
          onChange={(e) => setCurlText(e.target.value)}
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={handleParse}>
            Parse curl
          </button>
        </div>

        {parseErrors ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-medium">Could not parse</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {parseErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {parsedOk && showSecretBanner ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <strong>Credentials in headers:</strong> Authorization, cookies, or API keys were copied into auth config.
            Treat this registration like a secret; rotate keys if this screen is shared.
          </div>
        ) : null}

        {parsedOk && parsedOk.warnings.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Warnings</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {parsedOk.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {parsedOk && parsedOk.infos.length > 0 ? (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-950">
            <p className="font-medium">Notes</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {parsedOk.infos.map((info) => (
                <li key={info}>{info}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {parsedOk && parsedOk.placeholders.length > 0 ? (
          <p className="text-xs text-slate-600">
            Path placeholders:{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">
              {parsedOk.placeholders.map((p) => `{${p}}`).join(", ")}
            </code>{" "}
            — rename in the endpoint URL and input schema to match your MCP argument names (e.g.{" "}
            <code className="rounded bg-slate-100 px-1">{"{employee_guid}"}</code>).
          </p>
        ) : null}

        {parsedOk ? (
          <p className="text-sm font-medium text-emerald-800">Parsed fields were applied to the form.</p>
        ) : null}
      </div>
    </section>
  );
}
