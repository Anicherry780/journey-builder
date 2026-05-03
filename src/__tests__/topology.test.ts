import { describe, it, expect } from "vitest";
import { topologicalSort, getLevels } from "../lib/topology";
import type { FormNode } from "../types";

function makeNode(id: string, prerequisites: string[]): FormNode {
  return {
    id,
    type: "form",
    data: {
      id: `bp_${id}`,
      component_key: id,
      component_type: "form",
      component_id: `def_${id}`,
      name: id,
      prerequisites,
      input_mapping: {},
    },
  };
}

describe("topologicalSort", () => {
  it("returns roots before their dependents", () => {
    const nodes = [
      makeNode("D", ["B"]),
      makeNode("B", ["A"]),
      makeNode("A", []),
    ];
    const ordered = topologicalSort(nodes).map((n) => n.id);
    expect(ordered.indexOf("A")).toBeLessThan(ordered.indexOf("B"));
    expect(ordered.indexOf("B")).toBeLessThan(ordered.indexOf("D"));
  });

  it("places diamond-shaped DAGs in a valid order", () => {
    // A -> B, A -> C, B -> D, C -> D
    const nodes = [
      makeNode("D", ["B", "C"]),
      makeNode("C", ["A"]),
      makeNode("B", ["A"]),
      makeNode("A", []),
    ];
    const ordered = topologicalSort(nodes).map((n) => n.id);
    expect(ordered[0]).toBe("A");
    expect(ordered[3]).toBe("D");
  });

  it("preserves all nodes even when a cycle exists", () => {
    // a self-cycle would normally break Kahn's; nodes should still appear
    const nodes = [makeNode("A", ["B"]), makeNode("B", ["A"])];
    const ordered = topologicalSort(nodes);
    expect(ordered).toHaveLength(2);
  });

  it("ignores prerequisites that don't resolve to a node", () => {
    const nodes = [makeNode("A", ["ghost"])];
    const ordered = topologicalSort(nodes);
    expect(ordered.map((n) => n.id)).toEqual(["A"]);
  });
});

describe("getLevels", () => {
  it("groups roots at level 0 and direct children at level 1", () => {
    // A -> B, A -> C, B -> D, C -> D
    const nodes = [
      makeNode("A", []),
      makeNode("B", ["A"]),
      makeNode("C", ["A"]),
      makeNode("D", ["B", "C"]),
    ];
    const levels = getLevels(nodes);
    expect(levels).toHaveLength(3);
    expect(levels[0].nodes.map((n) => n.id)).toEqual(["A"]);
    expect(levels[1].nodes.map((n) => n.id)).toEqual(["B", "C"]);
    expect(levels[2].nodes.map((n) => n.id)).toEqual(["D"]);
  });

  it("sorts within a level alphabetically by form name", () => {
    const nodes = [
      makeNode("Z", []),
      makeNode("A", []),
      makeNode("M", []),
    ];
    const [rootLevel] = getLevels(nodes);
    expect(rootLevel.nodes.map((n) => n.data.name)).toEqual(["A", "M", "Z"]);
  });

  it("places a node one level below its deepest prerequisite", () => {
    // A(0) -> B(1) -> D(2); A(0) -> D too — D should still be level 2 (not 1)
    const nodes = [
      makeNode("A", []),
      makeNode("B", ["A"]),
      makeNode("D", ["A", "B"]),
    ];
    const levels = getLevels(nodes);
    const dLevel = levels.find((l) => l.nodes.some((n) => n.id === "D"))?.index;
    expect(dLevel).toBe(2);
  });
});
