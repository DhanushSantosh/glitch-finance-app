import { ReportSummaryPayload } from "./summary.js";

const csvEscape = (value: string | number): string => {
  const raw = String(value);
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

export const buildReportCsv = (summary: ReportSummaryPayload): string => {
  const lines: string[] = [];

  lines.push("section,key,value");
  lines.push(`meta,month,${csvEscape(summary.month)}`);
  lines.push(`meta,period_start,${csvEscape(summary.period.start)}`);
  lines.push(`meta,period_end_exclusive,${csvEscape(summary.period.endExclusive)}`);
  lines.push(`totals,income,${csvEscape(summary.totals.income)}`);
  lines.push(`totals,expense,${csvEscape(summary.totals.expense)}`);
  lines.push(`totals,transfer,${csvEscape(summary.totals.transfer)}`);
  lines.push(`totals,net,${csvEscape(summary.totals.net)}`);
  lines.push(`totals,transaction_count,${csvEscape(summary.totals.transactionCount)}`);
  lines.push(`totals,currency,${csvEscape(summary.totals.currency)}`);
  lines.push("");

  lines.push("top_categories,category_name,amount,transaction_count,currency");
  for (const item of summary.topCategories) {
    lines.push(
      [
        "top_categories",
        csvEscape(item.categoryName),
        csvEscape(item.amount),
        csvEscape(item.transactionCount),
        csvEscape(item.currency)
      ].join(",")
    );
  }

  lines.push("");
  lines.push("daily_series,date,income,expense,net,currency");
  for (const item of summary.dailySeries) {
    lines.push(
      [
        "daily_series",
        csvEscape(item.date),
        csvEscape(item.income),
        csvEscape(item.expense),
        csvEscape(item.net),
        csvEscape(item.currency)
      ].join(",")
    );
  }

  return `${lines.join("\n")}\n`;
};

const escapePdfText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const buildPdf = (lines: string[]): Buffer => {
  const maxRows = 44;
  const visibleLines = lines.slice(0, maxRows);
  const textCommands = visibleLines
    .map((line, index) => {
      const y = 800 - index * 16;
      return `1 0 0 1 40 ${y} Tm (${escapePdfText(line)}) Tj`;
    })
    .join("\n");

  const stream = `BT\n/F1 11 Tf\n${textCommands}\nET`;

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

export const buildReportPdf = (summary: ReportSummaryPayload): Buffer => {
  const lines: string[] = [
    `Glitch Finance Report - ${summary.month}`,
    "",
    `Period Start: ${summary.period.start}`,
    `Period End (Exclusive): ${summary.period.endExclusive}`,
    "",
    `Totals [${summary.totals.currency}]`,
    `Income: ${summary.totals.income.toFixed(2)}`,
    `Expense: ${summary.totals.expense.toFixed(2)}`,
    `Transfer: ${summary.totals.transfer.toFixed(2)}`,
    `Net: ${summary.totals.net.toFixed(2)}`,
    `Transactions: ${summary.totals.transactionCount}`,
    "",
    "Top Spending Categories"
  ];

  for (const category of summary.topCategories) {
    lines.push(`- ${category.categoryName}: ${category.amount.toFixed(2)} (${category.transactionCount} txns)`);
  }

  lines.push("");
  lines.push("Daily Net Series");
  for (const day of summary.dailySeries) {
    lines.push(`${day.date}: income ${day.income.toFixed(2)} | expense ${day.expense.toFixed(2)} | net ${day.net.toFixed(2)}`);
  }

  return buildPdf(lines);
};

