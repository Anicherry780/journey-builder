import type { GraphData, MappingValue } from "../types";
import { findNode, getFormDefinition } from "./dag";

// keep global field labels in one place so the modal and the panel agree
const GLOBAL_LABELS: Record<string, string> = {
  org_id: "Organisation ID",
  org_name: "Organisation Name",
  user_id: "Current User ID",
  user_email: "Current User Email",
};

/**
 * Resolves a stored mapping into the human-readable label shown in the UI.
 * Looks up the source node and field every render, so renaming a form is
 * reflected immediately without rewriting saved mappings.
 */
export function resolveMappingLabel(mapping: MappingValue, graph: GraphData): string {
  if (mapping.type === "global") {
    return `Global → ${GLOBAL_LABELS[mapping.globalKey] ?? mapping.globalKey}`;
  }

  const sourceNode = findNode(mapping.sourceNodeId, graph.nodes);
  if (!sourceNode) return `(unknown form) → ${mapping.sourceFieldKey}`;

  const formDef = getFormDefinition(sourceNode, graph);
  const fieldTitle = formDef?.field_schema.properties[mapping.sourceFieldKey]?.title;
  return `${sourceNode.data.name} → ${fieldTitle ?? mapping.sourceFieldKey}`;
}

/**
 * Returns true if the mapping still points to a node and field that exist
 * in the current graph. Used to flag stale mappings after a graph reload.
 */
export function isMappingValid(mapping: MappingValue, graph: GraphData): boolean {
  if (mapping.type === "global") return mapping.globalKey in GLOBAL_LABELS;

  const sourceNode = findNode(mapping.sourceNodeId, graph.nodes);
  if (!sourceNode) return false;

  const formDef = getFormDefinition(sourceNode, graph);
  return Boolean(formDef && mapping.sourceFieldKey in formDef.field_schema.properties);
}
