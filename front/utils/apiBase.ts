// Central API base resolution for REST endpoints
// Priority: NEXT_PUBLIC_API_BASE > derive from NEXT_PUBLIC_API_URL (strip trailing /graphql) > default localhost:4000

function deriveBase(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE;
  if (explicit) return explicit.replace(/\/$/, "");
  const gql = process.env.NEXT_PUBLIC_API_URL;
  if (gql) return gql.replace(/\/graphql\/?$/, "");
  return "http://localhost:4000";
}

export const API_BASE = deriveBase();

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return API_BASE + path;
}
