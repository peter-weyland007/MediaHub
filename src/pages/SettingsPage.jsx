import React, { Fragment, useMemo, useState } from 'react';
import {
  Settings,
  Film,
  Tv,
  Music,
  Languages,
  Activity,
  Bell,
  Library,
  Search,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useServiceConfig } from '@/lib/useServiceConfig';
import {
  radarrApi,
  sonarrApi,
  lidarrApi,
  bazarrApi,
  tautulliApi,
  overseerrApi,
  plexApi,
  prowlarrApi,
  serviceColors,
} from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const servicesList = [
  { key: 'bazarr', name: 'Bazarr', icon: Languages, description: 'Subtitle management', testFn: (c) => bazarrApi.getSystemStatus(c) },
  { key: 'lidarr', name: 'Lidarr', icon: Music, description: 'Music management', testFn: (c) => lidarrApi.getSystemStatus(c) },
  { key: 'overseerr', name: 'Overseerr', icon: Bell, description: 'Media request management', testFn: (c) => overseerrApi.getStatus(c) },
  { key: 'plex', name: 'Plex', icon: Library, description: 'Media server', testFn: (c) => plexApi.getIdentity(c) },
  { key: 'prowlarr', name: 'Prowlarr', icon: Search, description: 'Indexer management', testFn: (c) => prowlarrApi.getSystemStatus(c) },
  { key: 'radarr', name: 'Radarr', icon: Film, description: 'Movie management', testFn: (c) => radarrApi.getSystemStatus(c) },
  { key: 'sonarr', name: 'Sonarr', icon: Tv, description: 'TV show management', testFn: (c) => sonarrApi.getSystemStatus(c) },
  { key: 'tautulli', name: 'Tautulli', icon: Activity, description: 'Playback analytics and transcode history', testFn: (c) => tautulliApi.getActivity(c) },
];

const getDefaultUrlPlaceholder = (serviceKey) => `http://localhost:${serviceKey === 'radarr'
  ? '7878'
  : serviceKey === 'sonarr'
    ? '8989'
    : serviceKey === 'lidarr'
      ? '8686'
      : serviceKey === 'bazarr'
        ? '6767'
        : serviceKey === 'tautulli'
          ? '8181'
          : serviceKey === 'overseerr'
            ? '5055'
            : serviceKey === 'plex'
              ? '32400'
              : '9696'}`;

