import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { apiClient } from "./src/api/client";
import { clearSessionToken, readSessionToken, saveSessionToken } from "./src/auth/sessionStore";
import { deriveAuthStage, getCurrentMonthToken, resolveSmsIntentOutcome } from "./src/flow/mobileFlow";
import { BudgetFormScreen } from "./src/screens/BudgetFormScreen";
import { BudgetsScreen } from "./src/screens/BudgetsScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { GoalFormScreen } from "./src/screens/GoalFormScreen";
import { GoalsScreen } from "./src/screens/GoalsScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OtpVerifyScreen } from "./src/screens/OtpVerifyScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { TransactionFormScreen } from "./src/screens/TransactionFormScreen";
import { TransactionsScreen } from "./src/screens/TransactionsScreen";
import { BootstrapPayload, Budget, Category, Goal, ReportSummary, Transaction, User } from "./src/types";

type AppView =
  | "dashboard"
  | "transactions"
  | "transactionCreate"
  | "transactionEdit"
  | "budgets"
  | "budgetCreate"
  | "budgetEdit"
  | "goals"
  | "goalCreate"
  | "goalEdit"
  | "settings";

const emptyBudgetTotals = {
  budgeted: 0,
  spent: 0,
  remaining: 0
};

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [pendingEmail, setPendingEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetTotals, setBudgetTotals] = useState(emptyBudgetTotals);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [reportMonth, setReportMonth] = useState(getCurrentMonthToken());
  const [budgetMonth, setBudgetMonth] = useState(getCurrentMonthToken());
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<AppView>("dashboard");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const isAuthenticated = Boolean(token && user);
  const authStage = deriveAuthStage(pendingEmail, isAuthenticated);

  const headerTitle = useMemo(() => {
    if (view === "transactionCreate") return "Add Transaction";
    if (view === "transactionEdit") return "Edit Transaction";
    if (view === "budgetCreate") return "Create Budget";
    if (view === "budgetEdit") return "Edit Budget";
    if (view === "goalCreate") return "Create Goal";
    if (view === "goalEdit") return "Edit Goal";
    if (view === "dashboard") return "Dashboard";
    if (view === "budgets") return "Budgets";
    if (view === "goals") return "Goals";
    if (view === "settings") return "Settings";
    return "Quantex25";
  }, [view]);

  const loadAuthenticatedData = async (sessionToken: string, budgetMonthToken: string, reportMonthToken: string) => {
    const [bootstrapPayload, currentUser, categoryItems, transactionItems, budgetData, goalItems, reportData] = await Promise.all([
      apiClient.getBootstrap(),
      apiClient.me(sessionToken),
      apiClient.getCategories(sessionToken),
      apiClient.getTransactions(sessionToken),
      apiClient.getBudgets(sessionToken, budgetMonthToken),
      apiClient.getGoals(sessionToken),
      apiClient.getReportSummary(sessionToken, reportMonthToken)
    ]);

    setBootstrap(bootstrapPayload);
    setUser(currentUser);
    setCategories(categoryItems);
    setTransactions(transactionItems);
    setBudgets(budgetData.items);
    setBudgetTotals(budgetData.totals);
    setBudgetMonth(budgetData.month);
    setGoals(goalItems);
    setReportSummary(reportData);
    setReportMonth(reportData.month);
  };

  useEffect(() => {
    const bootstrapApp = async () => {
      try {
        const storedToken = await readSessionToken();
        if (!storedToken) {
          setBootstrap(await apiClient.getBootstrap());
          return;
        }

        setToken(storedToken);
        await loadAuthenticatedData(storedToken, budgetMonth, reportMonth);
      } catch {
        await clearSessionToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsBooting(false);
      }
    };

    void bootstrapApp();
  }, []);

  const refreshAll = async () => {
    if (!token) return;

    setRefreshing(true);
    try {
      const [categoryItems, transactionItems, budgetData, goalItems, reportData] = await Promise.all([
        apiClient.getCategories(token),
        apiClient.getTransactions(token),
        apiClient.getBudgets(token, budgetMonth),
        apiClient.getGoals(token),
        apiClient.getReportSummary(token, reportMonth)
      ]);

      setCategories(categoryItems);
      setTransactions(transactionItems);
      setBudgets(budgetData.items);
      setBudgetTotals(budgetData.totals);
      setGoals(goalItems);
      setReportSummary(reportData);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRequestOtp = async (email: string) => {
    const response = await apiClient.requestOtp(email);
    setPendingEmail(email.trim().toLowerCase());
    if (response.debugOtpCode) {
      Alert.alert("Development OTP", `Use this OTP: ${response.debugOtpCode}`);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (!pendingEmail) return;

    const result = await apiClient.verifyOtp(pendingEmail, code);
    await saveSessionToken(result.token);
    setToken(result.token);
    await loadAuthenticatedData(result.token, budgetMonth, reportMonth);
    setPendingEmail("");
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!token) return;

    Alert.alert("Delete transaction", "Do you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await apiClient.deleteTransaction(token, transaction.id);
            await refreshAll();
          })();
        }
      }
    ]);
  };

  const handleSaveTransaction = async (payload: {
    categoryId: string | null;
    direction: "debit" | "credit" | "transfer";
    amount: number;
    currency: string;
    counterparty: string;
    note: string;
    occurredAt: string;
  }) => {
    if (!token) return;

    if (view === "transactionEdit" && editingTransaction) {
      await apiClient.updateTransaction(token, editingTransaction.id, payload);
    } else {
      await apiClient.createTransaction(token, payload);
    }

    setEditingTransaction(null);
    setView("transactions");
    await refreshAll();
  };

  const handleApplyBudgetMonth = async () => {
    if (!token) return;

    const budgetData = await apiClient.getBudgets(token, budgetMonth);
    setBudgets(budgetData.items);
    setBudgetTotals(budgetData.totals);
    setBudgetMonth(budgetData.month);
  };

  const handleApplyReportMonth = async () => {
    if (!token) return;

    const summary = await apiClient.getReportSummary(token, reportMonth);
    setReportSummary(summary);
    setReportMonth(summary.month);
  };

  const handleSaveBudget = async (payload: { categoryId: string; month: string; amount: number; currency: string }) => {
    if (!token) return;

    if (view === "budgetEdit" && editingBudget) {
      await apiClient.updateBudget(token, editingBudget.id, payload);
    } else {
      await apiClient.createBudget(token, payload);
    }

    setBudgetMonth(payload.month);
    setEditingBudget(null);
    setView("budgets");
    const budgetData = await apiClient.getBudgets(token, payload.month);
    setBudgets(budgetData.items);
    setBudgetTotals(budgetData.totals);
  };

  const handleDeleteBudget = async (budget: Budget) => {
    if (!token) return;

    Alert.alert("Delete budget", "Do you want to delete this budget?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await apiClient.deleteBudget(token, budget.id);
            const budgetData = await apiClient.getBudgets(token, budgetMonth);
            setBudgets(budgetData.items);
            setBudgetTotals(budgetData.totals);
          })();
        }
      }
    ]);
  };

  const handleSaveGoal = async (payload: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    currency: string;
    targetDate: string | null;
  }) => {
    if (!token) return;

    const createPayload: {
      name: string;
      targetAmount: number;
      currentAmount: number;
      currency: string;
      targetDate?: string;
    } = {
      name: payload.name,
      targetAmount: payload.targetAmount,
      currentAmount: payload.currentAmount,
      currency: payload.currency,
      ...(payload.targetDate ? { targetDate: payload.targetDate } : {})
    };

    if (view === "goalEdit" && editingGoal) {
      await apiClient.updateGoal(token, editingGoal.id, {
        ...createPayload,
        targetDate: payload.targetDate
      });
    } else {
      await apiClient.createGoal(token, createPayload);
    }

    setEditingGoal(null);
    setView("goals");
    setGoals(await apiClient.getGoals(token));
  };

  const handleDeleteGoal = async (goal: Goal) => {
    if (!token) return;

    Alert.alert("Delete goal", "Do you want to delete this goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await apiClient.deleteGoal(token, goal.id);
            setGoals(await apiClient.getGoals(token));
          })();
        }
      }
    ]);
  };

  const handleSmsIntent = async (enabled: boolean) => {
    if (!token) return;
    await apiClient.logSmsIntent(token, enabled);
    const outcome = resolveSmsIntentOutcome(enabled);
    Alert.alert(
      "Request recorded",
      `SMS detection remains disabled in this sprint. Requested: ${outcome.requestedEnabled ? "enable" : "disable"}.`
    );
  };

  const handleSignOut = async () => {
    if (token) {
      try {
        await apiClient.logout(token);
      } catch {
        // Ignore network errors while signing out locally.
      }
    }

    await clearSessionToken();
    setToken(null);
    setUser(null);
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setReportSummary(null);
    setReportMonth(getCurrentMonthToken());
    setCategories([]);
    setPendingEmail("");
    setView("dashboard");
  };

  if (isBooting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" translucent={false} backgroundColor="#eef4ff" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Preparing your workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" translucent={false} backgroundColor="#eef4ff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        {isAuthenticated ? (
          <View style={styles.headerActions}>
            <Pressable onPress={() => setView("dashboard")}>
              <Text style={styles.linkText}>Dashboard</Text>
            </Pressable>
            <Pressable onPress={() => setView("transactions")}>
              <Text style={styles.linkText}>Transactions</Text>
            </Pressable>
            <Pressable onPress={() => setView("budgets")}>
              <Text style={styles.linkText}>Budgets</Text>
            </Pressable>
            <Pressable onPress={() => setView("goals")}>
              <Text style={styles.linkText}>Goals</Text>
            </Pressable>
            <Pressable onPress={() => setView("settings")}>
              <Text style={styles.linkText}>Settings</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {!isAuthenticated ? (
        <ScrollView contentContainerStyle={styles.authContainer}>
          <Text style={styles.authMeta}>API Base: {apiClient.baseUrl}</Text>
          {authStage === "login" ? (
            <LoginScreen onRequestOtp={handleRequestOtp} />
          ) : (
            <OtpVerifyScreen email={pendingEmail} onBack={() => setPendingEmail("")} onVerify={handleVerifyOtp} />
          )}
        </ScrollView>
      ) : null}

      {isAuthenticated && view === "dashboard" ? (
        <DashboardScreen
          month={reportMonth}
          summary={reportSummary}
          refreshing={refreshing}
          onMonthChange={setReportMonth}
          onApplyMonth={handleApplyReportMonth}
          onRefresh={refreshAll}
          onOpenTransactions={() => setView("transactions")}
        />
      ) : null}

      {isAuthenticated && view === "transactions" ? (
        <TransactionsScreen
          items={transactions}
          refreshing={refreshing}
          onRefresh={refreshAll}
          onAdd={() => {
            setEditingTransaction(null);
            setView("transactionCreate");
          }}
          onEdit={(transaction) => {
            setEditingTransaction(transaction);
            setView("transactionEdit");
          }}
          onDelete={handleDeleteTransaction}
        />
      ) : null}

      {isAuthenticated && (view === "transactionCreate" || view === "transactionEdit") ? (
        <TransactionFormScreen
          categories={categories}
          initial={view === "transactionEdit" ? editingTransaction : null}
          onCancel={() => {
            setEditingTransaction(null);
            setView("transactions");
          }}
          onSubmit={handleSaveTransaction}
        />
      ) : null}

      {isAuthenticated && view === "budgets" ? (
        <BudgetsScreen
          month={budgetMonth}
          items={budgets}
          totals={budgetTotals}
          refreshing={refreshing}
          onMonthChange={setBudgetMonth}
          onApplyMonth={handleApplyBudgetMonth}
          onRefresh={refreshAll}
          onAdd={() => {
            setEditingBudget(null);
            setView("budgetCreate");
          }}
          onEdit={(budget) => {
            setEditingBudget(budget);
            setView("budgetEdit");
          }}
          onDelete={handleDeleteBudget}
        />
      ) : null}

      {isAuthenticated && (view === "budgetCreate" || view === "budgetEdit") ? (
        <BudgetFormScreen
          categories={categories}
          initial={view === "budgetEdit" ? editingBudget : null}
          month={budgetMonth}
          onCancel={() => {
            setEditingBudget(null);
            setView("budgets");
          }}
          onSubmit={handleSaveBudget}
        />
      ) : null}

      {isAuthenticated && view === "goals" ? (
        <GoalsScreen
          items={goals}
          refreshing={refreshing}
          onRefresh={refreshAll}
          onAdd={() => {
            setEditingGoal(null);
            setView("goalCreate");
          }}
          onEdit={(goal) => {
            setEditingGoal(goal);
            setView("goalEdit");
          }}
          onDelete={handleDeleteGoal}
        />
      ) : null}

      {isAuthenticated && (view === "goalCreate" || view === "goalEdit") ? (
        <GoalFormScreen
          initial={view === "goalEdit" ? editingGoal : null}
          onCancel={() => {
            setEditingGoal(null);
            setView("goals");
          }}
          onSubmit={handleSaveGoal}
        />
      ) : null}

      {isAuthenticated && view === "settings" ? (
        <SettingsScreen
          smsDisclosureVersion={bootstrap?.legal.smsDisclosureVersion ?? "sms_disclosure_v1"}
          onRequestEnable={handleSmsIntent}
          onSignOut={handleSignOut}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef4ff",
    paddingTop: Platform.OS === "android" ? (NativeStatusBar.currentHeight ?? 0) : 0
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  loadingText: {
    color: "#334155",
    fontWeight: "600"
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#dbe5f5",
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 20,
    color: "#0f172a",
    fontWeight: "800"
  },
  headerActions: {
    flexDirection: "row",
    gap: 12
  },
  linkText: {
    color: "#1d4ed8",
    fontWeight: "700"
  },
  authContainer: {
    padding: 16,
    gap: 12
  },
  authMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700"
  }
});
