import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, RefreshCw, Loader2, Clock, Film, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { overseerrApi } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusColors = {
  1: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  2: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  3: { label: 'Declined', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function Requests() {
  const { config, isServiceReady } = useServiceConfig();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const ready = isServiceReady('overseerr');

  const fetchRequests = async () => {
    if (!ready) return;
    setLoading(true);
    const data = await overseerrApi.getRequests(config.overseerr);
    setRequests(data.results || []);
    setLoading(false);
  };

  useEffect(() => {
    if (ready) fetchRequests();
    else setLoading(false);
  }, [ready]);

  const handleApprove = async (id) => {
    await overseerrApi.approveRequest(config.overseerr, id);
    toast.success('Request approved');
    fetchRequests();
  };

  const handleDecline = async (id) => {
    await overseerrApi.declineRequest(config.overseerr, id);
    toast.success('Request declined');
    fetchRequests();
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="Requests" subtitle="Manage Overseerr media requests" icon={Bell} accentColor="bg-violet-500/10" />
        <EmptyState icon={Bell} title="Overseerr not configured" description="Add your Overseerr URL and API key in settings to manage requests." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Requests" subtitle={`${requests.length} requests`} icon={Bell} accentColor="bg-violet-500/10">
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState icon={Bell} title="No requests" description="No media requests found." showSettings={false} />
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const media = req.media || {};
            const statusConf = statusColors[req.status] || statusColors[1];
            const StatusIcon = statusConf.icon;
            const isMovie = req.type === 'movie';
            const posterPath = media.posterPath ? `https://image.tmdb.org/t/p/w92${media.posterPath}` : null;

            return (
              <Card key={req.id} className="p-4">
                <div className="flex items-center gap-4">
                  {/* Poster */}
                  <div className="w-12 h-16 rounded-lg bg-muted shrink-0 overflow-hidden">
                    {posterPath && <img src={posterPath} className="w-full h-full object-cover" alt="" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isMovie ? <Film className="w-3.5 h-3.5 text-amber-400" /> : <Tv className="w-3.5 h-3.5 text-sky-400" />}
                      <p className="font-semibold text-sm truncate">
                        {media.title || media.name || `Request #${req.id}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", statusConf.color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConf.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        by {req.requestedBy?.displayName || req.requestedBy?.email || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status === 1 && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => handleApprove(req.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDecline(req.id)}>
                        <XCircle className="w-4 h-4 mr-1" />Decline
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}