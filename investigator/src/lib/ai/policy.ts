/**
 * Deployment-wide AI egress policy. Fail-closed until explicitly enabled.
 * Per-case policy and customer consent require a separate, reviewed schema migration.
 */
export type AiProvider = "private_qwen" | "anthropic" | "huggingface";
export type AiDataPolicy = "private_only" | "approved_external";

export type AiPolicy = {
  enabled: boolean;
  dataPolicy: AiDataPolicy;
  provider: "private_qwen" | "anthropic";
  approvedExternalProviders: Set<string>;
  approvedOrganisationIds: Set<string>;
};

function parseList(value?: string): Set<string> {
  return new Set((value ?? "").split(",").map((part) => part.trim()).filter(Boolean));
}

export function readAiPolicy(env: NodeJS.ProcessEnv = process.env): AiPolicy {
  const enabled = env.INVESTIGATOR_AI_ENABLED === "true";
  const dataPolicy = env.INVESTIGATOR_AI_DATA_POLICY;
  const provider = env.INVESTIGATOR_AI_PROVIDER;

  if (enabled && dataPolicy !== "private_only" && dataPolicy !== "approved_external") {
    throw new Error("AI is not configured with an explicit data egress policy.");
  }
  if (enabled && provider !== "private_qwen" && provider !== "anthropic") {
    throw new Error("AI provider must be explicitly configured.");
  }

  return {
    enabled,
    dataPolicy: dataPolicy === "approved_external" ? dataPolicy : "private_only",
    provider: provider === "anthropic" ? provider : "private_qwen",
    approvedExternalProviders: parseList(env.INVESTIGATOR_AI_APPROVED_EXTERNAL_PROVIDERS),
    approvedOrganisationIds: parseList(env.INVESTIGATOR_AI_APPROVED_ORG_IDS),
  };
}

export function authoriseAi(policy: AiPolicy, organisationId: string, provider: AiProvider): void {
  if (!policy.enabled) throw new Error("AI processing is disabled.");
  if (!policy.approvedOrganisationIds.has(organisationId)) {
    throw new Error("AI processing is not approved for this organisation.");
  }
  if (provider === "private_qwen") return;
  if (policy.dataPolicy !== "approved_external" || !policy.approvedExternalProviders.has(provider)) {
    throw new Error("External AI processing is prohibited by the deployment policy.");
  }
}

export function validatePrivateQwenUrl(
  rawUrl: string | undefined,
  allowedHost: string | undefined,
  production: boolean,
): URL {
  if (!rawUrl || !allowedHost) throw new Error("Private Qwen gateway is not configured.");
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("Invalid private Qwen URL."); }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Private Qwen gateway URL cannot contain credentials, queries or fragments.");
  }
  if (url.pathname.replace(/\/$/, "") !== "/v1") {
    throw new Error("Private Qwen gateway URL must end in /v1.");
  }
  if (url.host !== allowedHost) {
    throw new Error("Private Qwen gateway host is not explicitly allowlisted.");
  }
  const isDevLoopback =
    !production && url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !isDevLoopback) {
    throw new Error("Private Qwen gateway requires HTTPS outside local development.");
  }
  return url;
}
