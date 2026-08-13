import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary-dark)] cursor-pointer text-white hover:bg-[var(--color-surface)] hover:text-[var(--color-primary-dark)] hover:shadow-[0_12px_28px_rgba(248,186,81,0.35)]",
        secondary:
          "bg-[var(--color-primary)] cursor-pointertext-white shadow-[0_10px_24px_rgba(72,30,0,0.22)] hover:bg-black hover:shadow-[0_12px_28px_rgba(0,0,0,0.35)]",
        outline:
          "border-1 border-[var(--color-surface-muted)] cursor-pointer bg-transparent text-[var(--color-surface)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary-dark)] hover:shadow-[0_12px_28px_rgba(248,186,81,0.35)]",
        ghost:
          "text-[var(--color-primary-dark)] cursor-pointer hover:bg-white/60",
        link:
          "text-[var(--color-primary-dark)] cursor-pointer underline-offset-4 hover:underline",
        outline2:
          "border-1 border-[var(--color-primary-dark)] cursor-pointer bg-transparent text-[var(--color-primary-dark)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary-dark)]"
      },
      size: {
        default: "px-5 py-2.5",
        sm: "px-4 py-2 text-xs",
        lg: "px-6 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
