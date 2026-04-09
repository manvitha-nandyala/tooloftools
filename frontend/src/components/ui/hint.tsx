import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

/** Hover / focus / touch: shows native `title` on long-press; icon opens tooltip on hover & keyboard focus. */
export function Hint({ text }: { text: string }) {
  return (
    <span className="group/hint relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        className="rounded p-0.5 text-indigo-400 transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        aria-label={text}
        title={text}
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-[100] mt-1.5 hidden w-[min(calc(100vw-2rem),15rem)] -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-left text-[11px] font-normal leading-snug text-white shadow-lg group-hover/hint:block group-focus-within/hint:block"
      >
        {text}
      </span>
    </span>
  );
}

export function FieldLabel({
  label,
  hint,
  htmlFor,
  optional,
}: {
  label: ReactNode;
  hint?: string;
  htmlFor?: string;
  optional?: boolean;
}) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-slate-600">
        {label}
        {optional ? <span className="font-normal text-slate-400"> (optional)</span> : null}
      </label>
      {hint ? <Hint text={hint} /> : null}
    </div>
  );
}
