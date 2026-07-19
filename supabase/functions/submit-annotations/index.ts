import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const PUBLIC_ORIGIN = "https://yusufcanaltinkaynak55-cloud.github.io";
const ALLOWED_ORIGINS = new Set([
  PUBLIC_ORIGIN,
  "http://127.0.0.1:8000",
  "http://localhost:8000"
]);
const PACKAGE_ID = "PUBLIC-CALIBRATION-TR-EN-150-V1";
const SCHEMA_VERSION = "alfa_public_bilingual_annotation_block_export_v2";
const CONSENT_VERSION = "alfa_remote_submission_consent_v2";
const MAX_BODY_BYTES = 128 * 1024;
const BLOCK_SIZE = 50;
const MASTER_BANK_SIZE = 150;
const NETWORK_SUBMISSION_LIMIT = 2;
const BLOCKS = new Map([
  ["BLOCK-01", { index: 1, first: 1, last: 50 }],
  ["BLOCK-02", { index: 2, first: 51, last: 100 }],
  ["BLOCK-03", { index: 3, first: 101, last: 150 }]
]);
const DECISIONS = new Set([
  "NET_MEANING",
  "MEANINGFUL_NOISE",
  "CONTRADICTION",
  "SEMANTIC_INCOHERENCE",
  "NO_MEANING"
]);

type Annotation = {
  sampleId: string;
  orderIndex: number;
  decisionClass: string;
  confidence: number;
  note: string;
  firstSeenAt: string;
  updatedAt: string;
};

type SubmissionPayload = {
  schemaVersion: string;
  packageId: string;
  blockId: string;
  blockIndex: number;
  submissionId: string;
  participantCode: string;
  annotationType: string;
  consentVersion: string;
  modelOutputWasVisible: boolean;
  expectedLabelsWereVisible: boolean;
  consentedAt: string;
  clientSubmittedAt: string;
  completedCount: number;
  totalCount: number;
  masterBankItemCount: number;
  annotations: Annotation[];
};

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : PUBLIC_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "content-type, x-alfa-study-access",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(origin: string | null, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return mismatch === 0;
}

function validIsoTimestamp(value: unknown) {
  return typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function normalizeClientIp(value: string | null) {
  if (!value) return "";
  let candidate = value.trim().replace(/^\[|\]$/g, "");
  if (candidate.toLowerCase().startsWith("::ffff:")) candidate = candidate.slice(7);
  const ipv4 = candidate.split(".");
  if (
    ipv4.length === 4
    && ipv4.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  ) {
    return ipv4.map((part) => String(Number(part))).join(".");
  }
  candidate = candidate.split("%", 1)[0].toLowerCase();
  if (candidate.includes(":") && /^[0-9a-f:]{2,45}$/.test(candidate)) return candidate;
  return "";
}

function readClientIp(request: Request) {
  const cloudflareIp = normalizeClientIp(request.headers.get("cf-connecting-ip"));
  if (cloudflareIp) return cloudflareIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const candidates = forwarded.split(",").map((value) => normalizeClientIp(value)).filter(Boolean);
    if (candidates.length) return candidates[candidates.length - 1];
  }
  return normalizeClientIp(request.headers.get("x-real-ip"));
}

