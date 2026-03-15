#!/usr/bin/env node

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const PERF_BEARER_TOKEN = process.env.PERF_BEARER_TOKEN ?? "";
const PERF_ITERATIONS = Number.parseInt(process.env.PERF_ITERATIONS ?? "20", 10);
const PERF_P95_THRESHOLD_MS = Number.parseInt(process.env.PERF_P95_THRESHOLD_MS ?? "300", 10);
const PERF_REQUEST_TIMEOUT_MS = Number.parseInt(process.env.PERF_REQUEST_TIMEOUT_MS ?? "12000", 10);
const PERF_CATEGORY_ID = process.env.PERF_CATEGORY_ID ?? "";

if (!PERF_BEARER_TOKEN) {
  console.error("[perf-smoke] PERF_BEARER_TOKEN is required.");
  process.exit(1);
}

const fetchWithTimeout = async (url, init = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PERF_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const requestJson = async ({ method, path, body }) => {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${PERF_BEARER_TOKEN}`
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const startedAt = performance.now();
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const endedAt = performance.now();
  const durationMs = endedAt - startedAt;

  const responseText = await response.text();
  const json = responseText ? JSON.parse(responseText) : null;

  return { response, json, durationMs };
};

const percentile = (values, target) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(target * sorted.length) - 1);
  return sorted[index];
};

const ensureOk = (response, label, json) => {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${label} failed with status ${response.status}. Body: ${JSON.stringify(json)}`);
  }
};

const run = async () => {
  console.log(`[perf-smoke] API base: ${API_BASE_URL}`);
  console.log(`[perf-smoke] Iterations: ${PERF_ITERATIONS}`);
  console.log(`[perf-smoke] p95 threshold (ms): ${PERF_P95_THRESHOLD_MS}`);

  let categoryId = PERF_CATEGORY_ID;
  if (!categoryId) {
    const categories = await requestJson({ method: "GET", path: "/api/v1/categories" });
    ensureOk(categories.response, "GET /api/v1/categories", categories.json);
    categoryId = categories.json?.items?.find?.((item) => item.direction === "debit")?.id ?? "";
    if (!categoryId) {
      throw new Error("No debit category found and PERF_CATEGORY_ID was not provided.");
    }
  }

  const transactionGetLatencies = [];
  const transactionWriteLatencies = [];
  const createdTransactionIds = [];

  // Warmup
  await requestJson({ method: "GET", path: "/api/v1/transactions?page=1&pageSize=20&sortBy=occurredAt&sortOrder=desc" });

  for (let index = 0; index < PERF_ITERATIONS; index += 1) {
    const listResponse = await requestJson({
      method: "GET",
      path: "/api/v1/transactions?page=1&pageSize=20&sortBy=occurredAt&sortOrder=desc"
    });
    ensureOk(listResponse.response, "GET /api/v1/transactions", listResponse.json);
    transactionGetLatencies.push(listResponse.durationMs);

    const occurredAt = new Date(Date.now() - index * 1000).toISOString();
    const createResponse = await requestJson({
      method: "POST",
      path: "/api/v1/transactions",
      body: {
        direction: "debit",
        amount: Number((100 + (index % 50) + 0.55).toFixed(2)),
        currency: "INR",
        categoryId,
        counterparty: "perf-smoke",
        note: "perf-smoke",
        occurredAt
      }
    });
    ensureOk(createResponse.response, "POST /api/v1/transactions", createResponse.json);
    transactionWriteLatencies.push(createResponse.durationMs);

    const transactionId = createResponse.json?.item?.id;
    if (transactionId) {
      createdTransactionIds.push(transactionId);
    }
  }

  const getP95 = percentile(transactionGetLatencies, 0.95);
  const writeP95 = percentile(transactionWriteLatencies, 0.95);
  const getAvg = transactionGetLatencies.reduce((acc, value) => acc + value, 0) / transactionGetLatencies.length;
  const writeAvg = transactionWriteLatencies.reduce((acc, value) => acc + value, 0) / transactionWriteLatencies.length;

  // Best-effort cleanup
  for (const transactionId of createdTransactionIds) {
    try {
      await requestJson({
        method: "DELETE",
        path: `/api/v1/transactions/${transactionId}`
      });
    } catch {
      // Ignore cleanup failures in smoke mode.
    }
  }

  console.log(`[perf-smoke] GET /transactions avg=${getAvg.toFixed(2)}ms p95=${getP95.toFixed(2)}ms`);
  console.log(`[perf-smoke] POST /transactions avg=${writeAvg.toFixed(2)}ms p95=${writeP95.toFixed(2)}ms`);

  if (getP95 > PERF_P95_THRESHOLD_MS) {
    throw new Error(
      `GET /api/v1/transactions p95 ${getP95.toFixed(2)}ms exceeded threshold ${PERF_P95_THRESHOLD_MS}ms`
    );
  }

  if (writeP95 > PERF_P95_THRESHOLD_MS) {
    throw new Error(
      `POST /api/v1/transactions p95 ${writeP95.toFixed(2)}ms exceeded threshold ${PERF_P95_THRESHOLD_MS}ms`
    );
  }

  console.log("[perf-smoke] Performance smoke checks passed.");
};

run().catch((error) => {
  console.error(`[perf-smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
