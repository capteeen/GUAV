import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs uppercase tracking-[0.14em] text-pith-muted", className)} {...props} />;
}
