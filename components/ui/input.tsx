import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary/30 selection:text-foreground",
        "flex h-10 w-full min-w-0 rounded-xl border border-border/40 bg-background/50 backdrop-blur-sm px-4 py-2 text-sm shadow-sm transition-all duration-300 outline-none",
        "focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/5 focus-visible:scale-[1.005]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
