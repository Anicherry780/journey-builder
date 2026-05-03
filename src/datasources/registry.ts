import type { DataSource } from "../types";

/**
 * Mutable, ordered collection of DataSource plugins. Kept as a small class
 * (rather than a plain array) so it has a clear lifecycle and can be
 * scoped per tenant or feature flag in the future.
 */
export class DataSourceRegistry {
  private sources: DataSource[] = [];

  constructor(initial: DataSource[] = []) {
    initial.forEach((s) => this.register(s));
  }

  register(source: DataSource): void {
    if (this.sources.some((s) => s.id === source.id)) {
      throw new Error(`DataSource with id "${source.id}" is already registered`);
    }
    this.sources.push(source);
  }

  unregister(id: string): void {
    this.sources = this.sources.filter((s) => s.id !== id);
  }

  list(): readonly DataSource[] {
    return this.sources;
  }
}
