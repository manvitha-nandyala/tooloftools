import { describe, expect, it } from "vitest";
import {
  isDynamicPathSegment,
  isValidToolId,
  jsonValueToSchema,
  parseCurlCommand,
  splitShellArgs,
  templatizeEndpoint,
} from "./parse-curl";

describe("splitShellArgs", () => {
  it("respects double quotes", () => {
    expect(splitShellArgs(`foo "bar baz" qux`)).toEqual(["foo", "bar baz", "qux"]);
  });

  it("respects single quotes", () => {
    expect(splitShellArgs(`-H 'Content-Type: application/json'`)).toEqual(["-H", "Content-Type: application/json"]);
  });
});

describe("isDynamicPathSegment", () => {
  it("detects UUID", () => {
    expect(isDynamicPathSegment("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects normal slug", () => {
    expect(isDynamicPathSegment("users")).toBe(false);
  });
});

describe("templatizeEndpoint", () => {
  it("replaces UUID path segment with dynamic placeholder", () => {
    const url = new URL("https://api.example.com/v1/users/550e8400-e29b-41d4-a716-446655440000/profile");
    const { href, placeholders } = templatizeEndpoint(url);
    expect(href).toContain("{dynamic_1}");
    expect(href).not.toContain("550e8400");
    expect(placeholders).toEqual(["dynamic_1"]);
  });
});

describe("isValidToolId", () => {
  it("accepts backend pattern", () => {
    expect(isValidToolId("acme.myendpoint")).toBe(true);
  });
});

describe("jsonValueToSchema", () => {
  it("infers object properties", () => {
    const s = jsonValueToSchema({ name: "a", count: 2, ok: true });
    expect(s).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        count: { type: "number" },
        ok: { type: "boolean" },
      },
    });
  });
});

describe("parseCurlCommand", () => {
  it("returns partial patch with POST, auth, and input schema from JSON body", () => {
    const raw = `curl -X POST https://api.example.com/v1/items -H "Authorization: Bearer secret-token" -H "Content-Type: application/json" -d '{"title":"hi"}'`;
    const r = parseCurlCommand(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.endpoint).toContain("https://api.example.com/v1/items");
    expect(r.patch.metadata).toContain("POST");
    const meta = JSON.parse(r.patch.metadata!) as { http_method: string };
    expect(meta.http_method).toBe("POST");
    const auth = JSON.parse(r.patch.auth_config!) as { static_headers: Record<string, string> };
    expect(auth.static_headers.Authorization).toContain("Bearer");
    const input = JSON.parse(r.patch.input_schema!) as { properties: { title?: unknown } };
    expect(input.properties?.title).toBeDefined();
    expect(r.patch.id).toBeUndefined();
  });

  it("parses GET with query string", () => {
    const r = parseCurlCommand(`curl "https://search.example.com/api?q=test&limit=10"`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.metadata).toContain("GET");
    const input = JSON.parse(r.patch.input_schema!) as { properties?: Record<string, unknown> };
    expect(input.properties?.q).toBeDefined();
    expect(input.properties?.limit).toBeDefined();
  });

  it("merges path placeholder into input schema for UUID in URL", () => {
    const r = parseCurlCommand(
      `curl -X GET "https://api.example.com/v1/users/550e8400-e29b-41d4-a716-446655440000"`
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.endpoint).toContain("{dynamic_1}");
    expect(r.placeholders).toEqual(["dynamic_1"]);
    const input = JSON.parse(r.patch.input_schema!) as { properties?: Record<string, unknown> };
    expect(input.properties?.dynamic_1).toBeDefined();
  });

  it("fails without URL", () => {
    const r = parseCurlCommand(`curl -X GET -H "Accept: */*"`);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.some((e) => /no url/i.test(e))).toBe(true);
  });

  it("fails on invalid JSON body", () => {
    const r = parseCurlCommand(
      `curl -X POST https://api.example.com/x -H "Content-Type: application/json" -d '{"broken":'`
    );
    expect(r.ok).toBe(false);
  });
});
