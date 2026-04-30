import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function MediaCard({ title, subtitle, image, status, statusColor, onClick, badges, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-muted-foreground/20">{title?.[0]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Status badge */}
        {status && (
          <div className="absolute top-2 right-2">
            <Badge className={cn("text-xs border-0", statusColor || "bg-primary/80 text-white")}>
              {status}
            </Badge>
          </div>
        )}

        {/* Badges */}
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

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        {children}
      </div>
    </motion.div>
  );
}