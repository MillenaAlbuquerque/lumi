import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const alertVariants = cva('relative w-full rounded-xl p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-2px] [&>svg~*]:pl-7', {
  variants: {
    variant: {
      default: 'bg-mauve-950 text-white',
      success: ' bg-emerald-200 text-SLATE-950',
      destructive: ' bg-red-200 text-SLATE-950',
    },
  },
  defaultVariants: { variant: 'default' },
})

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(({ className, variant, ...props }, ref) => <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />)
Alert.displayName = 'Alert'
const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />)
AlertTitle.displayName = 'AlertTitle'
const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn('text-sm opacity-80 [&_p]:leading-relaxed', className)} {...props} />)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
