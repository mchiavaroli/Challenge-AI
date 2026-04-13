/**
 * Returns the API base path depending on NEXT_PUBLIC_USE_LOCAL env var.
 *
 * - v1 (default): "/api"   → uses Supabase
 * - v2 (local):   "/api/v2" → in-memory, no DB needed
 *
 * Set NEXT_PUBLIC_USE_LOCAL=true in .env.local to activate v2.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_USE_LOCAL === "true" ? "/api/v2" : "/api"
