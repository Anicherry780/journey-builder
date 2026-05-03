import type { DataSource, FieldOption, FieldSchema, GraphData } from "../types";
import { getAllAncestors, getDirectParents, getFormDefinition } from "../lib/dag";

/**
 * Returns true when a candidate field can plausibly prefill the target field.
 * Permissive on purpose: same `type` (string, array, object) is enough; if
 * both sides declare a `format` (email, uuid, date), they must match too.
 */
function defaultIsCompatible(target: FieldSchema, candidate: FieldOption): boolean {
  const cand = candidate.schema;
  if (!cand) return true; // unknown schema → don't filter
  if (target.type !== cand.type) return false;
  const targetFormat = (target as FieldSchema & { format?: string }).format;
  const candFormat = (cand as FieldSchema & { format?: string }).format;
  if (targetFormat && candFormat && targetFormat !== candFormat) return false;
  return true;
}

function buildOptions(
  graph: GraphData,
  ancestorIds: Set<string>,
  relationship: "direct" | "transitive"
): FieldOption[] {
  const options: FieldOption[] = [];

  graph.nodes
    .filter((n) => ancestorIds.has(n.id))
    .forEach((ancestorNode) => {
      const formDef = getFormDefinition(ancestorNode, graph);
      if (!formDef) return;
      Object.entries(formDef.field_schema.properties).forEach(([key, schema]) => {
        options.push({
          sourceId: ancestorNode.id,
          sourceLabel: `${ancestorNode.data.name} (${relationship})`,
          fieldKey: key,
          fieldLabel: schema.title ?? key,
          schema,
        });
      });
    });

  return options;
}

export const directParentSource: DataSource = {
  id: "direct_parents",
  label: "Direct parent forms",
  getFields(nodeId, graph) {
    const directIds = new Set(getDirectParents(nodeId, graph.nodes).map((n) => n.id));
    return buildOptions(graph, directIds, "direct");
  },
  isCompatible: defaultIsCompatible,
};

export const transitiveAncestorSource: DataSource = {
  id: "transitive_ancestors",
  label: "Upstream forms",
  getFields(nodeId, graph) {
    const directIds = new Set(getDirectParents(nodeId, graph.nodes).map((n) => n.id));
    const allAncestorIds = new Set(getAllAncestors(nodeId, graph.nodes).map((n) => n.id));
    directIds.forEach((id) => allAncestorIds.delete(id));
    return buildOptions(graph, allAncestorIds, "transitive");
  },
  isCompatible: defaultIsCompatible,
};
