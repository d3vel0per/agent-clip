import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent text-sm font-bold whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper hover:bg-ink/90",
        outline:
          "border-ink text-ink hover:bg-ink hover:text-paper",
        secondary:
          "bg-surface border-border text-ink hover:bg-surface-hover",
        ghost:
          "hover:bg-surface-hover hover:text-ink",
        destructive:
          "border-urgent text-urgent hover:bg-urgent hover:text-paper",
        link: "text-ink underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 signature-label",
        xs: "h-7 gap-1 px-2 text-[9px] uppercase tracking-wider",
        sm: "h-8 gap-1.5 px-3 text-[10px] uppercase tracking-widest",
        lg: "h-12 gap-2 px-6 text-base signature-label",
        icon: "size-10",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
