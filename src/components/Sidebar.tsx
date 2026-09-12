"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  LayoutDashboard, 
  UploadCloud, 
  Image as ImageIcon,
  Tag,
  DollarSign,
  Landmark,
  FolderKanban,
  TrendingUp,
  Menu,
  Moon,
  Sun,
  ExternalLink,
  Power,
  Database,
  Loader2,
  Check
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isQuitting, setIsQuitting] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [backupMessage, setBackupMessage] = useState<string>('');

  // Global shortcut (Cmd+Shift+N) to spawn sibling desktop window on same port
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        window.open(window.location.href, "_blank", "width=1280,height=800");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent hydration mismatch for theme toggle
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTriggerBackup = async () => {
    if (backupStatus === 'loading') return;
    setBackupStatus('loading');
    setBackupMessage('');
    try {
      const res = await fetch('/api/system/backup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Backup failed');
      }
      setBackupStatus('success');
      setBackupMessage(data.filename ? `Saved ${data.filename}` : 'Backup completed');
      setTimeout(() => {
        setBackupStatus('idle');
        setBackupMessage('');
      }, 3500);
    } catch (err: any) {
      setBackupStatus('error');
      setBackupMessage(err.message || 'Backup failed');
      setTimeout(() => {
        setBackupStatus('idle');
        setBackupMessage('');
      }, 3500);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Upload & Keywords", href: "/upload", icon: UploadCloud },
    { name: "Portfolio", href: "/portfolio", icon: ImageIcon },
    { name: "Collections", href: "/collections", icon: FolderKanban },
    { name: "Keyword Insights", href: "/keywords", icon: Tag },
    { name: "Asset Rankings", href: "/serp", icon: TrendingUp },
    { name: "Sales & Earnings", href: "/sales", icon: DollarSign },
    { name: "Payouts & Withdrawals", href: "/payouts", icon: Landmark },
  ];

  return (
    <aside 
      className={`bg-surface border-r border-border min-h-screen flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`flex items-center mb-10 mt-4 px-4 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2 truncate">
            <span className="text-primary">Auto</span>Pilot
          </h1>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Icon size={20} className={isActive ? "text-primary" : ""} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Actions & Theme Toggle */}
      <div className="mt-auto p-4 border-t border-border flex flex-col gap-2">
        <button
          data-testid="sidebar-new-window-btn"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open(pathname || "/", "_blank", "width=1280,height=800");
            }
          }}
          title="Open New Window (Cmd+Shift+N)"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-all cursor-pointer ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <ExternalLink size={20} className="text-primary shrink-0" />
          {!isCollapsed && <span className="font-medium text-foreground text-sm truncate">New Window</span>}
        </button>

        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle Theme"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-all cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            {!isCollapsed && <span className="text-sm">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        )}

        <button
          type="button"
          data-testid="sidebar-backup-btn"
          onClick={handleTriggerBackup}
          disabled={backupStatus === 'loading'}
          title={
            backupStatus === 'success'
              ? backupMessage || 'Backup Completed!'
              : backupStatus === 'error'
              ? backupMessage || 'Backup Failed'
              : 'Backup Now (สำรองข้อมูลทันที)'
          }
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
            isCollapsed ? "justify-center" : ""
          } ${
            backupStatus === 'success'
              ? 'text-emerald-500 bg-emerald-500/10'
              : backupStatus === 'error'
              ? 'text-destructive bg-destructive/10'
              : 'text-muted hover:bg-surface-hover hover:text-foreground'
          }`}
        >
          {backupStatus === 'loading' ? (
            <Loader2 size={20} className="animate-spin text-primary shrink-0" />
          ) : backupStatus === 'success' ? (
            <Check size={20} className="text-emerald-500 shrink-0" />
          ) : (
            <Database size={20} className="text-primary shrink-0" />
          )}
          {!isCollapsed && (
            <span className="font-medium text-sm truncate">
              {backupStatus === 'loading'
                ? 'Backing up...'
                : backupStatus === 'success'
                ? 'Backed up!'
                : backupStatus === 'error'
                ? 'Backup Failed'
                : 'Backup Now'}
            </span>
          )}
        </button>

        <button
          data-testid="sidebar-quit-app-btn"
          onClick={() => setShowQuitConfirm(true)}
          title="Quit App & Free Port 3000 (ปิดระบบและคืนพอร์ต)"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-500/80 hover:bg-rose-500/10 hover:text-rose-500 transition-all cursor-pointer ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <Power size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium text-sm truncate">Quit App</span>}
        </button>
        
        {!isCollapsed && (
          <div className="p-4 bg-surface-hover rounded-xl">
            <p className="text-xs text-muted">
              Ready for daily microstock upload.
            </p>
          </div>
        )}
      </div>

      {/* Quit App Confirmation Dialog */}
      {showQuitConfirm && (
        <div
          data-testid="quit-app-confirm-dialog"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Power size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Quit VectorAutomator?
                </h3>
                <p className="text-xs text-muted">
                  Stop server and release port 3000
                </p>
              </div>
            </div>
            <p className="text-sm text-foreground/80">
              This will checkpoint the database, shut down the background server, and free port 3000 for your other projects.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                data-testid="quit-app-cancel-btn"
                onClick={() => setShowQuitConfirm(false)}
                disabled={isQuitting}
                className="px-3.5 py-2 text-xs font-medium text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="quit-app-confirm-btn"
                disabled={isQuitting}
                onClick={async () => {
                  setIsQuitting(true);
                  try {
                    await fetch('/api/system/quit', { method: 'POST' });
                  } catch {
                    // Ignore network error on instant server termination
                  }
                  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
                    window.close();
                    try {
                      window.location.href = 'about:blank';
                    } catch {
                      // Ignored
                    }
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isQuitting ? 'Stopping...' : 'Quit & Release Port'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
