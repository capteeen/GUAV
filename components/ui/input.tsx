import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-leaf-700 bg-leaf-950 px-3 text-sm text-pith outline-none placeholder:text-pith-muted focus:border-rind-bright",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-leaf-700 bg-leaf-950 px-3 py-2 text-sm text-pith outline-none placeholder:text-pith-muted focus:border-rind-bright",
        className,
      )}
      {...props}
    />
  );
}
