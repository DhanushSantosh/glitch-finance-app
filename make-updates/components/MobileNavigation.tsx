import {
  Calculator,
  ChartSpline,
  Home,
  ReceiptIndianRupee,
  Settings,
} from "lucide-react";
import { cn } from "./ui/utils";

interface MobileNavigationProps {
  activeItem: string;
  onItemChange: (item: string) => void;
}

const navItems = [
  { id: "dashboard", title: "Home", icon: Home },
  { id: "tracker", title: "Tracker", icon: ReceiptIndianRupee },
  { id: "portfolio", title: "Portfolio", icon: ChartSpline },
  { id: "networth", title: "Net", icon: Calculator },
  { id: "settings", title: "Settings", icon: Settings },
];

export function MobileNavigation({ activeItem, onItemChange }: MobileNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
      <div className="mx-auto max-w-md nav-shell">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onItemChange(item.id)}
              className={cn("nav-item", active && "active")}
              aria-label={item.title}
            >
              <Icon className="h-[17px] w-[17px]" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
