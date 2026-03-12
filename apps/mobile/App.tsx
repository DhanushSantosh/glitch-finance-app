import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, SafeAreaView, StatusBar as NativeStatusBar, Text, View } from "react-native";
import { apiClient } from "./src/api/client";
import { clearSessionToken, readSessionToken, saveSessionToken } from "./src/auth/sessionStore";
import { BottomTabBar, InlineMessage } from "./src/components/ui";
import { deriveAuthStage, getCurrentMonthToken, resolveSmsIntentOutcome } from "./src/flow/mobileFlow";
import { AppTabRoute, defaultTabRoute, emptyModalRoute, ModalRoute } from "./src/navigation/routes";
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
import { createStyles, theme } from "./src/theme";
import { BootstrapPayload, Budget, Category, Goal, ReportSummary, Transaction, TransactionListQuery, User } from "./src/types";
import { shiftMonthToken } from "./src/utils/month";

const emptyBudgetTotals = {
  budgeted: 0,
  spent: 0,
  remaining: 0
};

type TransactionFilters = {
  direction: "all" | "debit" | "credit" | "transfer";
  categoryId: "all" | string;
  from: string;
  to: string;
  sortBy: "occurredAt" | "amount";
  sortOrder: "asc" | "desc";
  pageSize: number;
};

const defaultTransactionFilters: TransactionFilters = {
  direction: "all",
  categoryId: "all",
  from: "",
  to: "",
  sortBy: "occurredAt",
  sortOrder: "desc",
  pageSize: 20
};

const emptyTransactionPagination = {
  page: 1,
  pageSize: defaultTransactionFilters.pageSize,
  hasMore: false,
  nextPage: null as number | null
};

const dateTokenPattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const parseDateToken = (value: string): Date | null => {
  if (!dateTokenPattern.test(value)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  const parsed = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return null;
  }

  return parsed;
};

