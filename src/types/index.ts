export interface FieldSchema {
  title?: string;
  type: string;
  avantos_type: string;
}

export interface FormDefinition {
  id: string;
  name: string;
  field_schema: {
    type: string;
    properties: Record<string, FieldSchema>;
    required?: string[];
  };
}

export interface NodeData {
  id: string;
  component_key: string;
  component_type: string;
  component_id: string;
  name: string;
  prerequisites: string[];
  input_mapping: Record<string, MappingValue>;
}

/**
 * A single prefill mapping. Stores stable identifiers (node id, field key,
 * global key) — never display labels — so the value survives form renames
 * and is safe to round-trip through persistence.
 */
export type MappingValue =
  | { type: "form_field"; sourceNodeId: string; sourceFieldKey: string }
  | { type: "global"; globalKey: string };

export interface FormNode {
  id: string;
  type: string;
  data: NodeData;
}

export interface Edge {
  source: string;
  target: string;
}

export interface GraphData {
  id: string;
  name: string;
  nodes: FormNode[];
  edges: Edge[];
  forms: FormDefinition[];
}

// a single selectable item in the mapping modal
export interface FieldOption {
  sourceId: string;
  sourceLabel: string;
  fieldKey: string;
  fieldLabel: string;
  /** schema of the source field — used to filter incompatible candidates */
  schema?: FieldSchema;
}

/** Contract every data source plugin must implement. */
export interface DataSource {
  id: string;
  label: string;
  getFields(nodeId: string, graph: GraphData): FieldOption[];
  /**
   * Optional compatibility check. When omitted, all candidates are
   * considered compatible. Returning false hides a candidate for the
   * given target field.
   */
  isCompatible?(targetField: FieldSchema, candidate: FieldOption): boolean;
}
