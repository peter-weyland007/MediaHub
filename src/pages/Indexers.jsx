import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Loader2, CheckCircle, XCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { prowlarrApi } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

export default function Indexers() {
  const { config, isServiceReady } = useServiceConfig();
  const [indexers, setIndexers] = useState([]);
  const [loading, setLoading] = useState(true);

  const ready = isServiceReady('prowlarr');

  const fetchIndexers = async () => {
    if (!ready) return;
    setLoading(true);
    const data = await prowlarrApi.getIndexers(config.prowlarr);
    setIndexers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (ready) fetchIndexers();
    else setLoading(false);
  }, [ready]);

  if (!ready) {
    return (
      <div>
        <PageHeader title="Indexers" subtitle="Manage your Prowlarr indexers" icon={Search} accentColor="bg-rose-500/10" />
        <EmptyState icon={Search} title="Prowlarr not configured" description="Add your Prowlarr URL and API key in settings to manage indexers." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Indexers" subtitle={`${indexers.length} indexers configured`} icon={Search} accentColor="bg-rose-500/10">
        <Button variant="outline" size="sm" onClick={fetchIndexers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indexers.map(indexer => (
            <Card key={indexer.id} className={cn(
              "p-4 transition-all",
              indexer.enable ? "border-border" : "border-border/50 opacity-60"
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <Globe className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{indexer.name}</p>
                    <p className="text-xs text-muted-foreground">{indexer.protocol || 'Unknown protocol'}</p>
                  </div>
                </div>
                {indexer.enable ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {indexer.capabilities?.categories?.slice(0, 4).map((cat, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {cat.name}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-[10px]">
                  {indexer.enable ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}