import { directParentSource, transitiveAncestorSource } from "./formFields";
import { globalDataSource } from "./globalData";
import { DataSourceRegistry } from "./registry";

/**
 * The default registry used by the app at runtime. Tests and tenant-
 * specific builds can construct their own registry with a different mix.
 *
 * To add a new source: implement the DataSource interface in its own file
 * under src/datasources/ and register it here.
 */
export const defaultRegistry = new DataSourceRegistry([
  directParentSource,
  transitiveAncestorSource,
  globalDataSource,
]);

export { DataSourceRegistry } from "./registry";
export { DataSourceProvider, useDataSources } from "./context";
