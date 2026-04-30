import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ServiceStatusBadge({ status, label }) {
  return (
    <div className="flex items-center gap-2">
      {status === 'connected' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
      {status === 'error' && <XCircle className="w-3.5 h-3.5 text-destructive" />}
      {status === 'loading' && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
      {status === 'unconfigured' && <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />}
      <span className={cn(
        "text-xs font-medium",
        status === 'connected' ? 'text-emerald-400' :
        status === 'error' ? 'text-destructive' :
        'text-muted-foreground'
      )}>
        {label || status}
      </span>
    </div>
  );
}