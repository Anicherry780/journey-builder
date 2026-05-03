import type { FormNode } from "../types";

/**
 * One level of the DAG layered layout. `index` is 0 for roots, then 1, 2,
 * etc. Within a single level the nodes are sorted alphabetically by name
 * so the UI is deterministic regardless of API order.
 */
export interface DagLevel {
  index: number;
  nodes: FormNode[];
}

/**
 * Splits the nodes into "levels" where every node sits one step below its
 * deepest prerequisite. Roots are at level 0. Useful for laying out the
 * form list with section headers per level.
 */
export function getLevels(nodes: FormNode[]): DagLevel[] {
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const memo = new Map<string, number>();

  function levelOf(id: string, seen: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return 0; // cycle — break gracefully
    seen.add(id);

    const node = idToNode.get(id);
    if (!node) return 0;
    const prereqLevels = node.data.prerequisites
      .filter((p) => idToNode.has(p))
      .map((p) => levelOf(p, seen));
    const level = prereqLevels.length === 0 ? 0 : Math.max(...prereqLevels) + 1;
    memo.set(id, level);
    return level;
  }

  const grouped = new Map<number, FormNode[]>();
  nodes.forEach((node) => {
    const lvl = levelOf(node.id, new Set());
    const bucket = grouped.get(lvl) ?? [];
    bucket.push(node);
    grouped.set(lvl, bucket);
  });

  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, list]) => ({
      index,
      nodes: [...list].sort((a, b) => a.data.name.localeCompare(b.data.name)),
    }));
}

/**
 * Returns the nodes ordered such that every node comes after all of its
 * prerequisites. Uses Kahn's algorithm. Forms whose prerequisites do not
 * exist in the graph are treated as roots — keeps the function tolerant
 * of partial graphs.
 *
 * Within a single "level" (same number of upstream dependencies) the
 * original input order is preserved, which keeps the visible list stable
 * when the API order changes.
 */
export function topologicalSort(nodes: FormNode[]): FormNode[] {
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  // initialize indegree, but only count prerequisites that actually exist
  nodes.forEach((node) => {
    const existingPrereqs = node.data.prerequisites.filter((id) => idToNode.has(id));
    indegree.set(node.id, existingPrereqs.length);
    existingPrereqs.forEach((prereqId) => {
      const list = dependents.get(prereqId) ?? [];
      list.push(node.id);
      dependents.set(prereqId, list);
    });
  });

  const ordered: FormNode[] = [];
  const queue = nodes.filter((n) => indegree.get(n.id) === 0);

  while (queue.length > 0) {
    const next = queue.shift()!;
    ordered.push(next);

    (dependents.get(next.id) ?? []).forEach((dependentId) => {
      const remaining = (indegree.get(dependentId) ?? 0) - 1;
      indegree.set(dependentId, remaining);
      if (remaining === 0) {
        const dependentNode = idToNode.get(dependentId);
        if (dependentNode) queue.push(dependentNode);
      }
    });
  }

  // if a cycle exists, append unvisited nodes at the end so the list is
  // still complete rather than silently dropping them
  if (ordered.length < nodes.length) {
    const placed = new Set(ordered.map((n) => n.id));
    nodes.forEach((n) => {
      if (!placed.has(n.id)) ordered.push(n);
    });
  }

  return ordered;
}
