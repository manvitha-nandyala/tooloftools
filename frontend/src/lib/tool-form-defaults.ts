/** Default string state for Register / Edit tool form (JSON fields as formatted strings). */
export type ToolFormState = {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  tool_type: string;
  endpoint: string;
  owner: string;
  documentation_url: string;
  tags: string;
  input_schema: string;
  output_schema: string;
  metadata: string;
  auth_config: string;
  rate_limit: string;
};

export function emptyToolForm(): ToolFormState {
  return {
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
  };
}
