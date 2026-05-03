import type { DataSource, FieldOption } from "../types";

// static global fields available across all forms.
// adding a new global category means adding entries here — no other code changes needed.
const GLOBAL_FIELDS: FieldOption[] = [
  { sourceId: "global", sourceLabel: "Global", fieldKey: "org_id", fieldLabel: "Organisation ID" },
  { sourceId: "global", sourceLabel: "Global", fieldKey: "org_name", fieldLabel: "Organisation Name" },
  { sourceId: "global", sourceLabel: "Global", fieldKey: "user_id", fieldLabel: "Current User ID" },
  { sourceId: "global", sourceLabel: "Global", fieldKey: "user_email", fieldLabel: "Current User Email" },
];

export const globalDataSource: DataSource = {
  id: "global",
  label: "Global data",
  getFields(_nodeId, _graph) {
    return GLOBAL_FIELDS;
  },
};
