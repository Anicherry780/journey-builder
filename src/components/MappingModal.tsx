import { useEffect, useMemo, useRef, useState } from "react";
import type { DataSource, FieldOption, FieldSchema, GraphData } from "../types";
import { useDataSources } from "../datasources";
import { color, font, radius, shadow, space } from "../theme/tokens";

interface Props {
  nodeId: string;
  fieldKey: string;
  /** schema of the field being mapped — used to filter incompatible sources */
  targetSchema: FieldSchema;
  graph: GraphData;
  onSelect: (option: FieldOption) => void;
  onClose: () => void;
}

export function MappingModal({ nodeId, fieldKey, targetSchema, graph, onSelect, onClose }: Props) {
  const sources = useDataSources();
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<FieldOption | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // memoize per source: getFields() + the compatibility filter
  const fieldsBySource = useMemo(() => {
    const map = new Map<string, FieldOption[]>();
    sources.forEach((source) => {
      const compatible = source
        .getFields(nodeId, graph)
        .filter((opt) => (source.isCompatible ? source.isCompatible(targetSchema, opt) : true));
      map.set(source.id, compatible);
    });
    return map;
  }, [sources, nodeId, graph, targetSchema]);

  // close on Esc + autofocus the search input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    searchRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(sourceId: string) {
    setExpandedSource((prev) => (prev === sourceId ? null : sourceId));
  }

  function matchesSearch(option: FieldOption) {
    const q = search.toLowerCase();
    return (
      option.fieldLabel.toLowerCase().includes(q) ||
      option.sourceLabel.toLowerCase().includes(q) ||
      option.fieldKey.toLowerCase().includes(q)
    );
  }

  function confirm() {
    if (pending) {
      onSelect(pending);
      onClose();
    }
  }

  return (
    <div style={overlay}>
      {/* backdrop is a button so the click-to-close behaviour is keyboard-accessible too */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        style={backdrop}
      />
      <div
        style={modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mapping-modal-title"
      >
        <h3 id="mapping-modal-title" style={title}>
          Select data element to map
          <span style={titleField}>&nbsp;{fieldKey}</span>
        </h3>

        <div style={layout}>
          {/* left panel — available data sources */}
          <div style={leftPanel}>
            <p style={sectionLabel}>Available data</p>
            <input
              ref={searchRef}
              style={searchBox}
              placeholder="Search fields…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search available fields"
            />

            {sources.map((source: DataSource) => {
              const fields = (fieldsBySource.get(source.id) ?? []).filter(matchesSearch);
              if (search && fields.length === 0) return null;
              const expanded = expandedSource === source.id;

              return (
                <div key={source.id} style={{ marginBottom: space.xs }}>
                  <button
                    style={groupHeader}
                    onClick={() => toggle(source.id)}
                    aria-expanded={expanded}
                  >
                    <span style={{ width: 14, display: "inline-block" }}>
                      {expanded ? "▾" : "▸"}
                    </span>
                    <span style={{ flex: 1, textAlign: "left" }}>{source.label}</span>
                    <span style={countTag}>{fields.length}</span>
                  </button>

                  {expanded && fields.length === 0 && (
                    <p style={emptyMsg}>No compatible fields from this source.</p>
                  )}

                  {expanded &&
                    fields.map((opt) => {
                      const selected =
                        pending?.sourceId === opt.sourceId && pending?.fieldKey === opt.fieldKey;
                      return (
                        <button
                          key={`${opt.sourceId}-${opt.fieldKey}`}
                          style={{
                            ...fieldItem,
                            background: selected ? color.primaryFaint : "transparent",
                            color: selected ? color.primaryHover : color.text,
                            fontWeight: selected ? font.weight.medium : font.weight.regular,
                          }}
                          onClick={() => setPending(opt)}
                        >
                          {opt.fieldLabel}
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>

          {/* right panel — preview */}
          <div style={rightPanel}>
            {pending ? (
              <>
                <p style={sectionLabel}>Selected</p>
                <p style={previewName}>{pending.fieldLabel}</p>
                <p style={previewMeta}>from {pending.sourceLabel}</p>
                {pending.schema?.type && (
                  <p style={previewMeta}>
                    Type: <code style={code}>{pending.schema.type}</code>
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: color.textSubtle, fontSize: font.size.sm }}>
                Pick a field on the left to preview it here.
              </p>
            )}
          </div>
        </div>

        <div style={footer}>
          <button style={cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...selectBtn, opacity: pending ? 1 : 0.5, cursor: pending ? "pointer" : "not-allowed" }}
            onClick={confirm}
            disabled={!pending}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: space.lg,
};
const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.5)",
  border: "none",
  padding: 0,
  cursor: "pointer",
};
const modal: React.CSSProperties = {
  position: "relative",
  background: color.surface,
  borderRadius: radius.lg,
  padding: space.xl,
  width: "min(720px, 100%)",
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: shadow.lg,
  fontFamily: font.family,
  zIndex: 1,
};
const title: React.CSSProperties = {
  margin: 0,
  fontSize: font.size.lg,
  fontWeight: font.weight.semibold,
  color: color.text,
};
const titleField: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: font.size.md,
  color: color.primary,
  background: color.primaryFaint,
  padding: `2px ${space.sm}px`,
  borderRadius: radius.sm,
  marginLeft: space.xs,
};
const layout: React.CSSProperties = {
  display: "flex",
  gap: space.lg,
  flex: 1,
  overflow: "hidden",
  minHeight: 320,
  marginTop: space.lg,
};
const leftPanel: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  borderRight: `1px solid ${color.border}`,
  paddingRight: space.md,
};
const rightPanel: React.CSSProperties = { flex: 1, paddingLeft: space.sm };
const footer: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: space.sm,
  marginTop: space.lg,
  paddingTop: space.md,
  borderTop: `1px solid ${color.border}`,
};
const sectionLabel: React.CSSProperties = {
  fontSize: font.size.xs,
  color: color.textSubtle,
  margin: `0 0 ${space.sm}px`,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: font.weight.semibold,
};
const searchBox: React.CSSProperties = {
  width: "100%",
  padding: `${space.sm}px ${space.md}px`,
  marginBottom: space.sm,
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  boxSizing: "border-box",
  fontSize: font.size.md,
  fontFamily: font.family,
};
const groupHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: space.sm,
  width: "100%",
  background: color.surfaceMuted,
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  padding: `${space.sm}px ${space.md}px`,
  cursor: "pointer",
  fontWeight: font.weight.medium,
  fontSize: font.size.md,
  color: color.text,
  fontFamily: font.family,
};
const countTag: React.CSSProperties = {
  fontSize: font.size.xs,
  color: color.textMuted,
  background: color.surface,
  border: `1px solid ${color.border}`,
  padding: `1px ${space.sm}px`,
  borderRadius: radius.pill,
};
const fieldItem: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  border: "none",
  padding: `${space.xs}px ${space.lg}px ${space.xs}px ${space.xl}px`,
  cursor: "pointer",
  fontSize: font.size.md,
  borderRadius: radius.sm,
  fontFamily: font.family,
  marginTop: 2,
};
const emptyMsg: React.CSSProperties = {
  padding: `${space.xs}px ${space.xl}px`,
  fontSize: font.size.sm,
  color: color.textSubtle,
  fontStyle: "italic",
};
const previewName: React.CSSProperties = {
  margin: 0,
  fontSize: font.size.lg,
  fontWeight: font.weight.semibold,
  color: color.text,
};
const previewMeta: React.CSSProperties = {
  margin: `${space.xs}px 0 0`,
  fontSize: font.size.sm,
  color: color.textMuted,
};
const code: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: font.size.sm,
  background: color.surfaceMuted,
  padding: `1px ${space.xs}px`,
  borderRadius: radius.sm,
};
const cancelBtn: React.CSSProperties = {
  padding: `${space.sm}px ${space.lg}px`,
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  background: color.surface,
  cursor: "pointer",
  fontSize: font.size.md,
  fontFamily: font.family,
};
const selectBtn: React.CSSProperties = {
  padding: `${space.sm}px ${space.lg}px`,
  border: "none",
  borderRadius: radius.md,
  background: color.primary,
  color: color.surface,
  fontWeight: font.weight.medium,
  fontSize: font.size.md,
  fontFamily: font.family,
};
