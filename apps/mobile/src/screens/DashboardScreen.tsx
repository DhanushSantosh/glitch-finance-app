import { Text, View, Dimensions } from "react-native";
import { AppHeader, Button, Card, EmptyState, ListItem, Screen, StatTile, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { ExchangeRateSnapshot, ReportSummary, UserProfile } from "../types";
import { formatMoney } from "../utils/format";
import { RegionalPreferences } from "../utils/regional";
import { shouldShowConvertedAmount } from "../utils/exchange";
import { TrendingUp, ArrowDownRight, ArrowUpRight, Activity } from "lucide-react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { useEffect, useState } from "react";

type DashboardScreenProps = {
  month: string;
  summary: ReportSummary | null;
  profile?: UserProfile | null;
  exchangeRates: ExchangeRateSnapshot | null;
  regionalPreferences: RegionalPreferences;
  refreshing: boolean;
  onMonthChange: (value: string) => void;
  onApplyMonth: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenTransactions: () => void;
};

const windowWidth = Dimensions.get("window").width;

// Helper to generate a smooth bezier curve for the chart
const createBezierPath = (points: {x: number, y: number}[]) => {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) / 2;
    const cp1y = p0.y;
    const cp2x = p1.x - (p1.x - p0.x) / 2;
    const cp2y = p1.y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  return d;
};

const greetings = [
  "Looking wealthy,",
  "Cash money,",
  "Stay liquid,",
  "Welcome back,",
  "Big moves,",
  "Hello boss,",
  "Money talks,"
];

