import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  PiggyBank,
  Sparkles,
  Wallet,
} from "lucide-react";

const trendData = [45, 30, 55, 62, 88, 74, 57];

const transactions = [
  { id: 1, name: "Zomato", meta: "Food · Today, 8:45 PM", amount: -420 },
  { id: 2, name: "Salary Credit", meta: "Income · Today, 6:10 PM", amount: 32000 },
  { id: 3, name: "Uber", meta: "Travel · Today, 5:32 PM", amount: -212 },
  { id: 4, name: "Electricity Board", meta: "Utilities · Yesterday", amount: -890 },
];

export function Dashboard() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="finance-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="metric-label">Monthly Income</p>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="metric-value mt-1">₹32,000</p>
            <Badge className="metric-up mt-2">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +11%
            </Badge>
          </CardContent>
        </Card>

        <Card className="finance-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="metric-label">Monthly Spend</p>
              <BarChart3 className="h-4 w-4 text-rose-600" />
            </div>
            <p className="metric-value mt-1">₹6,430</p>
            <Badge className="metric-down mt-2">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              +4%
            </Badge>
          </CardContent>
        </Card>

        <Card className="finance-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="metric-label">Net Worth</p>
              <PiggyBank className="h-4 w-4 text-blue-600" />
            </div>
            <p className="metric-value mt-1">₹14.86L</p>
            <Badge className="metric-up mt-2">Healthy trajectory</Badge>
          </CardContent>
        </Card>

        <Card className="finance-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="metric-label">Savings Goal</p>
              <Sparkles className="h-4 w-4 text-cyan-600" />
            </div>
            <p className="metric-value mt-1">72%</p>
            <div className="progress-shell mt-2">
              <div className="progress-fill" style={{ width: "72%" }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="finance-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Spending Trend</h3>
            <p className="section-link">Last 7 days</p>
          </div>

          <div className="trend-chart">
            {trendData.map((value, index) => (
              <div key={index} className="trend-bar-wrap">
                <div className="trend-bar" style={{ height: `${value}%` }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="finance-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Recent Transactions</h3>
            <p className="section-link">See all</p>
          </div>

          <div className="space-y-2">
            {transactions.map((txn) => (
              <div key={txn.id} className="txn-row">
                <div>
                  <p className="txn-name">{txn.name}</p>
                  <p className="txn-meta">{txn.meta}</p>
                </div>
                <p className={`txn-amount ${txn.amount >= 0 ? "txn-pos" : "txn-neg"}`}>
                  {txn.amount >= 0 ? "+" : "-"}₹{Math.abs(txn.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
