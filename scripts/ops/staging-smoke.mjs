#!/usr/bin/env node

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const SMOKE_TEST_EMAIL = process.env.SMOKE_TEST_EMAIL ?? `smoke-${Date.now()}@example.com`;
const SMOKE_BEARER_TOKEN = process.env.SMOKE_BEARER_TOKEN ?? "";
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.SMOKE_REQUEST_TIMEOUT_MS ?? "12000", 10);
const EXPECT_STATUS_ENDPOINT = (process.env.SMOKE_EXPECT_STATUS_ENDPOINT ?? "true").toLowerCase() === "true";
const EXPECT_METRICS_ENDPOINT = (process.env.SMOKE_EXPECT_METRICS_ENDPOINT ?? "false").toLowerCase() === "true";

const nowIso = new Date().toISOString();
const monthToken = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;

const fetchWithTimeout = async (url, init = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const readJson = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const requestJson = async ({ method, path, token = "", body }) => {
  const headers = {
    Accept: "application/json"
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const json = await readJson(response);
  return { response, json };
};

const ensureStatus = (response, json, expected, label) => {
  if (response.status !== expected) {
    const details = json ? JSON.stringify(json) : "<empty>";
    throw new Error(`${label} failed. Expected ${expected}, got ${response.status}. Body: ${details}`);
  }
};

const run = async () => {
  console.log(`[smoke] API base: ${API_BASE_URL}`);

  const health = await requestJson({ method: "GET", path: "/health" });
  ensureStatus(health.response, health.json, 200, "GET /health");
  console.log("[smoke] /health ok");

  const status = await requestJson({ method: "GET", path: "/api/v1/status" });
  if (EXPECT_STATUS_ENDPOINT) {
    ensureStatus(status.response, status.json, 200, "GET /api/v1/status");
    console.log("[smoke] /api/v1/status ok");

    if (status.json?.otpDelivery?.provider === "resend" && !status.json?.otpDelivery?.ready) {
      throw new Error("OTP provider is set to resend but reported as not ready.");
    }
  } else {
    ensureStatus(status.response, status.json, 404, "GET /api/v1/status");
    if (status.json?.error?.code !== "STATUS_ENDPOINT_DISABLED") {
      throw new Error("Status endpoint returned 404 but did not expose STATUS_ENDPOINT_DISABLED.");
    }
    console.log("[smoke] /api/v1/status disabled as expected");
  }

  const bootstrap = await requestJson({ method: "GET", path: "/api/v1/bootstrap" });
  ensureStatus(bootstrap.response, bootstrap.json, 200, "GET /api/v1/bootstrap");
  console.log("[smoke] /api/v1/bootstrap ok");

  const metricsResponse = await fetchWithTimeout(`${API_BASE_URL}/api/v1/metrics`);
  if (EXPECT_METRICS_ENDPOINT) {
    if (metricsResponse.status !== 200) {
      throw new Error(`GET /api/v1/metrics failed with status ${metricsResponse.status}`);
    }
    const metricsText = await metricsResponse.text();
    if (!metricsText.includes("glitch_api_http_requests_total")) {
      throw new Error("Metrics endpoint missing glitch_api_http_requests_total.");
    }
    console.log("[smoke] /api/v1/metrics ok");
  } else {
    const metricsJson = await readJson(metricsResponse);
    if (metricsResponse.status !== 404) {
      throw new Error(`GET /api/v1/metrics expected 404 when disabled, got ${metricsResponse.status}`);
    }
    if (metricsJson?.error?.code !== "METRICS_ENDPOINT_DISABLED") {
      throw new Error("Metrics endpoint returned 404 but did not expose METRICS_ENDPOINT_DISABLED.");
    }
    console.log("[smoke] /api/v1/metrics disabled as expected");
  }

  const otpRequest = await requestJson({
    method: "POST",
    path: "/api/v1/auth/request-otp",
    body: { email: SMOKE_TEST_EMAIL }
  });
  ensureStatus(otpRequest.response, otpRequest.json, 200, "POST /api/v1/auth/request-otp");
  console.log("[smoke] OTP request accepted");

  let token = "";
  if (typeof otpRequest.json?.debugOtpCode === "string") {
    const otpVerify = await requestJson({
      method: "POST",
      path: "/api/v1/auth/verify-otp",
      body: { email: SMOKE_TEST_EMAIL, code: otpRequest.json.debugOtpCode }
    });
    ensureStatus(otpVerify.response, otpVerify.json, 200, "POST /api/v1/auth/verify-otp");
    token = otpVerify.json?.token ?? "";
    console.log("[smoke] OTP verify succeeded with debug code");
  } else if (SMOKE_BEARER_TOKEN) {
    token = SMOKE_BEARER_TOKEN;
    console.log("[smoke] No debug OTP code (likely resend provider); using SMOKE_BEARER_TOKEN for auth checks");
  } else {
    throw new Error(
      "OTP verification requires debugOtpCode or SMOKE_BEARER_TOKEN. Set SMOKE_BEARER_TOKEN for staging/prod resend checks."
    );
  }

  const categories = await requestJson({
    method: "GET",
    path: "/api/v1/categories",
    token
  });
  ensureStatus(categories.response, categories.json, 200, "GET /api/v1/categories");
  const debitCategory = categories.json?.items?.find?.((item) => item.direction === "debit");
  if (!debitCategory?.id) {
    throw new Error("No debit category found for smoke transaction.");
  }
  console.log("[smoke] Category lookup ok");

  const createTransaction = await requestJson({
    method: "POST",
    path: "/api/v1/transactions",
    token,
    body: {
      direction: "debit",
      amount: 123.45,
      currency: "INR",
      categoryId: debitCategory.id,
      counterparty: "Smoke Test Merchant",
      note: "staging-smoke",
      occurredAt: nowIso
    }
  });
  ensureStatus(createTransaction.response, createTransaction.json, 200, "POST /api/v1/transactions");
  const transactionId = createTransaction.json?.item?.id;
  if (!transactionId) {
    throw new Error("Transaction create response missing item.id.");
  }
  console.log("[smoke] Transaction create ok");

  const listTransactions = await requestJson({
    method: "GET",
    path: "/api/v1/transactions?page=1&pageSize=20&sortBy=occurredAt&sortOrder=desc",
    token
  });
  ensureStatus(listTransactions.response, listTransactions.json, 200, "GET /api/v1/transactions");
  console.log("[smoke] Transaction list ok");

  const updateTransaction = await requestJson({
    method: "PATCH",
    path: `/api/v1/transactions/${transactionId}`,
    token,
    body: {
      amount: 133.45,
      note: "staging-smoke-updated",
      direction: "debit",
      currency: "INR",
      occurredAt: nowIso
    }
  });
  ensureStatus(updateTransaction.response, updateTransaction.json, 200, "PATCH /api/v1/transactions/:id");
  console.log("[smoke] Transaction update ok");

  const report = await requestJson({
    method: "GET",
    path: `/api/v1/reports/summary?month=${monthToken}`,
    token
  });
  ensureStatus(report.response, report.json, 200, "GET /api/v1/reports/summary");
  console.log("[smoke] Report summary ok");

  const deleteTransaction = await requestJson({
    method: "DELETE",
    path: `/api/v1/transactions/${transactionId}`,
    token
  });
  ensureStatus(deleteTransaction.response, deleteTransaction.json, 200, "DELETE /api/v1/transactions/:id");
  console.log("[smoke] Transaction delete ok");

  console.log("[smoke] All staging smoke checks passed.");
};

run().catch((error) => {
  console.error(`[smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
