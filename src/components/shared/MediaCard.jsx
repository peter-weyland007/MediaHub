import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const posterSizeClasses = {
  compact: 'media-card--compact',
  default: 'media-card--default',
  large: 'media-card--large',
};

const noPosterSizeClasses = {
  compact: 'min-h-[5.75rem]',
  default: 'min-h-[6.75rem]',
  large: 'min-h-[8rem]',
};

export default function MediaCard({
  title,
  subtitle,
  image,
  status,
  statusColor,
  onClick,
  badges,
  children,
  hidePoster = false,
  posterSize = 'default',
}) {
  const showMetaRow = hidePoster && (subtitle || status || badges?.length > 0 || children);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-poster-size={posterSize}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        onClick && 'cursor-pointer',
        !hidePoster && (posterSizeClasses[posterSize] || posterSizeClasses.default),
        hidePoster && [
          'media-card--no-poster flex flex-col justify-between border-border/70 bg-card/80 p-3',
          noPosterSizeClasses[posterSize] || noPosterSizeClasses.default,
        ]
      )}
      onClick={onClick}
    >
      {!hidePoster && (
        <>
          <div className="aspect-[2/3] relative overflow-hidden bg-muted">
            {image ? (
              <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-3xl font-bold text-muted-foreground/20">{title?.[0]}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {status && (
              <div className="absolute top-2 right-2">
                <Badge className={cn('text-xs border-0', statusColor || 'bg-primary/80 text-white')}>
                  {status}
                </Badge>
              </div>
            )}

            {badges && (
              <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                {badges.map((badge, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm">
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="p-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {children}
          </div>
        </>
      )}

      {hidePoster && (
        <>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/60 text-sm font-semibold text-muted-foreground">
              {title?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-tight text-foreground">{title}</h3>
              {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {status && (
              <Badge className={cn('shrink-0 text-[11px] border-0', statusColor || 'bg-primary/80 text-white')}>
                {status}
              </Badge>
            )}
          </div>

          {showMetaRow && (
            <div className="media-card__meta-row mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              {badges?.length > 0 && (
                <div className="media-card__meta-badge-row flex flex-wrap gap-1.5">
                  {badges.map((badge, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {badge}
                    </Badge>
                  ))}
                </div>
              )}
              {children}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
