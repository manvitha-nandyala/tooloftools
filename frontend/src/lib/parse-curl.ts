import type { ToolFormState } from "./tool-form-defaults";

/** Only keys the parser is allowed to set — identity fields are user-owned */
export type CurlParsePatch = Partial<
  Pick<ToolFormState, "endpoint" | "metadata" | "auth_config" | "input_schema">
>;

export type ParseCurlResult =
  | {
      ok: true;
      patch: CurlParsePatch;
      warnings: string[];
      infos: string[];
      /** Path placeholder names (e.g. dynamic_1) — show hint to rename to MCP arg names */
      placeholders: string[];
    }
  | {
      ok: false;
      errors: string[];
    };

const TOOL_ID_RE = /^[a-z0-9]+\.[a-z0-9_-]+$/;

/** UUID (incl. Microsoft GUID), ObjectId-style hex, 32-hex, or long numeric id */
export function isDynamicPathSegment(seg: string): boolean {
  if (!seg) return false;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)
  ) {
    return true;
  }
  if (/^[0-9a-f]{24}$/i.test(seg)) return true;
  if (/^[0-9a-f]{32}$/i.test(seg)) return true;
  if (/^\d{12,}$/.test(seg)) return true;
  return false;
}

/**
 * Replace dynamic path segments with {dynamic_1}, {dynamic_2}, … for gateway substitution.
 */
export function templatizeEndpoint(url: URL): { href: string; placeholders: string[] } {
  const segs = url.pathname.split("/").filter(Boolean);
  const placeholders: string[] = [];
  let n = 0;
  const newSegs = segs.map((seg) => {
    if (isDynamicPathSegment(seg)) {
      n += 1;
      const name = `dynamic_${n}`;
      placeholders.push(name);
      return `{${name}}`;
    }
    return seg;
  });
  const path = newSegs.length ? `/${newSegs.join("/")}` : "/";
  // Build href without encoding `{` `}` — URL.toString() would percent-encode and break gateway placeholders
  const href = `${url.origin}${path}${url.search}${url.hash}`;
  return { href, placeholders };
}

export function isValidToolId(id: string): boolean {
  return TOOL_ID_RE.test(id);
}

/** Infer JSON Schema from a JSON value (minimal, for MCP validation). */
export function jsonValueToSchema(value: unknown): Record<string, unknown> {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array", items: {} };
    return { type: "array", items: jsonValueToSchema(value[0]) as Record<string, unknown> };
  }
  const t = typeof value;
  if (t === "string") return { type: "string" };
  if (t === "number") return { type: "number" };
  if (t === "boolean") return { type: "boolean" };
  if (t === "object" && value !== null) {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      props[k] = jsonValueToSchema(v);
    }
    return { type: "object", properties: props };
  }
  return { type: "object", properties: {} };
}

function queryStringToSchema(searchParams: URLSearchParams): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  searchParams.forEach((_v, k) => {
    props[k] = { type: "string", description: "Query parameter" };
  });
  return {
    type: "object",
    properties: props,
    description: "Arguments map to query string for GET requests",
  };
}

function mergeObjectSchemaWithPlaceholders(
  base: Record<string, unknown>,
  placeholderNames: string[]
): Record<string, unknown> {
  const props = {
    ...((base.properties as Record<string, unknown> | undefined) ?? {}),
  };
  for (const name of placeholderNames) {
    if (props[name] === undefined) {
      props[name] = {
        type: "string",
        description:
          "Path placeholder — rename in the endpoint URL and here to match MCP argument names (e.g. employee_guid).",
      };
    }
  }
  return { ...base, type: "object", properties: props };
}

/** Split a command line respecting single and double quotes */
export function splitShellArgs(line: string): string[] {
  const args: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) {
        quote = null;
        continue;
      }
      cur += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur.length) {
        args.push(cur);
        cur = "";
      }
      continue;
    }
    cur += c;
  }
  if (cur.length) args.push(cur);
  return args;
}

