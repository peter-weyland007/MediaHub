import React, { useState, useEffect } from 'react';
import { Library, RefreshCw, Loader2, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { plexApi } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import MediaCard from '@/components/shared/MediaCard';

export default function PlexLibrary() {
  const { config, isServiceReady } = useServiceConfig();
  const [libraries, setLibraries] = useState([]);
  const [selectedLib, setSelectedLib] = useState(null);
  const [content, setContent] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  const ready = isServiceReady('plex');

  const fetchLibraries = async () => {
    if (!ready) return;
    setLoading(true);
    const data = await plexApi.getLibraries(config.plex);
    const libs = data?.MediaContainer?.Directory || [];
    setLibraries(libs);
    if (libs.length) {
      setSelectedLib(libs[0].key);
      fetchContent(libs[0].key);
    }

    const sessData = await plexApi.getSessions(config.plex).catch(() => ({ MediaContainer: { Metadata: [] } }));
    setSessions(sessData?.MediaContainer?.Metadata || []);
    setLoading(false);
  };

  const fetchContent = async (sectionId) => {
    setLoadingContent(true);
    const data = await plexApi.getLibraryContent(config.plex, sectionId);
    setContent(data?.MediaContainer?.Metadata || []);
    setLoadingContent(false);
  };

  useEffect(() => {
    if (ready) fetchLibraries();
    else setLoading(false);
  }, [ready]);

  const handleLibChange = (key) => {
    setSelectedLib(key);
    fetchContent(key);
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="Library" subtitle="Browse your Plex media library" icon={Library} accentColor="bg-orange-500/10" />
        <EmptyState icon={Library} title="Plex not configured" description="Add your Plex URL and token in settings to browse your library." />
      </div>
    );
  }

  const getThumb = (item) => {
    if (item.thumb) return `${config.plex.url}${item.thumb}?X-Plex-Token=${config.plex.apiKey}`;
    return null;
  };

  return (
    <div>
      <PageHeader title="Library" subtitle="Browse your Plex media" icon={Library} accentColor="bg-orange-500/10">
        <Button variant="outline" size="sm" onClick={fetchLibraries} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {/* Now Playing */}
      {sessions.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Now Playing
              <Badge variant="secondary" className="ml-1">{sessions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.User?.title || 'Unknown user'}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {s.Player?.state || 'playing'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Library tabs */}
          <Tabs value={selectedLib} onValueChange={handleLibChange}>
            <TabsList className="mb-6">
              {libraries.map(lib => (
                <TabsTrigger key={lib.key} value={lib.key}>
                  {lib.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Content grid */}
          {loadingContent ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {content.slice(0, 60).map((item, i) => (
                <MediaCard
                  key={i}
                  title={item.title}
                  subtitle={item.year ? String(item.year) : item.parentTitle || ''}
                  image={getThumb(item)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}