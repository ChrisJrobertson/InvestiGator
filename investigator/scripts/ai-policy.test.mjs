import assert from "node:assert/strict";
import { test } from "node:test";
import {
  authoriseAi, readAiPolicy, validatePrivateQwenUrl,
} from "../src/lib/ai/policy.ts";

const base = {
  INVESTIGATOR_AI_ENABLED: "true",
  INVESTIGATOR_AI_DATA_POLICY: "private_only",
  INVESTIGATOR_AI_PROVIDER: "private_qwen",
  INVESTIGATOR_AI_APPROVED_ORG_IDS: "org-a",
};

test("AI is disabled by default", () => {
  const policy = readAiPolicy({});
  assert.equal(policy.enabled, false);
  assert.throws(() => authoriseAi(policy, "org-a", "private_qwen"), /disabled/);
});

test("enabled AI requires explicit provider and policy", () => {
  assert.throws(() => readAiPolicy({ INVESTIGATOR_AI_ENABLED: "true" }), /egress policy/);
  assert.throws(() => readAiPolicy({ INVESTIGATOR_AI_ENABLED: "true", INVESTIGATOR_AI_DATA_POLICY: "private_only" }), /provider/);
});

test("private-only allows approved tenant only, denies all external inference", () => {
  const policy = readAiPolicy(base);
  assert.doesNotThrow(() => authoriseAi(policy, "org-a", "private_qwen"));
  assert.throws(() => authoriseAi(policy, "org-b", "private_qwen"), /organisation/);
  assert.throws(() => authoriseAi(policy, "org-a", "anthropic"), /prohibited/);
  assert.throws(() => authoriseAi(policy, "org-a", "huggingface"), /prohibited/);
});

test("external providers must each be explicitly allowlisted", () => {
  const policy = readAiPolicy({
    ...base,
    INVESTIGATOR_AI_DATA_POLICY: "approved_external",
    INVESTIGATOR_AI_PROVIDER: "anthropic",
    INVESTIGATOR_AI_APPROVED_EXTERNAL_PROVIDERS: "anthropic",
  });
  assert.doesNotThrow(() => authoriseAi(policy, "org-a", "anthropic"));
  assert.throws(() => authoriseAi(policy, "org-a", "huggingface"), /prohibited/);
});

test("private gateway requires host allowlist and production TLS", () => {
  assert.throws(() => validatePrivateQwenUrl("https://bad.example/v1", "good.example", true), /allowlisted/);
  assert.throws(() => validatePrivateQwenUrl("http://qwen.internal/v1", "qwen.internal", true), /HTTPS/);
  assert.throws(() => validatePrivateQwenUrl("https://qwen.internal/v1?token=abc", "qwen.internal", true), /queries/);
  assert.throws(() => validatePrivateQwenUrl("https://qwen.internal/admin", "qwen.internal", true), /end in/);
  assert.equal(validatePrivateQwenUrl("https://qwen.internal/v1", "qwen.internal", true).pathname, "/v1");
  assert.equal(validatePrivateQwenUrl("http://127.0.0.1:8000/v1", "127.0.0.1:8000", false).pathname, "/v1");
});
