import { describe, it, expect } from "vitest";
import { resolveMappingLabel, isMappingValid } from "../lib/mapping";
import type { GraphData, MappingValue } from "../types";

const graph: GraphData = {
  id: "bp_test",
  name: "Test",
  edges: [],
  nodes: [
    {
      id: "node-A",
      type: "form",
      data: {
        id: "bp_A", component_key: "node-A", component_type: "form",
        component_id: "form-def-1", name: "Form A", prerequisites: [], input_mapping: {},
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
        },
      },
    },
  ],
};

describe("resolveMappingLabel", () => {
  it("renders form-field mapping with the live form name and field title", () => {
    const m: MappingValue = { type: "form_field", sourceNodeId: "node-A", sourceFieldKey: "email" };
    expect(resolveMappingLabel(m, graph)).toBe("Form A → Email");
  });

  it("renders global mapping with a friendly label", () => {
    const m: MappingValue = { type: "global", globalKey: "user_email" };
    expect(resolveMappingLabel(m, graph)).toBe("Global → Current User Email");
  });

  it("falls back to (unknown form) for stale node references", () => {
    const m: MappingValue = { type: "form_field", sourceNodeId: "ghost", sourceFieldKey: "email" };
    expect(resolveMappingLabel(m, graph)).toMatch(/unknown form/);
  });
});

describe("isMappingValid", () => {
  it("is true for an existing node + field", () => {
    const m: MappingValue = { type: "form_field", sourceNodeId: "node-A", sourceFieldKey: "email" };
    expect(isMappingValid(m, graph)).toBe(true);
  });

  it("is false when the source node is gone", () => {
    const m: MappingValue = { type: "form_field", sourceNodeId: "ghost", sourceFieldKey: "email" };
    expect(isMappingValid(m, graph)).toBe(false);
  });

  it("is false when the field no longer exists on the source form", () => {
    const m: MappingValue = { type: "form_field", sourceNodeId: "node-A", sourceFieldKey: "removed" };
    expect(isMappingValid(m, graph)).toBe(false);
  });

  it("is true for a known global key, false for an unknown one", () => {
    expect(isMappingValid({ type: "global", globalKey: "user_email" }, graph)).toBe(true);
    expect(isMappingValid({ type: "global", globalKey: "nope" }, graph)).toBe(false);
  });
});