const buildTransactionQuery = (filters: TransactionFilters, page: number): TransactionListQuery => {
  const fromDate = parseDateToken(filters.from);
  const toDate = parseDateToken(filters.to);

  if (toDate) {
    toDate.setUTCHours(23, 59, 59, 999);
  }

  return {
    page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    ...(filters.direction !== "all" ? { direction: filters.direction } : {}),
    ...(filters.categoryId !== "all" ? { categoryId: filters.categoryId } : {}),
    ...(fromDate ? { from: fromDate.toISOString() } : {}),
    ...(toDate ? { to: toDate.toISOString() } : {})
  };
};

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [pendingEmail, setPendingEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>(defaultTransactionFilters);
  const [transactionPagination, setTransactionPagination] = useState(emptyTransactionPagination);
  const [transactionLoadingMore, setTransactionLoadingMore] = useState(false);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetTotals, setBudgetTotals] = useState(emptyBudgetTotals);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [reportMonth, setReportMonth] = useState(getCurrentMonthToken());
  const [budgetMonth, setBudgetMonth] = useState(getCurrentMonthToken());
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<AppTabRoute>(defaultTabRoute);
  const [modalRoute, setModalRoute] = useState<ModalRoute>(emptyModalRoute);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const isAuthenticated = Boolean(token && user);
  const authStage = deriveAuthStage(pendingEmail, isAuthenticated);

  const fetchTransactions = async (
    sessionToken: string,
    filters: TransactionFilters,
    page: number,
    append: boolean
  ): Promise<void> => {
    const response = await apiClient.getTransactions(sessionToken, buildTransactionQuery(filters, page));

    setTransactions((previous) => (append ? [...previous, ...response.items] : response.items));
    setTransactionPagination(response.pagination);
  };

  const loadAuthenticatedData = async (sessionToken: string, budgetMonthToken: string, reportMonthToken: string) => {
    const initialFilters = defaultTransactionFilters;

    const [bootstrapPayload, currentUser, categoryItems, transactionData, budgetData, goalItems, reportData] = await Promise.all([
      apiClient.getBootstrap(),
      apiClient.me(sessionToken),
      apiClient.getCategories(sessionToken),
      apiClient.getTransactions(sessionToken, buildTransactionQuery(initialFilters, 1)),
      apiClient.getBudgets(sessionToken, budgetMonthToken),
      apiClient.getGoals(sessionToken),
      apiClient.getReportSummary(sessionToken, reportMonthToken)
    ]);

    setBootstrap(bootstrapPayload);
    setUser(currentUser);
    setCategories(categoryItems);
    setTransactionFilters(initialFilters);
    setTransactions(transactionData.items);
    setTransactionPagination(transactionData.pagination);
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
      const [categoryItems, transactionData, budgetData, goalItems, reportData] = await Promise.all([
        apiClient.getCategories(token),
        apiClient.getTransactions(token, buildTransactionQuery(transactionFilters, 1)),
        apiClient.getBudgets(token, budgetMonth),
        apiClient.getGoals(token),
        apiClient.getReportSummary(token, reportMonth)
      ]);

      setCategories(categoryItems);
      setTransactions(transactionData.items);
      setTransactionPagination(transactionData.pagination);
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
            await fetchTransactions(token, transactionFilters, 1, false);
          })();
        }
      }
    ]);
  };

  const handleApplyTransactionFilters = async () => {
    if (!token) return;
    await fetchTransactions(token, transactionFilters, 1, false);
  };

  const handleResetTransactionFilters = async () => {
    if (!token) return;
    setTransactionFilters(defaultTransactionFilters);
    await fetchTransactions(token, defaultTransactionFilters, 1, false);
  };

  const handleLoadMoreTransactions = async () => {
    if (!token || !transactionPagination.hasMore || !transactionPagination.nextPage) {
      return;
    }

    setTransactionLoadingMore(true);
    try {
      await fetchTransactions(token, transactionFilters, transactionPagination.nextPage, true);
    } finally {
      setTransactionLoadingMore(false);
    }
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

    if (modalRoute.kind === "transactionForm" && modalRoute.mode === "edit" && editingTransaction) {
      await apiClient.updateTransaction(token, editingTransaction.id, payload);
    } else {
      await apiClient.createTransaction(token, payload);
    }

    setEditingTransaction(null);
    setModalRoute(emptyModalRoute);
    setActiveTab("transactions");
    await fetchTransactions(token, transactionFilters, 1, false);
  };

  const handleApplyBudgetMonth = async () => {
    if (!token) return;

    const budgetData = await apiClient.getBudgets(token, budgetMonth);
    setBudgets(budgetData.items);
    setBudgetTotals(budgetData.totals);
    setBudgetMonth(budgetData.month);
  };

  const handleShiftBudgetMonth = async (delta: number) => {
    if (!token) return;

    const nextMonth = shiftMonthToken(budgetMonth, delta);
    setBudgetMonth(nextMonth);

    const budgetData = await apiClient.getBudgets(token, nextMonth);
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

    if (modalRoute.kind === "budgetForm" && modalRoute.mode === "edit" && editingBudget) {
      await apiClient.updateBudget(token, editingBudget.id, payload);
    } else {
      await apiClient.createBudget(token, payload);
    }

    setBudgetMonth(payload.month);
    setEditingBudget(null);
    setModalRoute(emptyModalRoute);
    setActiveTab("budgets");
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

    if (modalRoute.kind === "goalForm" && modalRoute.mode === "edit" && editingGoal) {
      await apiClient.updateGoal(token, editingGoal.id, {
        ...createPayload,
        targetDate: payload.targetDate
      });
    } else {
      await apiClient.createGoal(token, createPayload);
    }

    setEditingGoal(null);
    setModalRoute(emptyModalRoute);
    setActiveTab("goals");
    setGoals(await apiClient.getGoals(token));
  };

  const handleContributeGoal = async (goal: Goal, increment: number) => {
    if (!token) return;

    const nextCurrentAmount = Number((goal.currentAmount + increment).toFixed(2));

    await apiClient.updateGoal(token, goal.id, {
      currentAmount: nextCurrentAmount
    });

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
    let remoteLogoutFailed = false;

    if (token) {
      try {
        await apiClient.logout(token);
      } catch {
        remoteLogoutFailed = true;
      }
    }

    await clearSessionToken();
    setToken(null);
    setUser(null);
    setTransactions([]);
    setTransactionFilters(defaultTransactionFilters);
    setTransactionPagination(emptyTransactionPagination);
    setBudgets([]);
    setGoals([]);
    setReportSummary(null);
    setReportMonth(getCurrentMonthToken());
    setCategories([]);
    setPendingEmail("");
    setActiveTab(defaultTabRoute);
    setModalRoute(emptyModalRoute);
    setEditingTransaction(null);
    setEditingBudget(null);
    setEditingGoal(null);

    if (remoteLogoutFailed) {
      Alert.alert("Signed out locally", "Could not complete server logout due to a network issue, but this device session is cleared.");
    }
  };

  const renderActiveContent = () => {
    if (modalRoute.kind === "transactionForm") {
      return (
        <TransactionFormScreen
          categories={categories}
          initial={modalRoute.mode === "edit" ? editingTransaction : null}
          onCancel={() => {
            setEditingTransaction(null);
            setModalRoute(emptyModalRoute);
          }}
          onSubmit={handleSaveTransaction}
        />
      );
    }

    if (modalRoute.kind === "budgetForm") {
      return (
        <BudgetFormScreen
          categories={categories}
          initial={modalRoute.mode === "edit" ? editingBudget : null}
          month={budgetMonth}
          onCancel={() => {
            setEditingBudget(null);
            setModalRoute(emptyModalRoute);
          }}
          onSubmit={handleSaveBudget}
        />
      );
    }

    if (modalRoute.kind === "goalForm") {
      return (
        <GoalFormScreen
          initial={modalRoute.mode === "edit" ? editingGoal : null}
          onCancel={() => {
            setEditingGoal(null);
            setModalRoute(emptyModalRoute);
          }}
          onSubmit={handleSaveGoal}
        />
      );
    }

    if (activeTab === "dashboard") {
      return (
        <DashboardScreen
          month={reportMonth}
          summary={reportSummary}
          refreshing={refreshing}
          onMonthChange={setReportMonth}
          onApplyMonth={handleApplyReportMonth}
          onRefresh={refreshAll}
          onOpenTransactions={() => setActiveTab("transactions")}
        />
      );
    }

    if (activeTab === "transactions") {
      return (
        <TransactionsScreen
          items={transactions}
          categories={categories}
          filters={transactionFilters}
          pagination={transactionPagination}
          refreshing={refreshing}
          loadingMore={transactionLoadingMore}
          onRefresh={refreshAll}
          onFilterChange={(patch) => setTransactionFilters((current) => ({ ...current, ...patch }))}
          onApplyFilters={handleApplyTransactionFilters}
          onResetFilters={handleResetTransactionFilters}
          onLoadMore={handleLoadMoreTransactions}
          onAdd={() => {
            setEditingTransaction(null);
            setModalRoute({ kind: "transactionForm", mode: "create" });
          }}
          onEdit={(transaction) => {
            setEditingTransaction(transaction);
            setModalRoute({ kind: "transactionForm", mode: "edit" });
          }}
          onDelete={handleDeleteTransaction}
        />
      );
    }

    if (activeTab === "budgets") {
      return (
        <BudgetsScreen
          month={budgetMonth}
          items={budgets}
          totals={budgetTotals}
          refreshing={refreshing}
          onMonthChange={setBudgetMonth}
          onApplyMonth={handleApplyBudgetMonth}
          onPreviousMonth={() => handleShiftBudgetMonth(-1)}
          onNextMonth={() => handleShiftBudgetMonth(1)}
          onRefresh={refreshAll}
          onAdd={() => {
            setEditingBudget(null);
            setModalRoute({ kind: "budgetForm", mode: "create" });
          }}
          onEdit={(budget) => {
            setEditingBudget(budget);
            setModalRoute({ kind: "budgetForm", mode: "edit" });
          }}
          onDelete={handleDeleteBudget}
        />
      );
    }

    if (activeTab === "goals") {
      return (
        <GoalsScreen
          items={goals}
          refreshing={refreshing}
          onRefresh={refreshAll}
          onAdd={() => {
            setEditingGoal(null);
            setModalRoute({ kind: "goalForm", mode: "create" });
          }}
          onEdit={(goal) => {
            setEditingGoal(goal);
            setModalRoute({ kind: "goalForm", mode: "edit" });
          }}
          onDelete={handleDeleteGoal}
          onContribute={handleContributeGoal}
        />
      );
    }

    return (
      <SettingsScreen
        smsDisclosureVersion={bootstrap?.legal.smsDisclosureVersion ?? "sms_disclosure_v1"}
        onRequestEnable={handleSmsIntent}
        onSignOut={handleSignOut}
      />
    );
  };

  if (isBooting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" translucent={false} backgroundColor={theme.color.bgBase} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.color.actionPrimary} />
          <Text style={styles.loadingText}>Preparing your workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" translucent={false} backgroundColor={theme.color.bgBase} />
        <View style={styles.authShell}>
          <View style={styles.authMetaWrap}>
            <InlineMessage tone="info" text={`API Base: ${apiClient.baseUrl}`} />
          </View>
          <View style={styles.flexFill}>
            {authStage === "login" ? (
              <LoginScreen onRequestOtp={handleRequestOtp} />
            ) : (
              <OtpVerifyScreen email={pendingEmail} onBack={() => setPendingEmail("")} onVerify={handleVerifyOtp} />
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" translucent={false} backgroundColor={theme.color.bgBase} />
      <View style={styles.appShell}>
        <View style={styles.flexFill}>{renderActiveContent()}</View>
        {modalRoute.kind === "none" ? <BottomTabBar activeRoute={activeTab} onChange={setActiveTab} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.color.bgBase,
    paddingTop: Platform.OS === "android" ? (NativeStatusBar.currentHeight ?? 0) : 0
  },
  flexFill: {
    flex: 1
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm
  },
  loadingText: {
    color: theme.color.textSecondary,
    fontWeight: "600"
  },
  authShell: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm
  },
  authMetaWrap: {
    paddingHorizontal: theme.spacing.sm
  },
  appShell: {
    flex: 1,
    backgroundColor: theme.color.bgBase
  }
}));
