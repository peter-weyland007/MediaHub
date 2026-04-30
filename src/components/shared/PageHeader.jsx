import React from 'react';
import { cn } from '@/lib/utils';

export default function PageHeader({ title, subtitle, icon: Icon, accentColor, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn("p-2.5 rounded-xl", accentColor || "bg-primary/10")}>
            <Icon className={cn("w-6 h-6", accentColor ? accentColor.replace('bg-', 'text-').replace('/10', '') : "text-primary")} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}