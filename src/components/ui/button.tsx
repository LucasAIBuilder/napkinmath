import * as React from "react";
import { cn } from "../../lib/cn";

type Variant = "default" | "ghost";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-8 items-center justify-center gap-2 rounded-md border px-3 text-xs",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          "ring-offset-white dark:ring-offset-zinc-950",
          variant === "default" &&
            "border-zinc-200 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
          variant === "ghost" &&
            "border-transparent bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