const getStatusBadge = (status) => {
  if (status === 'success') {
    return { label: 'Connected', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  }
  if (status === 'error') {
    return { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20' };
  }
  return { label: 'Untested', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
};

export default function SettingsPage() {
  const { config, updateService } = useServiceConfig();
  const [expandedService, setExpandedService] = useState(null);
  const [draftConfigs, setDraftConfigs] = useState({});
  const [testingStates, setTestingStates] = useState({});
  const [testResults, setTestResults] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [savingStates, setSavingStates] = useState({});

  const servicesByKey = useMemo(() => Object.fromEntries(servicesList.map((service) => [service.key, service])), []);

  const getDraftConfig = (serviceKey) => draftConfigs[serviceKey] || config[serviceKey];

  const setDraftConfig = (serviceKey, patch) => {
    setDraftConfigs((current) => ({
      ...current,
      [serviceKey]: {
        ...getDraftConfig(serviceKey),
        ...patch,
      },
    }));
  };

  const handleToggleEnabled = async (serviceKey, enabled) => {
    const nextConfig = {
      ...config[serviceKey],
      ...draftConfigs[serviceKey],
      enabled,
    };

    setDraftConfigs((current) => ({
      ...current,
      [serviceKey]: nextConfig,
    }));

    try {
      await updateService(serviceKey, { enabled });
      toast.success(`${servicesByKey[serviceKey].name} ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error(`Failed to update ${servicesByKey[serviceKey].name}`);
    }
  };

  const handleExpandToggle = (serviceKey) => {
    setExpandedService((current) => (current === serviceKey ? null : serviceKey));
    setDraftConfigs((current) => ({
      ...current,
      [serviceKey]: current[serviceKey] || { ...config[serviceKey] },
    }));
  };

  const handleSave = async (serviceKey) => {
    const draft = getDraftConfig(serviceKey);
    setSavingStates((current) => ({ ...current, [serviceKey]: true }));
    try {
      await updateService(serviceKey, draft);
      toast.success(`Saved ${servicesByKey[serviceKey].name} settings`);
    } catch {
      toast.error(`Failed to save ${servicesByKey[serviceKey].name} settings`);
    } finally {
      setSavingStates((current) => ({ ...current, [serviceKey]: false }));
    }
  };

  const testConnection = async (serviceKey) => {
    const service = servicesByKey[serviceKey];
    const draft = getDraftConfig(serviceKey);
    setTestingStates((current) => ({ ...current, [serviceKey]: true }));
    setTestResults((current) => ({ ...current, [serviceKey]: null }));

    try {
      await service.testFn(draft);
      setTestResults((current) => ({ ...current, [serviceKey]: 'success' }));
      toast.success(`${service.name} connected successfully`);
    } catch {
      setTestResults((current) => ({ ...current, [serviceKey]: 'error' }));
      toast.error(`Failed to connect to ${service.name}`);
    } finally {
      setTestingStates((current) => ({ ...current, [serviceKey]: false }));
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your service connections"
        icon={Settings}
      />

      <div className="space-y-4">
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50 max-w-5xl">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Important:</strong> MediaHub now proxies service traffic through its backend, so your browser no longer needs direct CORS access to Radarr, Sonarr, Bazarr, Tautulli, Overseerr, Plex, or Prowlarr. API keys and service settings are stored in MediaHub SQLite data instead of browser local storage.
          </p>
        </div>

        <Card className="max-w-6xl border-border/70 bg-card/95">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicesList.map((service) => {
                  const Icon = service.icon;
                  const colors = serviceColors[service.key];
                  const savedConfig = config[service.key];
                  const draft = getDraftConfig(service.key);
                  const statusBadge = getStatusBadge(testResults[service.key]);
                  const isExpanded = expandedService === service.key;
                  const isTesting = Boolean(testingStates[service.key]);
                  const isSaving = Boolean(savingStates[service.key]);
                  const hasKey = Boolean(savedConfig.apiKey);
                  const hasUrl = Boolean(savedConfig.url);

                  return (
                    <Fragment key={service.key}>
                      <TableRow className={cn(isExpanded && 'bg-muted/20')}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-lg', colors.bg)}>
                              <Icon className={cn('w-4 h-4', colors.text)} />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{service.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{service.description}</TableCell>
                        <TableCell>
                          <Switch
                            checked={savedConfig.enabled}
                            onCheckedChange={(checked) => handleToggleEnabled(service.key, checked)}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[20rem] truncate">
                          {hasUrl ? savedConfig.url : 'Not configured'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={hasKey ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground'}>
                            {hasKey ? 'Saved' : 'Missing'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge.className}>{statusBadge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testConnection(service.key)}
                              disabled={isTesting || !draft.url || !draft.apiKey || !draft.enabled}
                            >
                              {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant={isExpanded ? 'secondary' : 'outline'}
                              onClick={() => handleExpandToggle(service.key)}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/10">
                            <div className="rounded-xl border border-border/70 bg-background/70 p-5 space-y-4">
                              <div>
                                <p className="text-base font-semibold text-foreground">{service.name} connection details</p>
                                <p className="text-sm text-muted-foreground">Edit full credentials here without turning the whole page into a giant form.</p>
                              </div>

                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>{service.key === 'plex' ? 'Server URL' : 'Base URL'}</Label>
                                  <Input
                                    placeholder={getDefaultUrlPlaceholder(service.key)}
                                    value={draft.url}
                                    onChange={(event) => setDraftConfig(service.key, { url: event.target.value })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>{service.key === 'plex' ? 'Plex Token' : 'API Key'}</Label>
                                  <div className="relative">
                                    <Input
                                      type={showKeys[service.key] ? 'text' : 'password'}
                                      placeholder="Enter API key..."
                                      value={draft.apiKey}
                                      onChange={(event) => setDraftConfig(service.key, { apiKey: event.target.value })}
                                      className="pr-12"
                                    />
                                    <button
                                      type="button"
                                      aria-label={showKeys[service.key] ? 'Hide key' : 'Show key'}
                                      onClick={() => setShowKeys((current) => ({ ...current, [service.key]: !current[service.key] }))}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {showKeys[service.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Button onClick={() => handleSave(service.key)} disabled={isSaving}>
                                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => testConnection(service.key)}
                                  disabled={isTesting || !draft.url || !draft.apiKey || !draft.enabled}
                                >
                                  {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                  Test Connection
                                </Button>
                                <Badge variant="outline" className={statusBadge.className}>{statusBadge.label}</Badge>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
