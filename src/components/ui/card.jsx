import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * @param {React.ComponentPropsWithoutRef<'div'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLDivElement>} ref
 */
const Card = React.forwardRef(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
      {...props} />
  )
})
Card.displayName = "Card"

/**
 * @param {React.ComponentPropsWithoutRef<'div'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLDivElement>} ref
 */
const CardHeader = React.forwardRef(function CardHeader({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props} />
  )
})
CardHeader.displayName = "CardHeader"

/**
 * @param {React.ComponentPropsWithoutRef<'div'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLDivElement>} ref
 */
const CardTitle = React.forwardRef(function CardTitle({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props} />
  )
})
CardTitle.displayName = "CardTitle"

/**
 * @param {React.ComponentPropsWithoutRef<'div'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLDivElement>} ref
 */
const CardDescription = React.forwardRef(function CardDescription({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props} />
  )
})
CardDescription.displayName = "CardDescription"

/**
 * @param {React.ComponentPropsWithoutRef<'div'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLDivElement>} ref
 */
const CardContent = React.forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
})
CardContent.displayName = "CardContent"

/**
 * @param {React.ComponentPropsWithoutRef<'div'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLDivElement>} ref
 */
const CardFooter = React.forwardRef(function CardFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props} />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
