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
  FolderKanban,
  Menu,
  Moon,
  Sun
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);


  // Prevent hydration mismatch for theme toggle
  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Upload & Keywords", href: "/upload", icon: UploadCloud },
    { name: "Portfolio", href: "/portfolio", icon: ImageIcon },
    { name: "Collections", href: "/collections", icon: FolderKanban },
    { name: "Keyword Insights", href: "/keywords", icon: Tag },
    { name: "Sales & Earnings", href: "/sales", icon: DollarSign },
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

      {/* Theme Toggle & Footer */}
      <div className="mt-auto p-4 border-t border-border flex flex-col gap-4">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle Theme"
            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-all ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            {!isCollapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        )}
        
        {!isCollapsed && (
          <div className="p-4 bg-surface-hover rounded-xl">
            <p className="text-xs text-muted">
              Ready for daily microstock upload.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
