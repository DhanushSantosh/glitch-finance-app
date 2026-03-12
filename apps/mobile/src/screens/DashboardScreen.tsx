import { Text, View, Dimensions } from "react-native";
import { AppHeader, Button, Card, EmptyState, ListItem, Screen, StatTile, TextField } from "../components/ui";
import { createStyles, theme } from "../theme";
import { ReportSummary } from "../types";
import { formatDateToken, formatMoney } from "../utils/format";
import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, Activity } from "lucide-react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";

type DashboardScreenProps = {
  month: string;
  summary: ReportSummary | null;
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

export const DashboardScreen = ({
  month,
  summary,
  refreshing,
  onMonthChange,
  onApplyMonth,
  onRefresh,
  onOpenTransactions
}: DashboardScreenProps) => {
  const currency = summary?.totals.currency ?? "INR";
  const latestSeries = summary?.dailySeries.slice(-7) ?? [];
  const netFlow = summary?.totals.net ?? 0;
  const isPositiveFlow = netFlow >= 0;

  // Chart Calculations
  const chartHeight = 120;
  const chartWidth = windowWidth - theme.spacing.xl * 2 - theme.spacing.lg * 2; // Screen padding + Card padding
  const maxNet = Math.max(...latestSeries.map(d => d.net), 1);
  const minNet = Math.min(...latestSeries.map(d => d.net), 0);
  const range = maxNet - minNet || 1;
  
  const chartPoints = latestSeries.map((day, index) => {
    const x = (index / (Math.max(latestSeries.length - 1, 1))) * chartWidth;
    // Invert Y axis (SVG 0,0 is top left) and add padding
    const y = chartHeight - ((day.net - minNet) / range) * (chartHeight - 20) - 10;
    return { x, y, net: day.net };
  });

  const chartPath = createBezierPath(chartPoints);
  const chartFillPath = `${chartPath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <AppHeader
        title="Overview"
        subtitle="Financial telemetry."
        rightSlot={<Button label="Log Entry" variant="primary" onPress={onOpenTransactions} style={{ minHeight: 40, paddingHorizontal: 20 }} />}
      />

      <View style={styles.heroSection}>
        <View style={styles.netFlowContainer}>
          <View style={styles.heroIconWrap}>
            <Wallet size={24} color={theme.color.textMuted} />
            <Text style={styles.netFlowLabel}>NET FLOW</Text>
          </View>
          <Text style={[styles.netFlowValue, isPositiveFlow ? styles.positive : styles.negative]}>
            {formatMoney(netFlow, currency)}
          </Text>
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatTile label="INFLOW" value={formatMoney(summary?.totals.income ?? 0, currency)} tone="positive" />
        <StatTile label="OUTFLOW" value={formatMoney(summary?.totals.expense ?? 0, currency)} tone="negative" />
      </View>

      <Card variant="glass" style={styles.chartCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <Activity size={20} color={theme.color.actionPrimary} />
            <Text style={styles.sectionTitle}>Activity Trend</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Last 7 Days (Net)</Text>
        </View>

        {latestSeries.length < 2 ? (
          <EmptyState
            title="Insufficient Data"
            description="Log more days to generate the trend visualization."
          />
        ) : (
          <View style={styles.chartContainer}>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.color.actionPrimary} stopOpacity="0.3" />
                  <Stop offset="1" stopColor={theme.color.actionPrimary} stopOpacity="0.0" />
                </LinearGradient>
              </Defs>
              <Path d={chartFillPath} fill="url(#gradient)" />
              <Path d={chartPath} fill="none" stroke={theme.color.actionPrimary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {chartPoints.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r="4" fill={theme.color.bgBase} stroke={theme.color.actionPrimary} strokeWidth="2" />
              ))}
            </Svg>
            <View style={styles.chartXAxis}>
              {latestSeries.map((d, i) => (
                <Text key={i} style={styles.chartLabel}>
                  {d.date.split("-")[2]} {/* Just the day */}
                </Text>
              ))}
            </View>
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
                  <Text style={styles.trailingAmount}>{formatMoney(category.amount, currency)}</Text>
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
    fontSize: theme.typography.label,
    fontWeight: "700",
    letterSpacing: 2
  },
  netFlowValue: {
    color: theme.color.textPrimary,
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 60
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