function normalizeCurlInput(raw: string): string {
  let s = raw.trim();
  if (!s.toLowerCase().startsWith("curl")) {
    return s;
  }
  s = s.replace(/^curl\s+/i, "");
  s = s.replace(/\\\r?\n/g, " ");
  return s.trim();
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

type ParsedFlags = {
  method: string | null;
  headers: Record<string, string>;
  dataChunks: string[];
  url: string | null;
  getFlag: boolean;
};

function parseFlags(args: string[]): ParsedFlags {
  const headers: Record<string, string> = {};
  const dataChunks: string[] = [];
  let method: string | null = null;
  let url: string | null = null;
  let getFlag = false;
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    const lower = a.toLowerCase();
    if (lower === "-x" || lower === "--request") {
      method = (args[i + 1] ?? "GET").toUpperCase();
      i += 2;
      continue;
    }
    if (lower === "-h" || lower === "--header") {
      const rawH = args[i + 1] ?? "";
      const idx = rawH.indexOf(":");
      if (idx > 0) {
        const name = rawH.slice(0, idx).trim();
        const val = rawH.slice(idx + 1).trim();
        headers[name] = val;
      }
      i += 2;
      continue;
    }
    if (
      lower === "-d" ||
      lower === "--data" ||
      lower === "--data-raw" ||
      lower === "--data-binary" ||
      lower === "--data-urlencode"
    ) {
      dataChunks.push(args[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (lower === "--url") {
      url = args[i + 1] ?? null;
      i += 2;
      continue;
    }
    if (lower === "-g" || lower === "--get") {
      getFlag = true;
      i += 1;
      continue;
    }
    if (looksLikeUrl(a)) {
      url = a;
      i += 1;
      continue;
    }
    i += 1;
  }
  return { method, headers, dataChunks, url, getFlag };
}

function mergeDataChunks(chunks: string[], warnings: string[]): string {
  if (chunks.length === 0) return "";
  if (chunks.length > 1) {
    warnings.push("Multiple -d/--data chunks were merged; form-encoded or repeated bodies may need manual cleanup.");
  }
  return chunks.join("&");
}

/**
 * Parse a curl command into a partial patch (endpoint, metadata, auth_config, input_schema only).
 * Does not set id, name, description, category, tags, output_schema, rate_limit, tool_type.
 */
export function parseCurlCommand(raw: string): ParseCurlResult {
  const warnings: string[] = [];
  const infos: string[] = [];

  const normalized = normalizeCurlInput(raw);
  if (!normalized.length) {
    return { ok: false, errors: ["Paste a curl command first."] };
  }

  const args = splitShellArgs(normalized);
  if (args.length === 0) {
    return { ok: false, errors: ["Could not parse any arguments from the input."] };
  }

  const flags = parseFlags(args);
  const endpointStr = flags.url;

  if (!endpointStr) {
    return { ok: false, errors: ["No URL found. Include an https:// URL or use --url."] };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(endpointStr);
  } catch {
    return { ok: false, errors: ["The URL is not valid."] };
  }

  if (!/^https?:$/i.test(parsedUrl.protocol)) {
    return { ok: false, errors: ["Only http and https URLs are supported."] };
  }

  const { href: templatedHref, placeholders } = templatizeEndpoint(parsedUrl);
  if (placeholders.length > 0) {
    infos.push(
      `Replaced ${placeholders.length} dynamic path segment(s) with {${placeholders[0]}}… Rename these in the URL and input schema to match your MCP arguments.`
    );
  }

  const bodyRaw = mergeDataChunks(flags.dataChunks, warnings);
  let method = flags.method;
  if (flags.getFlag) {
    method = "GET";
  }
  if (!method) {
    if (bodyRaw.length > 0) {
      method = "POST";
      warnings.push("HTTP method not specified (-X); assumed POST because a request body was provided.");
    } else {
      method = "GET";
      infos.push("HTTP method not specified (-X); assumed GET (no body).");
    }
  }

  method = method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    warnings.push(`Method ${method} is not used by the gateway; metadata will use ${method} but invocation may fail—use GET or POST.`);
  }

  const contentType = Object.entries(flags.headers).find(
    ([k]) => k.toLowerCase() === "content-type"
  )?.[1];

  let inputSchemaObj: Record<string, unknown> = {
    type: "object",
    properties: {},
  };

  if (method === "GET" && parsedUrl.search.length > 1) {
    const sp = new URLSearchParams(parsedUrl.search);
    if ([...sp.keys()].length > 0) {
      inputSchemaObj = queryStringToSchema(sp);
      infos.push("GET with query string: input schema includes query parameter names.");
    }
  }

  if (bodyRaw.length > 0) {
    const trimmed = bodyRaw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        inputSchemaObj = jsonValueToSchema(parsed) as Record<string, unknown>;
        if (Array.isArray(parsed)) {
          warnings.push("JSON body is an array; path placeholders were merged into a wrapper—verify input schema.");
        }
      } catch {
        return {
          ok: false,
          errors: [
            "Request body looks like JSON but failed to parse. Fix the JSON in the curl or remove the -d payload and try again.",
          ],
        };
      }
    } else if (contentType?.includes("application/x-www-form-urlencoded")) {
      warnings.push("Form URL-encoded body: could not infer JSON Schema; using empty object schema—edit manually if needed.");
    } else {
      warnings.push("Non-JSON body: using minimal object input schema—edit manually to match your API.");
    }
  }

  inputSchemaObj = mergeObjectSchemaWithPlaceholders(inputSchemaObj, placeholders);

  const staticHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(flags.headers)) {
    const lk = k.toLowerCase();
    if (lk === "host") {
      warnings.push("Ignored Host header (the gateway sets host from the endpoint URL).");
      continue;
    }
    if (lk === "content-type") {
      infos.push(
        "Content-Type was copied into static headers; the gateway also sets JSON defaults—adjust if your API needs a different content type."
      );
    }
    staticHeaders[k] = v;
  }

  const authConfigObj = {
    type: "static_headers",
    static_headers: staticHeaders,
  };

  const metadataObj: Record<string, unknown> = { http_method: method };
  const sla = flags.headers["X-Sla-Ms"] ?? flags.headers["x-sla-ms"];
  if (sla && /^\d+$/.test(sla)) {
    metadataObj.sla_ms = Number(sla);
  }

  const patch: CurlParsePatch = {
    endpoint: templatedHref,
    metadata: JSON.stringify(metadataObj, null, 2),
    auth_config: JSON.stringify(authConfigObj, null, 2),
    input_schema: JSON.stringify(inputSchemaObj, null, 2),
  };

  return { ok: true, patch, warnings, infos, placeholders };
}
