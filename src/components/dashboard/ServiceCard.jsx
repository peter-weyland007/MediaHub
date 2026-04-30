import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function ServiceCard({ name, icon: Icon, status, stats, color }) {
  const statusIcons = {
    connected: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    error: <XCircle className="w-4 h-4 text-destructive" />,
    loading: <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />,
    unconfigured: <AlertCircle className="w-4 h-4 text-muted-foreground/40" />,
  };

  return (
    <Card className={cn(
      "p-4 bg-card border transition-all duration-300",
      status === 'connected' ? "border-border hover:border-primary/20" : "border-border/50 opacity-60"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-2 rounded-lg", color?.bg || "bg-muted")}>
            <Icon className={cn("w-4 h-4", color?.text || "text-foreground")} />
          </div>
          <div>
            <p className="font-semibold text-sm">{name}</p>
            <p className="text-xs text-muted-foreground capitalize">{status}</p>
          </div>
        </div>
        {statusIcons[status]}
      </div>
      {stats && status === 'connected' && (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, i) => (
            <div key={i} className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}