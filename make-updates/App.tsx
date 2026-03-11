import { useState } from "react";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import { MobileNavigation } from "./components/MobileNavigation";
import { Dashboard } from "./components/Dashboard";
import { IncomeExpenseTracker } from "./components/IncomeExpenseTracker";
import { InvestmentPortfolio } from "./components/InvestmentPortfolio";
import { NetWorthCalculator } from "./components/NetWorthCalculator";
import { Settings } from "./components/Settings";
import { Toaster } from "./components/ui/sonner";
import { Bell, CreditCard } from "lucide-react";

const menuItems = [
  { id: "dashboard", title: "Dashboard", component: Dashboard },
  { id: "tracker", title: "Tracker", component: IncomeExpenseTracker },
  { id: "portfolio", title: "Portfolio", component: InvestmentPortfolio },
  { id: "networth", title: "Net Worth", component: NetWorthCalculator },
  { id: "settings", title: "Settings", component: Settings },
];

function MobileAppContent() {
  const [activeItem, setActiveItem] = useState("dashboard");
  const { theme, themes } = useTheme();
  const ActiveComponent =
    menuItems.find((item) => item.id === activeItem)?.component || Dashboard;
  const currentTheme = themes.find((item) => item.id === theme);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className={`app-hero bg-gradient-to-r ${currentTheme?.gradient}`}>
        <div className="hero-blur" />
        <div className="relative px-5 pt-4 pb-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/80 font-medium">Quantex25</p>
              <h1 className="text-xl font-bold tracking-tight">Smart Finance Tracker</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="hero-icon-btn" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </button>
              <button className="hero-icon-btn" aria-label="Cards">
                <CreditCard className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 hero-summary-card">
            <p className="text-xs text-white/80">Current balance</p>
            <p className="text-2xl font-extrabold tracking-tight">₹1,86,450</p>
            <p className="text-xs text-white/85 mt-1">
              Spend is 8% lower than last week. You are on track.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background overflow-auto">
        <div className="p-4 pb-24">
          <ActiveComponent />
        </div>
      </main>

      <MobileNavigation activeItem={activeItem} onItemChange={setActiveItem} />
      <Toaster />
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen app-shell flex items-center justify-center p-4">
      <div className="relative">
        <div className="absolute inset-0 bg-black/20 rounded-[3rem] blur-xl transform translate-y-2 scale-105" />

        <div className="relative bg-black rounded-[3rem] p-2 shadow-2xl device-frame">
          <div className="bg-slate-900 rounded-[2.5rem] p-1">
            <div className="flex justify-center mb-1">
              <div className="w-32 h-6 bg-black rounded-full" />
            </div>

            <div className="w-[375px] h-[812px] bg-background rounded-[2rem] overflow-hidden relative device-screen">
              <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-2 text-xs font-semibold text-foreground">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-foreground rounded-full" />
                  <div className="w-1 h-1 bg-foreground rounded-full" />
                  <div className="w-1 h-1 bg-foreground/60 rounded-full" />
                  <div className="w-6 h-3 border border-foreground rounded-sm" />
                </div>
              </div>

              <div className="h-full pt-8">
                <MobileAppContent />
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-2 mb-1">
            <div className="w-32 h-1 bg-slate-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
