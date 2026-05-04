import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

const statusIcons = {
  connected: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  error: <XCircle className="w-3.5 h-3.5 text-destructive" />,
  loading: <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />,
  unconfigured: <AlertCircle className="w-3.5 h-3.5 text-amber-300/90" />,
};

const statusLabel = {
  connected: 'Connected',
  error: 'Needs attention',
  loading: 'Checking',
  unconfigured: 'Unconfigured',
};

export default function ServiceCard({ name, icon: Icon, status, stats = [], color }) {
  const summaryStats = stats.slice(0, 2);
  const isConnected = status === 'connected';
  const isError = status === 'error';
  const isUnconfigured = status === 'unconfigured';
  const hasStats = isConnected && summaryStats.length > 0;

  return (
    <Card className={cn(
      'bg-card/55 border shadow-none transition-colors duration-200',
      'p-3.5 sm:p-4',
      isConnected && 'border-border/45',
      isError && 'border-destructive/40 bg-destructive/5',
      isUnconfigured && 'border-amber-400/25 bg-amber-400/5',
      status === 'loading' && 'border-border/35',
      !isConnected && !isError && !isUnconfigured && status !== 'loading' && 'opacity-80'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'p-2 rounded-xl ring-1 ring-inset ring-white/5',
              isConnected ? 'bg-muted/45' : color?.bg || 'bg-muted'
            )}
          >
            <Icon className={cn('w-4 h-4', isConnected ? 'text-muted-foreground' : color?.text || 'text-foreground')} />
          </div>

          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              {statusIcons[status]}
              <span
                className={cn(
                  'text-xs',
                  isConnected ? 'text-muted-foreground' : isError ? 'text-destructive/90' : isUnconfigured ? 'text-amber-200/90' : 'text-muted-foreground'
                )}
              >
                {statusLabel[status] || status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {hasStats && (
        <div className="mt-3 flex flex-wrap gap-2">
          {summaryStats.map((stat, i) => (
            <div
              key={i}
              className="metric min-w-[104px] rounded-full border border-border/35 bg-background/30 px-3 py-1.5"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground">{stat.value}</span>
                <span className="summary text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
