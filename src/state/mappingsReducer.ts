import type { MappingValue } from "../types";

/**
 * Per-node prefill mappings, keyed by node id then by field key. Kept
 * separate from the graph itself so mutating mappings doesn't force the
 * whole graph through React reconciliation.
 */
export type MappingsState = Record<string, Record<string, MappingValue>>;

export type MappingsAction =
  | { type: "SET_MAPPING"; nodeId: string; fieldKey: string; value: MappingValue }
  | { type: "CLEAR_MAPPING"; nodeId: string; fieldKey: string }
  | { type: "HYDRATE"; mappings: MappingsState };

export function mappingsReducer(state: MappingsState, action: MappingsAction): MappingsState {
  switch (action.type) {
    case "SET_MAPPING": {
      const nodeMap = { ...(state[action.nodeId] ?? {}), [action.fieldKey]: action.value };
      return { ...state, [action.nodeId]: nodeMap };
    }
    case "CLEAR_MAPPING": {
      const nodeMap = { ...(state[action.nodeId] ?? {}) };
      delete nodeMap[action.fieldKey];
      return { ...state, [action.nodeId]: nodeMap };
    }
    case "HYDRATE":
      return action.mappings;
    default:
      return state;
  }
}

export const emptyMappings: MappingsState = {};
