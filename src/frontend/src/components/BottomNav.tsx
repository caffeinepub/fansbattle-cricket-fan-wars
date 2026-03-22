import type { TabId } from "@/App";

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isAdmin?: boolean;
}

export default function BottomNav({ activeTab, onTabChange, isAdmin }: Props) {
  const items: { id: TabId; label: string; icon: string; ocid: string }[] = [
    { id: "home", label: "Home", icon: "🏠", ocid: "nav.home.tab" },
    { id: "profile", label: "Profile", icon: "👤", ocid: "nav.profile.tab" },
    ...(isAdmin
      ? [
          {
            id: "admin" as TabId,
            label: "Admin",
            icon: "🛡️",
            ocid: "nav.admin.tab",
          },
        ]
      : []),
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-6 py-2"
      style={{
        background: "oklch(0.13 0.025 255 / 0.95)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid oklch(0.25 0.04 255 / 0.4)",
      }}
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              type="button"
              key={item.id}
              data-ocid={item.ocid}
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center gap-1 px-6 py-1.5 rounded-2xl transition-all duration-200"
              style={{
                color: isActive
                  ? "oklch(0.72 0.18 50)"
                  : "oklch(0.55 0.04 255)",
                background: isActive
                  ? "oklch(0.72 0.18 50 / 0.1)"
                  : "transparent",
              }}
            >
              <span
                className="text-2xl transition-transform duration-200"
                style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
              >
                {item.icon}
              </span>
              <span
                className="text-[11px]"
                style={{ fontWeight: isActive ? 700 : 500 }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
