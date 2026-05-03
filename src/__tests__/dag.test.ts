import { describe, it, expect } from "vitest";
import { getDirectParents, getAllAncestors, findNode } from "../lib/dag";
import type { FormNode } from "../types";

// minimal stub nodes that mirror the real DAG:  A → B → D
function makeNode(id: string, prerequisites: string[]): FormNode {
  return {
    id,
    type: "form",
    data: {
      id: `bp_${id}`,
      component_key: id,
      component_type: "form",
      component_id: `form_def_${id}`,
      name: id.toUpperCase(),
      prerequisites,
      input_mapping: {},
    },
  };
}

const nodeA = makeNode("A", []);
const nodeB = makeNode("B", ["A"]);
const nodeC = makeNode("C", ["A"]);
const nodeD = makeNode("D", ["B"]);
const nodeF = makeNode("F", ["D", "E"]);
const nodeE = makeNode("E", ["C"]);

const allNodes = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF];

describe("findNode", () => {
  it("returns the matching node", () => {
    expect(findNode("B", allNodes)?.id).toBe("B");
  });

  it("returns undefined for unknown id", () => {
    expect(findNode("Z", allNodes)).toBeUndefined();
  });
});

describe("getDirectParents", () => {
  it("returns empty for a root node", () => {
    expect(getDirectParents("A", allNodes)).toHaveLength(0);
  });

  it("returns the single direct parent", () => {
    const parents = getDirectParents("B", allNodes);
    expect(parents).toHaveLength(1);
    expect(parents[0].id).toBe("A");
  });

  it("returns multiple direct parents", () => {
    const parents = getDirectParents("F", allNodes).map((n) => n.id);
    expect(parents).toContain("D");
    expect(parents).toContain("E");
  });
});

describe("getAllAncestors", () => {
  it("returns empty for a root node", () => {
    expect(getAllAncestors("A", allNodes)).toHaveLength(0);
  });

  it("returns only A for node B", () => {
    const ancestors = getAllAncestors("B", allNodes).map((n) => n.id);
    expect(ancestors).toEqual(["A"]);
  });

  it("returns all reachable ancestors for node F", () => {
    const ancestors = getAllAncestors("F", allNodes).map((n) => n.id);
    expect(ancestors).toContain("A");
    expect(ancestors).toContain("B");
    expect(ancestors).toContain("C");
    expect(ancestors).toContain("D");
    expect(ancestors).toContain("E");
    expect(ancestors).not.toContain("F");
  });

  it("does not include duplicates when a node is reachable via multiple paths", () => {
    // A is reachable via both B→D→F and C→E→F
    const ancestors = getAllAncestors("F", allNodes);
    const aCount = ancestors.filter((n) => n.id === "A").length;
    expect(aCount).toBe(1);
  });
});
