import {
  BookOpen,
  Highlighter,
  LogOut,
  Rss,
  Settings,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Library", icon: BookOpen },
  { path: "/feeds", label: "Feeds", icon: Rss },
  { path: "/highlights", label: "Highlights", icon: Highlighter },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ routePath, navigate, onLogout }) {
  const activePath = routePath === "/reader" ? "/" : routePath;

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo">
          <div className="logo-dot"></div>
          <div>
            <div className="logo-title">Clean Reader</div>
            <div className="logo-sub">Things-inspired focus</div>
          </div>
        </div>
      </div>
      <nav className="nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              className={`nav-item ${activePath === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              type="button"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item" onClick={onLogout} type="button">
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
