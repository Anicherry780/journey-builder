import type { FormNode, GraphData } from "../types";

// returns a node by its id
export function findNode(nodeId: string, nodes: FormNode[]): FormNode | undefined {
  return nodes.find((n) => n.id === nodeId);
}

// returns only the direct parent nodes of a given node
export function getDirectParents(nodeId: string, nodes: FormNode[]): FormNode[] {
  const node = findNode(nodeId, nodes);
  if (!node) return [];
  return node.data.prerequisites
    .map((prereqId) => findNode(prereqId, nodes))
    .filter((n): n is FormNode => n !== undefined);
}

// walks up the DAG and returns all ancestor nodes (BFS, no duplicates)
export function getAllAncestors(nodeId: string, nodes: FormNode[]): FormNode[] {
  const visited = new Set<string>();
  const queue = getDirectParents(nodeId, nodes);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    getDirectParents(current.id, nodes).forEach((parent) => queue.push(parent));
  }

  return nodes.filter((n) => visited.has(n.id));
}

// resolves a node's component_id to the matching FormDefinition
export function getFormDefinition(node: FormNode, graph: GraphData) {
  return graph.forms.find((f) => f.id === node.data.component_id);
}
