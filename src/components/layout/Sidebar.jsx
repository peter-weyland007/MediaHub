import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Film, Tv, Music, Bell, Library, 
  Search, Settings, MonitorPlay, ChevronLeft, ChevronRight, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/movies', label: 'Movies', icon: Film, service: 'radarr' },
  { path: '/tv-shows', label: 'TV Shows', icon: Tv, service: 'sonarr' },
  { path: '/music', label: 'Music', icon: Music, service: 'lidarr' },
  { path: '/requests', label: 'Requests', icon: Bell, service: 'overseerr' },
  { path: '/library', label: 'Library', icon: Library, service: 'plex' },
  { path: '/indexers', label: 'Indexers', icon: Search, service: 'prowlarr' },
  { path: '/quality', label: 'Quality', icon: ShieldCheck },
];

const serviceAccents = {
  radarr: 'text-amber-400',
  sonarr: 'text-sky-400',
  lidarr: 'text-emerald-400',
  overseerr: 'text-violet-400',
  plex: 'text-orange-400',
  prowlarr: 'text-rose-400',
};

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <MonitorPlay className="w-7 h-7 text-primary shrink-0" />
        {!collapsed && (
          <span className="ml-3 text-lg font-bold tracking-tight text-sidebar-foreground">
            MediaHub
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const accentColor = item.service ? serviceAccents[item.service] : 'text-primary';

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 shrink-0 transition-colors",
                isActive ? accentColor : "group-hover:text-sidebar-foreground"
              )} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            location.pathname === '/settings' && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}