import { useState } from "react";
import type { FieldOption, FormNode, GraphData, MappingValue } from "../types";
import { getFormDefinition } from "../lib/dag";
import { isMappingValid, resolveMappingLabel } from "../lib/mapping";
import { color, font, radius, shadow, space } from "../theme/tokens";
import { MappingModal } from "./MappingModal";

interface Props {
  node: FormNode;
  graph: GraphData;
  mappings: Record<string, MappingValue>;
  onSetMapping: (fieldKey: string, value: MappingValue) => void;
  onClearMapping: (fieldKey: string) => void;
}

export function PrefillPanel({ node, graph, mappings, onSetMapping, onClearMapping }: Props) {
  const [modalField, setModalField] = useState<string | null>(null);
  const [prefillEnabled, setPrefillEnabled] = useState(true);

  const formDef = getFormDefinition(node, graph);
  if (!formDef) return <p style={{ padding: space.xl }}>No form definition found.</p>;

  function applyMapping(fieldKey: string, option: FieldOption) {
    const value: MappingValue =
      option.sourceId === "global"
        ? { type: "global", globalKey: option.fieldKey }
        : { type: "form_field", sourceNodeId: option.sourceId, sourceFieldKey: option.fieldKey };
    onSetMapping(fieldKey, value);
  }

  const fields = Object.entries(formDef.field_schema.properties);
  const required = new Set(formDef.field_schema.required ?? []);

  return (
    <section style={container} aria-label="Prefill configuration">
      <header style={header}>
        <div>
          <h2 style={panelTitle}>{node.data.name} · Prefill</h2>
          <p style={panelSub}>Configure how each field on this form is filled from upstream data.</p>
        </div>
        <button
          style={{
            ...toggle,
            background: prefillEnabled ? color.primary : color.borderStrong,
          }}
          onClick={() => setPrefillEnabled((v) => !v)}
          aria-label="toggle prefill"
          aria-pressed={prefillEnabled}
        >
          <span style={{ ...toggleKnob, transform: `translateX(${prefillEnabled ? 18 : 0}px)` }} />
        </button>
      </header>

      {prefillEnabled && (
        <div style={fieldList}>
          {fields.map(([key, schema]) => {
            const mapped = mappings[key];
            const stale = mapped ? !isMappingValid(mapped, graph) : false;
            const label = mapped ? resolveMappingLabel(mapped, graph) : null;
            const isRequired = required.has(key);

            return (
              <article key={key} style={row}>
                <span style={icon} aria-hidden>
                  ▦
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={fieldHeader}>
                    <span style={fieldName}>{schema.title ?? key}</span>
                    {schema.type && <span style={typeChip}>{schema.type}</span>}
                    {isRequired && <span style={requiredMark} title="Required">*</span>}
                  </div>

                  {mapped ? (
                    <div
                      style={{
                        ...mappedTag,
                        borderColor: stale ? color.warning : color.successFaint,
                        background: stale ? color.warningFaint : color.successFaint,
                      }}
                    >
                      <span style={{ fontSize: font.size.sm, color: color.text }}>
                        {stale ? "⚠ " : "✓ "}
                        {label}
                      </span>
                      <button
                        style={clearBtn}
                        onClick={() => onClearMapping(key)}
                        aria-label={`clear ${key}`}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button style={emptyField} onClick={() => setModalField(key)}>
                      <span style={{ color: color.textSubtle }}>+ Add prefill source</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalField && (
        <MappingModal
          nodeId={node.id}
          fieldKey={modalField}
          targetSchema={formDef.field_schema.properties[modalField]}
          graph={graph}
          onSelect={(opt) => applyMapping(modalField, opt)}
          onClose={() => setModalField(null)}
        />
      )}
    </section>
  );
}

const container: React.CSSProperties = {
  padding: space.xl,
  borderLeft: `1px solid ${color.border}`,
  minWidth: 360,
  maxWidth: 920,
  margin: "0 auto",
};
const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: space.lg,
  gap: space.lg,
};
const panelTitle: React.CSSProperties = {
  margin: 0,
  fontWeight: font.weight.semibold,
  fontSize: font.size.xl,
  color: color.text,
};
const panelSub: React.CSSProperties = {
  margin: `${space.xs}px 0 0`,
  fontSize: font.size.md,
  color: color.textMuted,
};
const toggle: React.CSSProperties = {
  width: 42,
  height: 24,
  borderRadius: radius.pill,
  border: "none",
  cursor: "pointer",
  flexShrink: 0,
  position: "relative",
  padding: 0,
  transition: "background 120ms ease",
};
const toggleKnob: React.CSSProperties = {
  display: "block",
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: color.surface,
  margin: 2,
  boxShadow: shadow.sm,
  transition: "transform 120ms ease",
};
const fieldList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space.sm,
};
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: space.md,
  padding: space.md,
  background: color.surface,
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  boxShadow: shadow.sm,
};
const icon: React.CSSProperties = { color: color.primary, fontSize: 18, marginTop: 2 };
const fieldHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: space.sm,
  marginBottom: space.xs,
};
const fieldName: React.CSSProperties = {
  fontWeight: font.weight.medium,
  fontSize: font.size.base,
  color: color.text,
};
const typeChip: React.CSSProperties = {
  fontSize: font.size.xs,
  fontWeight: font.weight.medium,
  color: color.textMuted,
  background: color.surfaceMuted,
  padding: `1px ${space.sm}px`,
  borderRadius: radius.pill,
};
const requiredMark: React.CSSProperties = { color: color.danger, fontSize: font.size.base };
const emptyField: React.CSSProperties = {
  width: "100%",
  padding: `${space.sm}px ${space.md}px`,
  border: `1px dashed ${color.borderStrong}`,
  borderRadius: radius.md,
  background: color.surfaceMuted,
  textAlign: "left",
  cursor: "pointer",
  fontSize: font.size.md,
  fontFamily: font.family,
};
const mappedTag: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: space.sm,
  padding: `${space.sm}px ${space.md}px`,
  border: "1px solid",
  borderRadius: radius.md,
};
const clearBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: color.textMuted,
  fontSize: font.size.base,
  padding: 0,
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: radius.pill,
};
