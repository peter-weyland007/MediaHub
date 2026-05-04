import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * @param {React.ComponentPropsWithoutRef<'table'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLTableElement>} ref
 */
const Table = React.forwardRef(function Table({ className, ...props }, ref) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props} />
    </div>
  )
})
Table.displayName = "Table"

/**
 * @param {React.ComponentPropsWithoutRef<'thead'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLTableSectionElement>} ref
 */
const TableHeader = React.forwardRef(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
})
TableHeader.displayName = "TableHeader"

/**
 * @param {React.ComponentPropsWithoutRef<'tbody'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLTableSectionElement>} ref
 */
const TableBody = React.forwardRef(function TableBody({ className, ...props }, ref) {
  return (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props} />
  )
})
TableBody.displayName = "TableBody"

/**
 * @param {React.ComponentPropsWithoutRef<'tfoot'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLTableSectionElement>} ref
 */
const TableFooter = React.forwardRef(function TableFooter({ className, ...props }, ref) {
  return (
    <tfoot
      ref={ref}
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props} />
  )
})
TableFooter.displayName = "TableFooter"

/**
 * @param {React.ComponentPropsWithoutRef<'tr'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLTableRowElement>} ref
 */
const TableRow = React.forwardRef(function TableRow({ className, ...props }, ref) {
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props} />
  )
})
TableRow.displayName = "TableRow"

/**
 * @param {React.ComponentPropsWithoutRef<'th'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLTableCellElement>} ref
 */
const TableHead = React.forwardRef(function TableHead({ className, ...props }, ref) {
  return (
    <th
      ref={ref}
      className={cn(
        "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props} />
  )
})
TableHead.displayName = "TableHead"

/**
 * @param {React.ComponentPropsWithoutRef<'td'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLTableCellElement>} ref
 */
const TableCell = React.forwardRef(function TableCell({ className, ...props }, ref) {
  return (
    <td
      ref={ref}
      className={cn(
        "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props} />
  )
})
TableCell.displayName = "TableCell"

/**
 * @param {React.ComponentPropsWithoutRef<'caption'> & { className?: string }} props
 * @param {React.ForwardedRef<HTMLTableCaptionElement>} ref
 */
const TableCaption = React.forwardRef(function TableCaption({ className, ...props }, ref) {
  return (
    <caption
      ref={ref}
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props} />
  )
})
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
