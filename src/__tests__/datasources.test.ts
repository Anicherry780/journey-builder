import { describe, it, expect } from "vitest";
import { directParentSource, transitiveAncestorSource } from "../datasources/formFields";
import { globalDataSource } from "../datasources/globalData";
import type { GraphData, FieldSchema, FieldOption } from "../types";

const mockGraph: GraphData = {
  id: "bp_test",
  name: "Test Blueprint",
  edges: [
    { source: "node-A", target: "node-B" },
    { source: "node-B", target: "node-D" },
  ],
  nodes: [
    {
      id: "node-A",
      type: "form",
      data: {
        id: "bp_A", component_key: "node-A", component_type: "form",
        component_id: "form-def-1", name: "Form A", prerequisites: [], input_mapping: {},
      },
    },
    {
      id: "node-B",
      type: "form",
      data: {
        id: "bp_B", component_key: "node-B", component_type: "form",
        component_id: "form-def-1", name: "Form B", prerequisites: ["node-A"], input_mapping: {},
      },
    },
    {
      id: "node-D",
      type: "form",
      data: {
        id: "bp_D", component_key: "node-D", component_type: "form",
        component_id: "form-def-1", name: "Form D", prerequisites: ["node-B"], input_mapping: {},
      },
    },
  ],
  forms: [
    {
      id: "form-def-1",
      name: "test form",
      field_schema: {
        type: "object",
        properties: {
          email: { avantos_type: "short-text", type: "string", title: "Email" },
          name: { avantos_type: "short-text", type: "string", title: "Name" },
          tags: { avantos_type: "multi-select", type: "array", title: "Tags" },
        },
      },
    },
  ],
};

describe("directParentSource", () => {
  it("returns only the direct parent fields", () => {
    const fields = directParentSource.getFields("node-D", mockGraph);
    const sourceIds = [...new Set(fields.map((f) => f.sourceId))];
    expect(sourceIds).toEqual(["node-B"]);
  });

  it("returns empty for a root node", () => {
    expect(directParentSource.getFields("node-A", mockGraph)).toHaveLength(0);
  });

  it("populates schema on each field option", () => {
    const fields = directParentSource.getFields("node-D", mockGraph);
    expect(fields.every((f) => Boolean(f.schema))).toBe(true);
  });
});

describe("transitiveAncestorSource", () => {
  it("excludes direct parents, includes grandparents", () => {
    const fields = transitiveAncestorSource.getFields("node-D", mockGraph);
    const sourceIds = [...new Set(fields.map((f) => f.sourceId))];
    expect(sourceIds).not.toContain("node-B");
    expect(sourceIds).toContain("node-A");
  });
});

describe("globalDataSource", () => {
  it("always returns fields regardless of node", () => {
    expect(globalDataSource.getFields("node-D", mockGraph).length).toBeGreaterThan(0);
  });
});

describe("isCompatible", () => {
  const target: FieldSchema = { avantos_type: "short-text", type: "string", title: "Email" };

  const sameType: FieldOption = {
    sourceId: "node-A", sourceLabel: "Form A", fieldKey: "name", fieldLabel: "Name",
    schema: { avantos_type: "short-text", type: "string", title: "Name" },
  };
  const differentType: FieldOption = {
    sourceId: "node-A", sourceLabel: "Form A", fieldKey: "tags", fieldLabel: "Tags",
    schema: { avantos_type: "multi-select", type: "array", title: "Tags" },
  };

  it("accepts same-type candidates", () => {
    expect(directParentSource.isCompatible?.(target, sameType)).toBe(true);
  });

  it("rejects different-type candidates", () => {
    expect(directParentSource.isCompatible?.(target, differentType)).toBe(false);
  });

  it("accepts when candidate has no schema (no info, don't filter)", () => {
    const noSchema: FieldOption = { ...sameType, schema: undefined };
    expect(directParentSource.isCompatible?.(target, noSchema)).toBe(true);
  });
});
