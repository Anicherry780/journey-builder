import { describe, it, expect } from "vitest";
import { DataSourceRegistry } from "../datasources/registry";
import type { DataSource } from "../types";

const stub = (id: string): DataSource => ({
  id,
  label: id,
  getFields: () => [],
});

describe("DataSourceRegistry", () => {
  it("preserves the order in which sources were registered", () => {
    const r = new DataSourceRegistry([stub("a"), stub("b"), stub("c")]);
    expect(r.list().map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("rejects duplicate ids", () => {
    const r = new DataSourceRegistry([stub("a")]);
    expect(() => r.register(stub("a"))).toThrow(/already registered/);
  });

  it("unregister removes a source", () => {
    const r = new DataSourceRegistry([stub("a"), stub("b")]);
    r.unregister("a");
    expect(r.list().map((s) => s.id)).toEqual(["b"]);
  });
});