async function networkFingerprint(ip: string, pepper: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${PACKAGE_ID}:${ip}`)
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function validatePayload(value: unknown): { ok: true; payload: SubmissionPayload } | { ok: false; code: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, code: "INVALID_BODY" };
  const payload = value as SubmissionPayload;
  if (payload.schemaVersion !== SCHEMA_VERSION) return { ok: false, code: "INVALID_SCHEMA_VERSION" };
  if (payload.packageId !== PACKAGE_ID) return { ok: false, code: "INVALID_PACKAGE" };
  const block = BLOCKS.get(payload.blockId);
  if (!block || payload.blockIndex !== block.index) return { ok: false, code: "INVALID_BLOCK" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.submissionId)) {
    return { ok: false, code: "INVALID_SUBMISSION_ID" };
  }
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(payload.participantCode)) return { ok: false, code: "INVALID_PARTICIPANT_CODE" };
  if (payload.annotationType !== "independent_blind_human") return { ok: false, code: "INVALID_ANNOTATION_TYPE" };
  if (payload.consentVersion !== CONSENT_VERSION) return { ok: false, code: "REMOTE_CONSENT_REQUIRED" };
  if (payload.modelOutputWasVisible !== false || payload.expectedLabelsWereVisible !== false) {
    return { ok: false, code: "BLINDING_CONTRACT_BROKEN" };
  }
  if (!validIsoTimestamp(payload.consentedAt) || !validIsoTimestamp(payload.clientSubmittedAt)) {
    return { ok: false, code: "INVALID_TIMESTAMPS" };
  }
  if (
    payload.completedCount !== BLOCK_SIZE
    || payload.totalCount !== BLOCK_SIZE
    || payload.masterBankItemCount !== MASTER_BANK_SIZE
    || !Array.isArray(payload.annotations)
    || payload.annotations.length !== BLOCK_SIZE
  ) {
    return { ok: false, code: "INCOMPLETE_SUBMISSION" };
  }

  const sampleIds = new Set(
    Array.from(
      { length: BLOCK_SIZE },
      (_, index) => `PUB-${String(block.first + index).padStart(3, "0")}`
    )
  );
  const seenSamples = new Set<string>();
  const seenOrder = new Set<number>();
  for (const annotation of payload.annotations) {
    if (!annotation || typeof annotation !== "object") return { ok: false, code: "INVALID_ANNOTATION" };
    if (!sampleIds.has(annotation.sampleId) || seenSamples.has(annotation.sampleId)) {
      return { ok: false, code: "INVALID_SAMPLE_SET" };
    }
    if (!Number.isInteger(annotation.orderIndex) || annotation.orderIndex < 0 || annotation.orderIndex >= BLOCK_SIZE || seenOrder.has(annotation.orderIndex)) {
      return { ok: false, code: "INVALID_ORDER" };
    }
    if (!DECISIONS.has(annotation.decisionClass)) return { ok: false, code: "INVALID_DECISION" };
    if (!Number.isInteger(annotation.confidence) || annotation.confidence < 1 || annotation.confidence > 5) {
      return { ok: false, code: "INVALID_CONFIDENCE" };
    }
    if (typeof annotation.note !== "string" || annotation.note.length > 280) return { ok: false, code: "INVALID_NOTE" };
    if (!validIsoTimestamp(annotation.firstSeenAt) || !validIsoTimestamp(annotation.updatedAt)) {
      return { ok: false, code: "INVALID_ANNOTATION_TIMESTAMPS" };
    }
    seenSamples.add(annotation.sampleId);
    seenOrder.add(annotation.orderIndex);
  }
  if (seenSamples.size !== sampleIds.size || [...sampleIds].some((id) => !seenSamples.has(id))) {
    return { ok: false, code: "INVALID_SAMPLE_SET" };
  }
  return { ok: true, payload };
}

function readSecretKey() {
  const namedKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (namedKeys) {
    try {
      const parsed = JSON.parse(namedKeys);
      if (typeof parsed.default === "string") return parsed.default;
      const first = Object.values(parsed).find((value) => typeof value === "string");
      if (typeof first === "string") return first;
    } catch (_error) {
      return "";
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return jsonResponse(origin, 403, { ok: false, code: "ORIGIN_DENIED" });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") return jsonResponse(origin, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return jsonResponse(origin, 403, { ok: false, code: "ORIGIN_DENIED" });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse(origin, 415, { ok: false, code: "JSON_REQUIRED" });
  }

  const expectedStudyAccess = Deno.env.get("ALFA_STUDY_ACCESS_CODE") || "";
  const suppliedStudyAccess = request.headers.get("x-alfa-study-access") || "";
  if (!expectedStudyAccess) return jsonResponse(origin, 503, { ok: false, code: "SUBMISSION_NOT_CONFIGURED" });
  if (!suppliedStudyAccess || !constantTimeEqual(suppliedStudyAccess, expectedStudyAccess)) {
    return jsonResponse(origin, 401, { ok: false, code: "INVALID_STUDY_ACCESS" });
  }

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > MAX_BODY_BYTES) return jsonResponse(origin, 413, { ok: false, code: "PAYLOAD_TOO_LARGE" });
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return jsonResponse(origin, 413, { ok: false, code: "PAYLOAD_TOO_LARGE" });
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch (_error) {
    return jsonResponse(origin, 400, { ok: false, code: "INVALID_JSON" });
  }
  const validation = validatePayload(decoded);
  if (!validation.ok) return jsonResponse(origin, 422, { ok: false, code: validation.code });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = readSecretKey();
  const fingerprintPepper = Deno.env.get("ALFA_IP_HASH_PEPPER") || "";
  if (!supabaseUrl || !secretKey || !fingerprintPepper) {
    return jsonResponse(origin, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
  }
  const clientIp = readClientIp(request);
  if (!clientIp) return jsonResponse(origin, 503, { ok: false, code: "NETWORK_IDENTITY_UNAVAILABLE" });
  const fingerprint = await networkFingerprint(clientIp, fingerprintPepper);
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const payload = validation.payload;

  const { data: existingSubmission, error: existingLookupError } = await supabase
    .from("human_annotation_submissions")
    .select("receipt_id, received_at")
    .eq("submission_id", payload.submissionId)
    .maybeSingle();
  if (existingLookupError) {
    console.error("submission_lookup_failed", existingLookupError.code);
    return jsonResponse(origin, 500, { ok: false, code: "RECEIPT_LOOKUP_FAILED" });
  }
  if (existingSubmission) {
    return jsonResponse(origin, 200, {
      ok: true,
      receiptId: existingSubmission.receipt_id,
      receivedAt: existingSubmission.received_at
    });
  }

  const proposedReceipt = `ALFA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const record = {
    submission_id: payload.submissionId,
    receipt_id: proposedReceipt,
    package_id: payload.packageId,
    block_id: payload.blockId,
    block_index: payload.blockIndex,
    master_bank_size: payload.masterBankItemCount,
    schema_version: payload.schemaVersion,
    consent_version: payload.consentVersion,
    participant_code: payload.participantCode,
    annotation_type: payload.annotationType,
    completed_count: payload.completedCount,
    total_count: payload.totalCount,
    annotations: payload.annotations,
    client_consented_at: payload.consentedAt,
    client_submitted_at: payload.clientSubmittedAt,
    source_version: "public-calibration-v0.4.0",
    network_fingerprint: fingerprint
  };

  for (let networkSlot = 1; networkSlot <= NETWORK_SUBMISSION_LIMIT; networkSlot += 1) {
    const { data: inserted, error: insertError } = await supabase
      .from("human_annotation_submissions")
      .insert({ ...record, network_slot: networkSlot })
      .select("receipt_id, received_at");
    if (!insertError && inserted?.[0]) {
      return jsonResponse(origin, 200, {
        ok: true,
        receiptId: inserted[0].receipt_id,
        receivedAt: inserted[0].received_at
      });
    }
    if (insertError?.code !== "23505") {
      console.error("submission_insert_failed", insertError?.code || "unknown");
      return jsonResponse(origin, 500, { ok: false, code: "DATABASE_WRITE_FAILED" });
    }
    const { data: concurrentDuplicate, error: duplicateLookupError } = await supabase
      .from("human_annotation_submissions")
      .select("receipt_id, received_at")
      .eq("submission_id", payload.submissionId)
      .maybeSingle();
    if (duplicateLookupError) {
      console.error("submission_lookup_failed", duplicateLookupError.code);
      return jsonResponse(origin, 500, { ok: false, code: "RECEIPT_LOOKUP_FAILED" });
    }
    if (concurrentDuplicate) {
      return jsonResponse(origin, 200, {
        ok: true,
        receiptId: concurrentDuplicate.receipt_id,
        receivedAt: concurrentDuplicate.received_at
      });
    }
  }

  return jsonResponse(origin, 429, {
    ok: false,
    code: "NETWORK_SUBMISSION_LIMIT",
    limit: NETWORK_SUBMISSION_LIMIT,
    scope: "per_block"
  });
});
