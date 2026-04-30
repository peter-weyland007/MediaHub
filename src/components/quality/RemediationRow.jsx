import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Film, Tv, CheckCircle, AlertTriangle, XCircle, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  ok: { icon: CheckCircle, badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  minor: { icon: AlertTriangle, badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  poor: { icon: XCircle, badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default function RemediationRow({ item, type, remediation, onAction, actioning }) {
  const cfg = statusConfig[remediation.status] || statusConfig.ok;
  const Icon = cfg.icon;
  const TypeIcon = type === 'movie' ? Film : Tv;
  const typeColor = type === 'movie' ? 'text-amber-400' : 'text-sky-400';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      {/* Poster */}
      {item.images?.[0]?.remoteUrl ? (
        <img src={item.images[0].remoteUrl} className="w-9 h-12 rounded object-cover shrink-0" alt="" />
      ) : (
        <div className="w-9 h-12 rounded bg-muted shrink-0 flex items-center justify-center">
          <TypeIcon className={cn("w-4 h-4", typeColor)} />
        </div>
      )}

      {/* Title + quality info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TypeIcon className={cn("w-3 h-3 shrink-0", typeColor)} />
          <p className="font-medium text-sm truncate">{item.title}</p>
          {item.year && <span className="text-xs text-muted-foreground shrink-0">({item.year})</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {item.currentQuality || 'No file'}
          </span>
          <span className="text-muted-foreground/40 text-xs">→</span>
          <span className="text-xs text-primary/70">{item.preferredProfile}</span>
        </div>
      </div>

      {/* Status badge */}
      <Badge variant="outline" className={cn("text-[10px] shrink-0 hidden sm:flex items-center gap-1", cfg.badgeClass)}>
        <Icon className="w-3 h-3" />
        {remediation.label}
      </Badge>

      {/* Action */}
      {remediation.action && (
        <Button
          size="sm"
          variant="outline"
          disabled={actioning}
          onClick={() => onAction(item, remediation.action)}
          className={cn(
            "text-xs shrink-0",
            remediation.action === 'replace'
              ? 'text-red-400 border-red-500/30 hover:bg-red-500/10'
              : 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
          )}
        >
          {actioning ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : remediation.action === 'replace' ? (
            <><XCircle className="w-3 h-3 mr-1" />Replace</>
          ) : (
            <><Search className="w-3 h-3 mr-1" />Upgrade</>
          )}
        </Button>
      )}
    </div>
  );
}