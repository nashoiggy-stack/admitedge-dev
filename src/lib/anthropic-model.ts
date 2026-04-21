// Central Anthropic model IDs so we can update them in one place if Anthropic
// renames an alias. Each constant reads from its env var first, falls back
// to a sensible default.
//
// Two tiers:
//   - ANTHROPIC_MODEL           — default (Sonnet). Used by most endpoints.
//   - ANTHROPIC_MODEL_PREMIUM   — Opus. Used by reasoning-heavy endpoints
//                                 (essay grade, suggestions, EC synthesis).
//
// To switch models without a code change, set ANTHROPIC_MODEL or
// ANTHROPIC_MODEL_PREMIUM in Vercel env.

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// UNDO [opus-upgrade]: to revert the three premium endpoints back to Sonnet,
// either (a) delete this constant and flip the route imports back to
// ANTHROPIC_MODEL, or (b) set ANTHROPIC_MODEL_PREMIUM=claude-sonnet-4-6 in
// the Vercel environment variables (no code change needed).
export const ANTHROPIC_MODEL_PREMIUM =
  process.env.ANTHROPIC_MODEL_PREMIUM || "claude-opus-4-6";
