import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full border border-border bg-surface px-4 py-3 text-sm text-ink transition-colors outline-none placeholder:text-muted/50 placeholder:italic placeholder:font-serif focus:border-ink disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
