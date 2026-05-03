import { describe, it, expect } from "vitest";
import { mappingsReducer, emptyMappings } from "../state/mappingsReducer";
import type { MappingValue } from "../types";

const sampleMapping: MappingValue = {
  type: "form_field",
  sourceNodeId: "node-A",
  sourceFieldKey: "email",
};

describe("mappingsReducer", () => {
  it("SET_MAPPING adds a new node entry", () => {
    const next = mappingsReducer(emptyMappings, {
      type: "SET_MAPPING",
      nodeId: "node-D",
      fieldKey: "email",
      value: sampleMapping,
    });
    expect(next["node-D"].email).toEqual(sampleMapping);
  });

  it("SET_MAPPING does not mutate the input state", () => {
    const before = emptyMappings;
    mappingsReducer(before, {
      type: "SET_MAPPING", nodeId: "node-D", fieldKey: "email", value: sampleMapping,
    });
    expect(before).toEqual({});
  });

  it("CLEAR_MAPPING removes the field but keeps other fields", () => {
    const seeded = { "node-D": { email: sampleMapping, name: sampleMapping } };
    const next = mappingsReducer(seeded, {
      type: "CLEAR_MAPPING", nodeId: "node-D", fieldKey: "email",
    });
    expect(next["node-D"].email).toBeUndefined();
    expect(next["node-D"].name).toEqual(sampleMapping);
  });

  it("HYDRATE replaces the entire state", () => {
    const before = { "node-X": { foo: sampleMapping } };
    const fresh = { "node-Y": { bar: sampleMapping } };
    expect(mappingsReducer(before, { type: "HYDRATE", mappings: fresh })).toEqual(fresh);
  });
});
