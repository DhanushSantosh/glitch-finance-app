import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useTheme } from "./ThemeProvider";
import { Bell, Lock, Palette, ShieldCheck, Smartphone } from "lucide-react";

export function Settings() {
  const { theme, setTheme, themes } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [smsImport, setSmsImport] = useState(false);
  const [biometric, setBiometric] = useState(true);

  return (
    <div className="space-y-4">
      <Card className="finance-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-700" />
            Privacy Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="setting-row">
            <div>
              <p className="setting-title">SMS Import</p>
              <p className="setting-sub">Disabled by default. User-triggered parsing only.</p>
            </div>
            <Switch checked={smsImport} onCheckedChange={setSmsImport} />
          </div>

          <div className="setting-row">
            <div>
              <p className="setting-title">Push Notifications</p>
              <p className="setting-sub">Budget alerts and savings reminders.</p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>

          <div className="setting-row">
            <div>
              <p className="setting-title">Biometric Lock</p>
              <p className="setting-sub">Face or fingerprint unlock for app access.</p>
            </div>
            <Switch checked={biometric} onCheckedChange={setBiometric} />
          </div>
        </CardContent>
      </Card>

      <Card className="finance-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-violet-700" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {themes.map((item) => (
            <button
              key={item.id}
              onClick={() => setTheme(item.id)}
              className={`theme-row ${theme === item.id ? "active" : ""}`}
            >
              <div>
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <div className={`theme-dot bg-gradient-to-r ${item.gradient}`} />
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="finance-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-700" />
            Account and Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Bell className="h-4 w-4 mr-2" />
            Notification Preferences
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Lock className="h-4 w-4 mr-2" />
            Security PIN and Recovery
          </Button>
          <div className="pt-1">
            <Badge variant="secondary">INR locale · privacy-first mode</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
