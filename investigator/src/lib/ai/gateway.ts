import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/audit";
import {
  authoriseAi, readAiPolicy, validatePrivateQwenUrl,
  type AiProvider,
} from "@/lib/ai/policy";

export type InvestigationAiResult = {
  text: string;
  model: string;
  provider: "private_qwen" | "private_open_weight" | "anthropic";
  usage: { input_tokens?: number; output_tokens?: number };
};

async function authoriseCase(caseId: string, provider: AiProvider) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .select("id, organisation_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .single();
  if (error || !data || data.organisation_id !== profile.organisation_id) {
    throw new Error("Case access denied.");
  }
  authoriseAi(readAiPolicy(), profile.organisation_id, provider);
  // Additionally enforce RBAC/case grants at database RLS layer before production use.
}

export async function assertExternalAiAllowed(
  caseId: string,
  provider: "anthropic" | "huggingface",
): Promise<void> {
  await authoriseCase(caseId, provider);
}

export async function generateInvestigationText(args: {
  caseId: string;
  prompt: string;
  maxTokens?: number;
}): Promise<InvestigationAiResult> {
  const policy = readAiPolicy();
  const provider = policy.provider;
  await authoriseCase(args.caseId, provider);
  if (!args.prompt.trim() || args.prompt.length > 100_000) {
    throw new Error("AI prompt is empty or exceeds the configured limit.");
  }
  const maxTokens = Math.min(Math.max(args.maxTokens ?? 4000, 1), 8000);

  if (provider === "private_qwen" || provider === "private_open_weight") {
    // Server-side static destination. No case/user input may select an inference URL.
    const gateway = validatePrivateQwenUrl(
      (provider === "private_qwen" ? process.env.QWEN_PRIVATE_GATEWAY_URL : process.env.PRIVATE_AI_GATEWAY_URL),
      (provider === "private_qwen" ? process.env.QWEN_PRIVATE_ALLOWED_HOST : process.env.PRIVATE_AI_ALLOWED_HOST),
      process.env.NODE_ENV === "production",
    );
    const model = provider === "private_qwen" ? process.env.QWEN_PRIVATE_MODEL : process.env.PRIVATE_AI_MODEL;
    const apiKey = provider === "private_qwen" ? process.env.QWEN_PRIVATE_API_KEY : process.env.PRIVATE_AI_API_KEY;
    if (!model || !apiKey) throw new Error("Private model credentials are not configured.");

    const response = await fetch(new URL(gateway.pathname.replace(/\/$/, "") + "/chat/completions", gateway.origin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: args.prompt }],
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(90_000),
    });
    // Do not include provider response body or prompt in exception text/logs.
    if (!response.ok) throw new Error("Private model request failed (HTTP " + response.status + ").");
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Private model returned an empty response.");
    return {
      text,
      model,
      provider,
      usage: {
        input_tokens: body.usage?.prompt_tokens,
        output_tokens: body.usage?.completion_tokens,
      },
    };
  }

  // External inference must be separately approved by the deployment's policy.
  const model = process.env.INVESTIGATOR_ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Anthropic API is not configured.");
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: args.prompt }],
  });
  const text = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n")
    .trim();
  if (!text) throw new Error("Anthropic returned an empty response.");
  return {
    text,
    model,
    provider,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
