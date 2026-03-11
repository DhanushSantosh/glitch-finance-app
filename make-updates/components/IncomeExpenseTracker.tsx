import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
  source: "manual" | "sms";
}

const incomeCategories = ["Salary", "Freelance", "Investment", "Business", "Other"];
const expenseCategories = [
  "Food",
  "Transportation",
  "Housing",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Other",
];

const sampleSMS = [
  "UPI Debited Rs.250 to ZOMATO on 15-Jan-24 UPI Ref 12345",
  "UPI Credited Rs.3200 from CLIENT PAYMENT on 15-Jan-24 UPI Ref 12346",
  "UPI Debited Rs.890 to ELECTRICITY BILL on 14-Jan-24 UPI Ref 12347",
];

function parseSms(text: string) {
  const amountMatch = text.match(/Rs\.?(\d+(?:\.\d{2})?)/i);
  const debit = /debited|paid/i.test(text);
  const credit = /credited|received/i.test(text);
  const counterparty = text.match(/(?:to|from)\s+([A-Z\s]+?)(?:\s+on|\s+UPI|$)/i)?.[1]?.trim() || "Unknown";

  if (!amountMatch || (!debit && !credit)) {
    return null;
  }

  return {
    type: credit ? "income" : "expense",
    amount: parseFloat(amountMatch[1]),
    description: `${credit ? "Payment from" : "Payment to"} ${counterparty}`,
    category: credit ? "Other" : /zomato|food/i.test(text) ? "Food" : "Other",
  } as const;
}

export function IncomeExpenseTracker() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      type: "income",
      amount: 32000,
      description: "Salary Credit",
      category: "Salary",
      date: "2026-03-10",
      source: "manual",
    },
    {
      id: "2",
      type: "expense",
      amount: 420,
      description: "Zomato",
      category: "Food",
      date: "2026-03-10",
      source: "sms",
    },
  ]);

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [selectedSms, setSelectedSms] = useState("");
  const [form, setForm] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    description: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
  });

  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((acc, item) => acc + item.amount, 0);

  const totalExpense = transactions
    .filter((item) => item.type === "expense")
    .reduce((acc, item) => acc + item.amount, 0);

  function addManualTransaction() {
    if (!form.amount || !form.description || !form.category) {
      toast.error("Please fill all required fields");
      return;
    }

    const txn: Transaction = {
      id: Date.now().toString(),
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description,
      category: form.category,
      date: form.date,
      source: "manual",
    };

    setTransactions((prev) => [txn, ...prev]);
    setForm({
      type: "expense",
      amount: "",
      description: "",
      category: "",
      date: new Date().toISOString().split("T")[0],
    });
    toast.success("Transaction added");
  }

  function importSms() {
    if (!smsEnabled) {
      toast.error("Enable SMS import first");
      return;
    }

    if (!selectedSms) {
      toast.error("Select an SMS to parse");
      return;
    }

    const parsed = parseSms(selectedSms);
    if (!parsed) {
      toast.error("Could not parse this SMS");
      return;
    }

    const txn: Transaction = {
      id: Date.now().toString(),
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.category,
      date: new Date().toISOString().split("T")[0],
      source: "sms",
    };

    setTransactions((prev) => [txn, ...prev]);
    setSelectedSms("");
    toast.success("Transaction imported from SMS");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card className="finance-card">
          <CardContent className="p-3">
            <p className="metric-label">Income</p>
            <p className="metric-value text-emerald-700">₹{totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="finance-card">
          <CardContent className="p-3">
            <p className="metric-label">Expenses</p>
            <p className="metric-value text-rose-700">₹{totalExpense.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="finance-card">
          <CardContent className="p-3">
            <p className="metric-label">Net</p>
            <p className="metric-value">₹{(totalIncome - totalExpense).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="finance-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="sms">SMS Import</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-3 pt-3">
              <Select
                value={form.type}
                onValueChange={(value: "income" | "expense") =>
                  setForm((prev) => ({ ...prev, type: value, category: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />

              <Select
                value={form.category}
                onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {(form.type === "income" ? incomeCategories : expenseCategories).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />

              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />

              <Button onClick={addManualTransaction} className="w-full">
                Add Transaction
              </Button>
            </TabsContent>

            <TabsContent value="sms" className="space-y-3 pt-3">
              <div className="consent-box">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">SMS import is optional</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Extract only amount, type, counterparty, date/time, and reference.
                    </p>
                  </div>
                  <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
                </div>
              </div>

              <Select value={selectedSms} onValueChange={setSelectedSms}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sample SMS" />
                </SelectTrigger>
                <SelectContent>
                  {sampleSMS.map((item, idx) => (
                    <SelectItem value={item} key={idx}>
                      SMS {idx + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={importSms} className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Import from SMS
              </Button>

              <div className="consent-box subtle">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-cyan-700" />
                  <p className="text-xs text-cyan-900">
                    For App Store safety, this remains user-controlled and off by default.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="finance-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.map((txn) => (
            <div className="txn-row" key={txn.id}>
              <div>
                <p className="txn-name">{txn.description}</p>
                <p className="txn-meta">
                  {new Date(txn.date).toLocaleDateString()} · {txn.category}
                </p>
              </div>
              <div className="text-right">
                <p className={`txn-amount ${txn.type === "income" ? "txn-pos" : "txn-neg"}`}>
                  {txn.type === "income" ? "+" : "-"}₹{txn.amount.toLocaleString()}
                </p>
                <Badge variant="outline" className="text-[10px] mt-1">
                  {txn.source === "manual" ? "Manual" : "SMS"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
