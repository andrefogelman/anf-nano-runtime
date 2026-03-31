/**
 * Stub for @onecli-sh/sdk — OrcaBot doesn't use OneCLI.
 * Credential injection will be handled differently (env vars / Supabase Vault).
 * This exists only to keep existing NanoClaw code compiling until full rewrite.
 */

export class OneCLI {
  constructor(_opts?: { url?: string }) {}

  async applyContainerConfig(
    args: string[],
    _opts?: Record<string, unknown>,
  ): Promise<boolean> {
    return false;
  }

  async ensureAgent(
    _opts: { name: string; identifier?: string },
  ): Promise<{ created: boolean }> {
    return { created: false };
  }
}
