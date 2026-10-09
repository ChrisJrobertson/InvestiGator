# InvestiGator — controlled AI routing and private Qwen

This is an integration scaffold, **not** a statement that the application is secure or certified. Do not use real confidential investigation material before independent review of infrastructure, legal processing conditions, access controls, and tenant isolation.

## Security policy

- All AI processing is **disabled by default**.
- `INVESTIGATOR_AI_ENABLED=true` is required, alongside an explicit data egress policy, chosen model provider, and a list of authorised organisation UUIDs.
- `private_only` allows only the privately hosted Qwen text-generation route. Existing Anthropic image-description and Hugging Face OCR/transcription/background-removal paths reject requests.
- `approved_external` allows specified external providers through `INVESTIGATOR_AI_APPROVED_EXTERNAL_PROVIDERS` (names: `anthropic`, `huggingface`), subject to case and organisation authorisation. No external provider is enabled simply by choosing a model.
- There is **no automatic fallback** to Anthropic, Hugging Face or public Qwen if private Qwen fails.
- The source content is **not placed in application audit metadata or error messages** by this integration.
- Original evidence stays in Supabase; the Qwen service receives the report prompt assembled from case findings, as the current report generator does. This is still potentially personal/criminal-offence data, even where direct identifiers are masked.
- Provider choice is configured server-side by an administrator, not set by the user or passed in an API request.

## Running a genuinely private Qwen service

1. Deploy a licence-compatible Qwen open-weight model through vLLM or another reviewed inference server in your controlled environment.
2. Keep the inference host on a private network. Protect a narrow HTTPS gateway with network policies, appropriate authentication, rate limits and ideally mTLS; do **not** publish the unprotected inference service.
3. At the reverse proxy, allow only `POST /v1/chat/completions` from the application/gateway identity. Deny vLLM auxiliary and operational routes. vLLM's built-in API key **does not protect all paths**.
4. Disable request-body logging, tracing of model inputs, crash dumps containing prompts, and unintended prompt retention; verify monitoring and backup behaviour.
5. Provide a reachable trusted TLS endpoint and app-side environment variables from `.env.ai.example`.
6. For deployments hosted on Vercel, configure a secure path to private infrastructure (e.g. approved authenticated service-to-service gateway). A Vercel function cannot necessarily resolve or route to private DNS by default. A public hostname with an API key alone is not equivalent to private hosting.
7. Run connectivity, isolation, confidentiality and fail-closed tests from the deployment environment before approving any real customer data.

See https://docs.vllm.ai/en/stable/usage/security/ for vLLM network and endpoint hardening.

## Application configuration

- `INVESTIGATOR_AI_ENABLED`: defaults off, must equal `true`.
- `INVESTIGATOR_AI_DATA_POLICY`: `private_only` or `approved_external`.
- `INVESTIGATOR_AI_PROVIDER`: `private_qwen` or `anthropic` for text/report drafting.
- `INVESTIGATOR_AI_APPROVED_ORG_IDS`: exact organisation UUID allowlist.
- `INVESTIGATOR_AI_APPROVED_EXTERNAL_PROVIDERS`: optional `anthropic,huggingface` allowlist; only effective in `approved_external`.
- `QWEN_PRIVATE_GATEWAY_URL`: absolute gateway URL ending `/v1`.
- `QWEN_PRIVATE_ALLOWED_HOST`: hostname (and nondefault port if applicable) that must match the gateway URL exactly.
- `QWEN_PRIVATE_API_KEY`: secret held server-side only; required for private Qwen.
- `QWEN_PRIVATE_MODEL`: exact model ID served by gateway.
- `INVESTIGATOR_ANTHROPIC_MODEL`: optional model ID; existing Claude model remains default.

In production, the private Qwen gateway must use HTTPS. Plain HTTP is permitted **only** to localhost/loopback during local development.

## Known gaps / release blockers

- The current project repository does not include a versioned Supabase schema, RLS or Storage policies. Recover and review the real policies; this application-side check is **defence in depth**, not a replacement.
- Per-case consent/policy, human approvals, special-category/criminal-offence processing conditions and retention policies are not implemented by this change.
- The existing report pipeline uses investigator-entered findings and file names, not full document text or source-linked AI extraction.
- The image description, OCR, transcription and background-removal functions have no private-Qwen implementation yet; in private-only mode they fail closed.
- Confirm legal controller/processor arrangements, DPIA, UK GDPR lawful basis, Schedule 1 conditions where applicable, international transfers, processor agreements and contractual service requirements.
- Independently verify authentication, role/tenant checks, evidence immutability, secret storage, encryption, data deletion, logs and incident response.
- The AI gateway is text-only, does not itself provide prompt injection resistance or reliable factuality guarantees. Human approval remains required.
- Do not expose the application to real evidence until the security work and penetration testing are completed.

## Manual acceptance scenarios

1. No AI environment variables: generation and evidence processing fail safely; no outbound calls.
2. Enabled private-only policy and approved organisation: report uses private gateway; external OCR and vision return a clear denial.
3. Enabled policy, wrong organisation ID: deny before external requests.
4. Qwen gateway error / timeout: fail without trying any other provider or leaking provider response content.
5. Invalid/HTTP public Qwen gateway URL: deny.
6. Approved external policy with only Anthropic allowed: Claude text permitted, Hugging Face denied.
7. Cross-tenant case ID: deny even with an approved organisation.
8. Review gateway/proxy logs to confirm no prompt/response bodies.
