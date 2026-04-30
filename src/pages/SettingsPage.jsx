import React, { useState } from 'react';
import { Settings, Film, Tv, Music, Bell, Library, Search, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { radarrApi, sonarrApi, lidarrApi, overseerrApi, plexApi, prowlarrApi, serviceColors } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const servicesList = [
  { key: 'radarr', name: 'Radarr', icon: Film, description: 'Movie management', testFn: (c) => radarrApi.getSystemStatus(c) },
  { key: 'sonarr', name: 'Sonarr', icon: Tv, description: 'TV show management', testFn: (c) => sonarrApi.getSystemStatus(c) },
  { key: 'lidarr', name: 'Lidarr', icon: Music, description: 'Music management', testFn: (c) => lidarrApi.getSystemStatus(c) },
  { key: 'overseerr', name: 'Overseerr', icon: Bell, description: 'Media request management', testFn: (c) => overseerrApi.getStatus(c) },
  { key: 'plex', name: 'Plex', icon: Library, description: 'Media server', testFn: (c) => plexApi.getIdentity(c) },
  { key: 'prowlarr', name: 'Prowlarr', icon: Search, description: 'Indexer management', testFn: (c) => prowlarrApi.getSystemStatus(c) },
];

function ServiceConfigCard({ service, config, onUpdate }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const Icon = service.icon;
  const colors = serviceColors[service.key];

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await service.testFn(config);
      setTestResult('success');
      toast.success(`${service.name} connected successfully`);
    } catch (e) {
      setTestResult('error');
      toast.error(`Failed to connect to ${service.name}`);
    }
    setTesting(false);
  };

  return (
    <Card className={cn(
      "transition-all",
      config.enabled ? "border-border" : "border-border/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", colors.bg)}>
              <Icon className={cn("w-5 h-5", colors.text)} />
            </div>
            <div>
              <CardTitle className="text-base">{service.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{service.description}</p>
            </div>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => onUpdate({ enabled: checked })}
          />
        </div>
      </CardHeader>
      {config.enabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {service.key === 'plex' ? 'Server URL' : 'Base URL'}
            </Label>
            <Input
              placeholder={`http://localhost:${service.key === 'radarr' ? '7878' : service.key === 'sonarr' ? '8989' : service.key === 'lidarr' ? '8686' : service.key === 'overseerr' ? '5055' : service.key === 'plex' ? '32400' : '9696'}`}
              value={config.url}
              onChange={e => onUpdate({ url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {service.key === 'plex' ? 'Plex Token' : 'API Key'}
            </Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Enter API key..."
                value={config.apiKey}
                onChange={e => onUpdate({ apiKey: e.target.value })}
                className="pr-10"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={testConnection}
              disabled={testing || !config.url || !config.apiKey}
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : testResult === 'success' ? (
                <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
              ) : testResult === 'error' ? (
                <XCircle className="w-4 h-4 mr-2 text-destructive" />
              ) : null}
              Test Connection
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const { config, updateService } = useServiceConfig();

  return (
    <div>
      <PageHeader 
        title="Settings" 
        subtitle="Configure your service connections" 
        icon={Settings} 
      />

      <div className="space-y-4 max-w-2xl">
        <div className="bg-muted/30 rounded-xl p-4 mb-6 border border-border/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Important:</strong> Your services must have CORS enabled or be accessible from this browser. 
            If you're running services behind a reverse proxy, make sure to add appropriate CORS headers. 
            API keys are stored locally in your browser.
          </p>
        </div>

        {servicesList.map(service => (
          <ServiceConfigCard
            key={service.key}
            service={service}
            config={config[service.key]}
            onUpdate={(data) => updateService(service.key, data)}
          />
        ))}
      </div>
    </div>
  );
}