export const DashboardScreen = ({
  month,
  summary,
  profile,
  exchangeRates,
  regionalPreferences,
  refreshing,
  onMonthChange,
  onApplyMonth,
  onRefresh,
  onOpenTransactions
}: DashboardScreenProps) => {
  const [greetingIndex, setGreetingIndex] = useState(0);

  useEffect(() => {
    // Change greeting every 30 seconds
    const interval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % greetings.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const currency = summary?.totals.currency ?? regionalPreferences.currency;
  const showsConvertedPortfolio = shouldShowConvertedAmount(profile?.currency ?? currency, exchangeRates);
  const latestSeries = summary?.dailySeries.slice(-7) ?? [];
  const netFlow = summary?.totals.net ?? 0;
  const isPositiveFlow = netFlow >= 0;

  const resolvedName = profile?.displayName?.trim() || profile?.firstName?.trim() || "Agent";
  const currentGreeting = greetings[greetingIndex];

  // Chart Calculations
  const chartHeight = 140;
  const chartWidth = windowWidth - theme.spacing.xl * 2 - theme.spacing.lg * 2; 
  const maxNet = Math.max(...latestSeries.map(d => d.net), 1);
  const minNet = Math.min(...latestSeries.map(d => d.net), 0);
  const range = maxNet - minNet || 1;
  
  // Create more data points for a smoother curve if needed, but here we just use what we have
  const chartPoints = latestSeries.map((day, index) => {
    const x = (index / (Math.max(latestSeries.length - 1, 1))) * chartWidth;
    const y = chartHeight - ((day.net - minNet) / range) * (chartHeight - 40) - 20;
    return { x, y };
  });

  const chartPath = createBezierPath(chartPoints);
  const chartFillPath = `${chartPath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <AppHeader
        title={`${currentGreeting}\n${resolvedName}`}
        rightSlot={<Button label="+" variant="primary" onPress={onOpenTransactions} style={{ minHeight: 44, width: 44, borderRadius: 22, paddingHorizontal: 0 }} />}
      />

      <View style={styles.heroSection}>
        <View style={styles.netFlowContainer}>
          <Text style={styles.netFlowLabel}>CURRENT LIQUIDITY</Text>
          <Text style={[styles.netFlowValue, isPositiveFlow ? styles.positive : styles.negative]}>
            {formatMoney(netFlow, currency, regionalPreferences)}
          </Text>
          <View style={styles.heroBadge}>
            <Activity size={12} color={isPositiveFlow ? theme.color.statusSuccess : theme.color.statusError} />
            <Text style={[styles.heroBadgeText, { color: isPositiveFlow ? theme.color.statusSuccess : theme.color.statusError }]}>
              {isPositiveFlow ? "OPTIMIZED" : "ATTENTION"}
            </Text>
          </View>
          <Text style={styles.currencyContext}>
            DISPLAYING {currency}
            {showsConvertedPortfolio ? ` · FX ${exchangeRates?.asOf ?? "LIVE"}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatTile 
          label="INFLOW" 
          value={formatMoney(summary?.totals.income ?? 0, currency, regionalPreferences)} 
          tone="positive" 
          icon={<ArrowUpRight size={14} color={theme.color.statusSuccess} />}
        />
        <StatTile 
          label="OUTFLOW" 
          value={formatMoney(summary?.totals.expense ?? 0, currency, regionalPreferences)} 
          tone="negative" 
          icon={<ArrowDownRight size={14} color={theme.color.statusError} />}
        />
      </View>

      <Card variant="glass" style={styles.chartCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Capital Flux</Text>
          <Text style={styles.sectionSubtitle}>Last 7 Trading Days</Text>
        </View>

        {latestSeries.length < 2 ? (
          <EmptyState
            title="NO DATA"
            description="Log activity to initialize telemetry."
          />
        ) : (
          <View style={styles.chartContainer}>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.color.actionPrimary} stopOpacity="0.4" />
                  <Stop offset="0.6" stopColor={theme.color.actionPrimary} stopOpacity="0.1" />
                  <Stop offset="1" stopColor={theme.color.actionPrimary} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Path d={chartFillPath} fill="url(#gradient)" />
              <Path d={chartPath} fill="none" stroke={theme.color.actionPrimary} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {/* Glowing active point (latest) */}
              <Circle 
                cx={chartPoints[chartPoints.length - 1].x} 
                cy={chartPoints[chartPoints.length - 1].y} 
                r="6" 
                fill={theme.color.actionPrimary} 
              />
              <Circle 
                cx={chartPoints[chartPoints.length - 1].x} 
                cy={chartPoints[chartPoints.length - 1].y} 
                r="12" 
                fill={theme.color.actionPrimary} 
                fillOpacity="0.2" 
              />
            </Svg>
          </View>
        )}
      </Card>

      <Card variant="glass" style={styles.filterCard}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <TextField
              label="REPORTING PERIOD"
              value={month}
              onChangeText={onMonthChange}
              autoCapitalize="none"
              style={styles.compactInput}
              containerStyle={{ marginBottom: 0 }}
              placeholder="YYYY-MM"
            />
          </View>
          <Button label="SYNC" variant="secondary" onPress={() => void onApplyMonth()} style={styles.syncButton} />
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <TrendingUp size={20} color={theme.color.textPrimary} />
            <Text style={styles.sectionTitle}>Spending Matrix</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Highest Outflow Categories</Text>
        </View>
        {!summary || summary.topCategories.length === 0 ? (
          <EmptyState
            title="Clean Slate"
            description="Track your first debit to establish your matrix."
          />
        ) : null}

        <View style={styles.listContainer}>
          {summary?.topCategories.map((category) => (
            <ListItem
              key={`${category.categoryId ?? "uncategorized"}-${category.categoryName}`}
              title={category.categoryName}
              subtitle={`${category.transactionCount} entries logged`}
              trailing={
                <View style={styles.trailingContainer}>
                  <ArrowDownRight size={16} color={theme.color.statusError} style={{ marginRight: 4 }} />
                  <Text style={styles.trailingAmount}>{formatMoney(category.amount, currency, regionalPreferences)}</Text>
                </View>
              }
            />
          ))}
        </View>
      </Card>
    </Screen>
  );
};

const styles = createStyles(() => ({
  heroSection: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  netFlowContainer: {
    alignItems: "center",
    gap: theme.spacing.sm
  },
  heroIconWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  netFlowLabel: {
    color: theme.color.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2
  },
  netFlowValue: {
    color: theme.color.textPrimary,
    fontSize: 64,
    fontWeight: "900",
    letterSpacing: -3,
    lineHeight: 72
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginTop: theme.spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  currencyContext: {
    marginTop: theme.spacing.sm,
    color: theme.color.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4
  },
  statGrid: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  filterCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.color.bgElevated
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm
  },
  compactInput: {
    marginBottom: 0
  },
  syncButton: {
    minHeight: 52,
    paddingHorizontal: 24
  },
  chartCard: {
    padding: theme.spacing.lg
  },
  chartContainer: {
    marginTop: theme.spacing.lg,
    alignItems: "center"
  },
  chartXAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: theme.spacing.md,
    paddingHorizontal: 4
  },
  chartLabel: {
    color: theme.color.textMuted,
    fontSize: 10,
    fontWeight: "700"
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
    gap: 4
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  sectionTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.heading,
    fontWeight: "900",
    letterSpacing: -0.5
  },
  sectionSubtitle: {
    color: theme.color.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  listContainer: {
    gap: theme.spacing.sm
  },
  trailingContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  trailingAmount: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.body,
    fontWeight: "800",
    letterSpacing: -0.5
  },
  positive: {
    color: theme.color.statusSuccess
  },
  negative: {
    color: theme.color.textPrimary // In premium apps, negative balance is often white/black, just distinguished by minus sign, but we keep it neutral here to not scream ERROR
  }
}));
