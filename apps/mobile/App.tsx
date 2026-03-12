import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View, Alert, Pressable } from "react-native";
import { apiClient } from "./src/api/client";
import { clearSessionToken, readSessionToken, saveSessionToken } from "./src/auth/sessionStore";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OtpVerifyScreen } from "./src/screens/OtpVerifyScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { TransactionFormScreen } from "./src/screens/TransactionFormScreen";
import { TransactionsScreen } from "./src/screens/TransactionsScreen";
import { deriveAuthStage, resolveSmsIntentOutcome } from "./src/flow/mobileFlow";
import { BootstrapPayload, Category, Transaction, User } from "./src/types";

type AppView = "transactions" | "create" | "edit" | "settings";

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [pendingEmail, setPendingEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<AppView>("transactions");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const isAuthenticated = Boolean(token && user);
  const authStage = deriveAuthStage(pendingEmail, isAuthenticated);

  const headerTitle = useMemo(() => {
    if (view === "create") return "Add Transaction";
    if (view === "edit") return "Edit Transaction";
    if (view === "settings") return "Settings";
    return "Quantex25";
  }, [view]);

  const loadAuthenticatedData = async (sessionToken: string) => {
    const [bootstrapPayload, currentUser, categoryItems, transactionItems] = await Promise.all([
      apiClient.getBootstrap(),
      apiClient.me(sessionToken),
      apiClient.getCategories(sessionToken),
      apiClient.getTransactions(sessionToken)
    ]);

    setBootstrap(bootstrapPayload);
    setUser(currentUser);
    setCategories(categoryItems);
    setTransactions(transactionItems);
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
        await loadAuthenticatedData(storedToken);
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
    await loadAuthenticatedData(result.token);
    setPendingEmail("");
  };

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const [categoryItems, transactionItems] = await Promise.all([apiClient.getCategories(token), apiClient.getTransactions(token)]);
      setCategories(categoryItems);
      setTransactions(transactionItems);
    } finally {
      setRefreshing(false);
    }
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
            await handleRefresh();
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

    if (view === "edit" && editingTransaction) {
      await apiClient.updateTransaction(token, editingTransaction.id, payload);
    } else {
      await apiClient.createTransaction(token, payload);
    }

    setEditingTransaction(null);
    setView("transactions");
    await handleRefresh();
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
    setCategories([]);
    setPendingEmail("");
    setView("transactions");
  };

  if (isBooting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Preparing your workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        {isAuthenticated ? (
          <View style={styles.headerActions}>
            <Pressable onPress={() => setView("transactions")}> 
              <Text style={styles.linkText}>Home</Text>
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

      {isAuthenticated && view === "transactions" ? (
        <TransactionsScreen
          items={transactions}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onAdd={() => {
            setEditingTransaction(null);
            setView("create");
          }}
          onEdit={(transaction) => {
            setEditingTransaction(transaction);
            setView("edit");
          }}
          onDelete={handleDeleteTransaction}
        />
      ) : null}

      {isAuthenticated && (view === "create" || view === "edit") ? (
        <TransactionFormScreen
          categories={categories}
          initial={view === "edit" ? editingTransaction : null}
          onCancel={() => {
            setEditingTransaction(null);
            setView("transactions");
          }}
          onSubmit={handleSaveTransaction}
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
    backgroundColor: "#eef4ff"
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
