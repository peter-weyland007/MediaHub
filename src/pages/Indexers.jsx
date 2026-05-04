import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Loader2, CheckCircle, XCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { fetchIndexersData, getServiceCacheKey } from '@/lib/mediaQueries';
import { prowlarrApi } from '@/lib/serviceApi';
import { buildProtocolPreferencePriorityUpdates, getProtocolPreferenceState } from '@/lib/indexerPriority';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Indexers() {
  const { config, isServiceReady } = useServiceConfig();
  const queryClient = useQueryClient();
  const ready = isServiceReady('prowlarr');
  const serviceKey = getServiceCacheKey(config.prowlarr);

  const {
    data: indexers = [],
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['indexers', ...serviceKey],
    queryFn: () => fetchIndexersData(config.prowlarr),
    enabled: ready,
    staleTime: 60 * 1000,
  });

  const protocolPreference = getProtocolPreferenceState(indexers);

  const applyProtocolPreference = async (preferredProtocol) => {
    const updates = buildProtocolPreferencePriorityUpdates(indexers, preferredProtocol);

    if (!updates.length) {
      toast.error('No enabled indexers available to reprioritize');
      return;
    }

    try {
      const results = await Promise.allSettled(
        updates.map((indexer) => prowlarrApi.updateIndexer(config.prowlarr, indexer.id, indexer))
      );
      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      if (succeeded && failed) {
        toast.success(`${succeeded} indexers updated. ${failed} could not be reprioritized because Prowlarr validation failed.`);
      } else if (succeeded) {
        toast.success(preferredProtocol === 'usenet' ? 'Usenet indexers moved above torrent indexers' : 'Torrent indexers moved above usenet indexers');
      } else {
        toast.error('Prowlarr rejected every indexer update. Check blocked or failing indexers.');
      }

      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['indexers'] }),
      ]);
    } catch (error) {
      toast.error(`Failed to update indexer priorities: ${error.message}`);
    }
  };

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
        <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Protocol preference:</span> {protocolPreference.label}
        </div>
        <Button size="sm" onClick={() => applyProtocolPreference('usenet')} disabled={isFetching || isPending || protocolPreference.preferredProtocol === 'usenet'}>
          Prefer Usenet
        </Button>
        <Button size="sm" variant="secondary" onClick={() => applyProtocolPreference('torrent')} disabled={isFetching || isPending || protocolPreference.preferredProtocol === 'torrent'}>
          Prefer Torrent
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {isPending && indexers.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indexers.map((indexer) => (
            <Card key={indexer.id} className={cn(
              'p-4 transition-all',
              indexer.enable ? 'border-border' : 'border-border/50 opacity-60',
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <Globe className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{indexer.name}</p>
                    <p className="text-xs text-muted-foreground">{indexer.protocol || 'Unknown protocol'} • priority {indexer.priority ?? '—'}</p>
                  </div>
                </div>
                {indexer.enable ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {indexer.capabilities?.categories?.slice(0, 4).map((cat, index) => (
                  <Badge key={index} variant="secondary" className="text-[10px]">
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
