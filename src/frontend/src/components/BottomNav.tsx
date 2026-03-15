import type { TabId } from "@/App";

interface NavItem {
  id: TabId;
  label: string;
  icon: string;
  ocid: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "live", label: "Live Match", icon: "🏑", ocid: "nav.live_match.tab" },
  { id: "vote", label: "Vote Battle", icon: "🏆", ocid: "nav.vote_battle.tab" },
  {
    id: "sticker",
    label: "Stickers",
    icon: "✨",
    ocid: "nav.sticker_creator.tab",
  },
  { id: "friends", label: "Friends", icon: "👥", ocid: "nav.friends_room.tab" },
  { id: "shop", label: "Shop", icon: "🛙️", ocid: "nav.shop.tab" },
  {
    id: "admin",
    label: "Admin",
    icon: "🛡️",
    ocid: "nav.admin.tab",
    adminOnly: true,
  },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  showAdmin?: boolean;
}

export default function BottomNav({
  activeTab,
  onTabChange,
  showAdmin = false,
}: Props) {
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || showAdmin);

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-2 py-2"
      style={{
        background: "oklch(0.13 0.025 255 / 0.95)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid oklch(0.25 0.04 255 / 0.4)",
      }}
    >
      <div className="flex items-center justify-around">
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              type="button"
              key={item.id}
              data-ocid={item.ocid}
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200"
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
                className="text-xl transition-transform duration-200"
                style={{ transform: isActive ? "scale(1.2)" : "scale(1)" }}
              >
                {item.icon}
              </span>
              <span
                className="text-[10px] font-600"
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
