import { createContext, useContext, type ReactNode } from "react";
import type { DataSource } from "../types";
import { DataSourceRegistry } from "./registry";

const DataSourceContext = createContext<DataSourceRegistry | null>(null);

interface ProviderProps {
  registry: DataSourceRegistry;
  children: ReactNode;
}

/**
 * Makes a DataSourceRegistry available to descendants. Tests and tenant
 * variants can pass a different registry without touching consumer code.
 */
export function DataSourceProvider({ registry, children }: ProviderProps) {
  return <DataSourceContext.Provider value={registry}>{children}</DataSourceContext.Provider>;
}

/**
 * Returns the registered data sources from the nearest provider. Throws
 * if used outside a provider so misconfiguration fails loudly.
 */
export function useDataSources(): readonly DataSource[] {
  const registry = useContext(DataSourceContext);
  if (!registry) throw new Error("useDataSources must be used inside <DataSourceProvider>");
  return registry.list();
}
