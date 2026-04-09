import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className, ...props }: Props) {
  return (
    <button
      className={cn(
        "rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

