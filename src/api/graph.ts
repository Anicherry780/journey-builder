import type { GraphData } from "../types";

// configurable via env vars so the same code can hit the mock server or
// the production Avantos API without any code changes
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const TENANT_ID = import.meta.env.VITE_TENANT_ID ?? "1";
const BLUEPRINT_ID = import.meta.env.VITE_BLUEPRINT_ID ?? "bp_01jk766tckfwx84xjcxazggzyc";
const VERSION_ID = import.meta.env.VITE_BLUEPRINT_VERSION_ID;

export async function fetchGraph(): Promise<GraphData> {
  // production endpoint includes a blueprint_version_id segment;
  // the mock server doesn't, so we omit it when no version is supplied
  const path = VERSION_ID
    ? `/api/v1/${TENANT_ID}/actions/blueprints/${BLUEPRINT_ID}/${VERSION_ID}/graph`
    : `/api/v1/${TENANT_ID}/actions/blueprints/${BLUEPRINT_ID}/graph/`;

  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch graph: ${res.status}`);
  return res.json();
}
