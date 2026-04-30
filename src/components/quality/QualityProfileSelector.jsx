import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Film, Tv } from 'lucide-react';

export default function QualityProfileSelector({ radarrProfiles, sonarrProfiles, selectedMovie, selectedTv, onMovieChange, onTvChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Film className="w-3.5 h-3.5 text-amber-400" /> Movie Preferred Profile
        </Label>
        <Select value={selectedMovie} onValueChange={onMovieChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select movie quality profile..." />
          </SelectTrigger>
          <SelectContent>
            {radarrProfiles.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tv className="w-3.5 h-3.5 text-sky-400" /> TV Preferred Profile
        </Label>
        <Select value={selectedTv} onValueChange={onTvChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select TV quality profile..." />
          </SelectTrigger>
          <SelectContent>
            {sonarrProfiles.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}