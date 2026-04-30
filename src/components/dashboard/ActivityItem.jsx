import React from 'react';
import { cn } from '@/lib/utils';
import { Download, Check, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  downloading: { icon: Download, color: 'text-sky-400', label: 'Downloading' },
  completed: { icon: Check, color: 'text-emerald-400', label: 'Completed' },
  queued: { icon: Clock, color: 'text-amber-400', label: 'Queued' },
  warning: { icon: AlertCircle, color: 'text-amber-400', label: 'Warning' },
  error: { icon: AlertCircle, color: 'text-destructive', label: 'Error' },
};

export default function ActivityItem({ title, service, status = 'queued', progress, size }) {
  const config = statusConfig[status] || statusConfig.queued;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <StatusIcon className={cn("w-4 h-4 shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {service}
          </Badge>
          {size && <span className="text-[10px] text-muted-foreground">{size}</span>}
        </div>
      </div>
      {progress != null && (
        <div className="w-16 text-right">
          <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}