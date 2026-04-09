import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMetricsSummary } from "../api/metrics";
import { Hint } from "../components/ui/hint";

export function MetricsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["metrics-summary"], queryFn: getMetricsSummary });

  if (isLoading) return <p className="text-sm text-slate-600">Loading metrics…</p>;
  if (!data) return <p className="text-sm text-slate-600">No metrics available.</p>;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Metrics</h1>
        <p className="text-sm text-slate-600">Aggregated counters from the API gateway and tool layer.</p>
        <p className="text-xs text-slate-500">
          Numbers are cumulative for the current server process window; use them to spot load and errors at a glance.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="HTTP requests"
          value={String(data.requests_total)}
          variant="indigo"
          hint="All HTTP requests handled by the platform API (including health checks if recorded)."
        />
        <MetricCard
          title="Tool invocations"
          value={String(data.tool_invocations_total)}
          variant="violet"
          hint="Successful or attempted tool executions routed through the gateway."
        />
        <MetricCard
          title="Tool errors"
          value={String(data.tool_errors_total)}
          variant="amber"
          hint="Failures during tool execution (validation, downstream, or MCP errors)."
        />
      </div>
      <div className="mis-panel p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-indigo-950">Invocations per tool</h2>
          <Hint text="Bar height is invocation count per tool_id. Use this to find hot or noisy integrations." />
        </div>
        <p className="mb-4 text-xs text-slate-500">Compare tool usage side by side. Hover a bar for exact counts.</p>
        <div className="h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.per_tool}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis dataKey="tool_id" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e0e7ff",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const metricBlob = {
  indigo: "from-indigo-500 to-violet-500",
  violet: "from-violet-500 to-fuchsia-500",
  amber: "from-amber-500 to-orange-500",
} as const;

function MetricCard({
  title,
  value,
  variant,
  hint,
}: {
  title: string;
  value: string;
  variant: keyof typeof metricBlob;
  hint: string;
}) {
  return (
    <div className="mis-panel relative overflow-visible p-5">
      <div
        className={`pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${metricBlob[variant]} opacity-20 blur-2xl`}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-600">{title}</p>
        <Hint text={hint} />
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
