// Shared Lovable AI Gateway provider for the AI SDK.
// Server-only — do not import from client components.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
