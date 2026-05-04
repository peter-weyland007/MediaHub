import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPosterDensityLabel, getPosterDensityOptions } from '@/components/shared/mediaDisplay';

export default function PosterDisplayControls({ posterDisplayPreferences, onChange }) {
  const hidePosters = posterDisplayPreferences?.hidePosters ?? false;
  const posterSize = posterDisplayPreferences?.posterSize ?? 'default';
  const densityLabel = getPosterDensityLabel(posterDisplayPreferences);
  const [compactLabel, defaultLabel, largeLabel] = getPosterDensityOptions(posterDisplayPreferences);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
      <div className="flex items-center gap-2">
        <Switch
          checked={hidePosters}
          onCheckedChange={(checked) => onChange({ ...posterDisplayPreferences, hidePosters: checked })}
          aria-label="Hide posters"
        />
        <Label className="text-xs text-muted-foreground">Hide posters</Label>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">{densityLabel}</Label>
        <Select
          value={posterSize}
          onValueChange={(value) => onChange({ ...posterDisplayPreferences, posterSize: value })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">{compactLabel}</SelectItem>
            <SelectItem value="default">{defaultLabel}</SelectItem>
            <SelectItem value="large">{largeLabel}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
