import { useMemo } from "react";
import type { FormNode, MappingValue } from "../types";
import { getLevels } from "../lib/topology";
import { color, font, radius, shadow, space } from "../theme/tokens";

interface Props {
  nodes: FormNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  mappings: Record<string, Record<string, MappingValue>>;
}

const LEVEL_LABELS = ["Root forms", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5"];

function levelLabel(idx: number): string {
  return LEVEL_LABELS[idx] ?? `Level ${idx}`;
}

export function FormList({ nodes, selectedId, onSelect, mappings }: Props) {
  const levels = useMemo(() => getLevels(nodes), [nodes]);

  return (
    <aside style={container} aria-label="Forms">
      <h2 style={heading}>Forms</h2>
      {levels.map((level) => (
        <section key={level.index} style={{ marginBottom: space.md }}>
          <p style={sectionLabel}>{levelLabel(level.index)}</p>
          <ul style={list}>
            {level.nodes.map((node) => {
              const active = node.id === selectedId;
              const configured = Object.keys(mappings[node.id] ?? {}).length;
              return (
                <li key={node.id} style={{ listStyle: "none" }}>
                  <button
                    style={{
                      ...item,
                      background: active ? color.primaryFaint : color.surface,
                      borderColor: active ? color.primary : color.border,
                      boxShadow: active ? shadow.sm : "none",
                    }}
                    onClick={() => onSelect(node.id)}
                    aria-pressed={active}
                  >
                    <span style={formIcon} aria-hidden>
                      ▦
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ ...formName, color: active ? color.primaryHover : color.text }}>
                        {node.data.name}
                      </span>
                      <span style={formSub}>
                        {node.data.prerequisites.length === 0
                          ? "No prerequisites"
                          : `Depends on ${node.data.prerequisites.length} form${node.data.prerequisites.length === 1 ? "" : "s"}`}
                      </span>
                    </span>
                    {configured > 0 && (
                      <span style={chip} title={`${configured} mapping${configured === 1 ? "" : "s"} configured`}>
                        {configured}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}

const container: React.CSSProperties = {
  width: 280,
  borderRight: `1px solid ${color.border}`,
  padding: space.lg,
  background: color.bg,
  overflowY: "auto",
};

const heading: React.CSSProperties = {
  margin: `0 0 ${space.md}px`,
  fontSize: font.size.lg,
  fontWeight: font.weight.semibold,
  color: color.text,
};

const sectionLabel: React.CSSProperties = {
  margin: `${space.md}px 0 ${space.xs}px`,
  fontSize: font.size.xs,
  fontWeight: font.weight.semibold,
  color: color.textSubtle,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const list: React.CSSProperties = { margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: space.xs };

const item: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: `${space.sm}px ${space.md}px`,
  border: "1px solid",
  borderRadius: radius.md,
  cursor: "pointer",
  display: "flex",
  gap: space.sm,
  alignItems: "center",
  fontFamily: font.family,
  transition: "border-color 120ms ease, background 120ms ease, box-shadow 120ms ease",
};

const formIcon: React.CSSProperties = {
  fontSize: 18,
  color: color.primary,
  flexShrink: 0,
};

const formName: React.CSSProperties = {
  display: "block",
  fontWeight: font.weight.medium,
  fontSize: font.size.base,
};

const formSub: React.CSSProperties = {
  display: "block",
  marginTop: 2,
  fontSize: font.size.sm,
  color: color.textMuted,
};

const chip: React.CSSProperties = {
  fontSize: font.size.xs,
  fontWeight: font.weight.semibold,
  color: color.primaryHover,
  background: color.primaryFaint,
  border: `1px solid ${color.primaryBorder}`,
  padding: `2px ${space.sm}px`,
  borderRadius: radius.pill,
  flexShrink: 0,
};
