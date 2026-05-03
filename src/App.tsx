import { useEffect, useMemo, useReducer, useState } from "react";
import type { GraphData, MappingValue } from "./types";
import { fetchGraph } from "./api/graph";
import { topologicalSort } from "./lib/topology";
import { mappingsReducer, emptyMappings, type MappingsState } from "./state/mappingsReducer";
import { FormList } from "./components/FormList";
import { PrefillPanel } from "./components/PrefillPanel";
import { color, font, shadow, space } from "./theme/tokens";

const STORAGE_KEY = "jb:mappings";

function readPersisted(): MappingsState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MappingsState) : emptyMappings;
  } catch {
    return emptyMappings;
  }
}

export default function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // seed the reducer from sessionStorage synchronously so the first
  // persist-effect doesn't overwrite stored data with empty state
  const [mappings, dispatch] = useReducer(mappingsReducer, emptyMappings, readPersisted);

  // load graph + merge any baked-in input_mapping from the graph response
  useEffect(() => {
    fetchGraph()
      .then((g) => {
        setGraph(g);
        // only merge baked-in mappings for nodes that don't already have a
        // user-saved mapping in sessionStorage
        const merged: MappingsState = { ...readPersisted() };
        g.nodes.forEach((node) => {
          if (!merged[node.id] && Object.keys(node.data.input_mapping ?? {}).length > 0) {
            merged[node.id] = node.data.input_mapping as Record<string, MappingValue>;
          }
        });
        dispatch({ type: "HYDRATE", mappings: merged });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // persist on every mapping change so a refresh keeps user work
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    } catch {
      // sessionStorage may be unavailable (e.g. SSR / private mode); not fatal
    }
  }, [mappings]);

  function handleSetMapping(nodeId: string, fieldKey: string, value: MappingValue) {
    dispatch({ type: "SET_MAPPING", nodeId, fieldKey, value });
  }

  function handleClearMapping(nodeId: string, fieldKey: string) {
    dispatch({ type: "CLEAR_MAPPING", nodeId, fieldKey });
  }

  const orderedNodes = useMemo(() => (graph ? topologicalSort(graph.nodes) : []), [graph]);

  if (loading) return <div style={centered}>Loading graph…</div>;
  if (error)
    return (
      <div style={centered}>
        <strong style={{ color: color.danger }}>Error:</strong>&nbsp;{error}
      </div>
    );
  if (!graph) return null;

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div style={appShell}>
      <header style={topBar}>
        <span style={logo}>Journey Builder</span>
        <span style={blueprintName}>{graph.name}</span>
      </header>

      <div style={body}>
        <FormList
          nodes={orderedNodes}
          selectedId={selectedNodeId}
          onSelect={setSelectedNodeId}
          mappings={mappings}
        />

        <main style={main}>
          {selectedNode ? (
            <PrefillPanel
              node={selectedNode}
              graph={graph}
              mappings={mappings[selectedNode.id] ?? {}}
              onSetMapping={(fieldKey, value) => handleSetMapping(selectedNode.id, fieldKey, value)}
              onClearMapping={(fieldKey) => handleClearMapping(selectedNode.id, fieldKey)}
            />
          ) : (
            <div style={placeholder}>
              <h3 style={placeholderTitle}>Pick a form to start</h3>
              <p style={placeholderBody}>
                Select a form on the left to view and configure its prefill mappings.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const appShell: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  fontFamily: font.family,
  color: color.text,
  background: color.bg,
};
const topBar: React.CSSProperties = {
  padding: `${space.md}px ${space.xl}px`,
  borderBottom: `1px solid ${color.border}`,
  display: "flex",
  alignItems: "center",
  gap: space.lg,
  background: color.surface,
  boxShadow: shadow.sm,
};
const logo: React.CSSProperties = {
  fontWeight: font.weight.bold,
  fontSize: font.size.lg,
  color: color.primary,
};
const blueprintName: React.CSSProperties = { color: color.textMuted, fontSize: font.size.base };
const body: React.CSSProperties = { display: "flex", flex: 1, overflow: "hidden" };
const main: React.CSSProperties = { flex: 1, overflowY: "auto" };
const centered: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  fontFamily: font.family,
  color: color.textMuted,
};
const placeholder: React.CSSProperties = { padding: space.xxl, color: color.textMuted, maxWidth: 480 };
const placeholderTitle: React.CSSProperties = { margin: 0, fontSize: font.size.xl, color: color.text };
const placeholderBody: React.CSSProperties = { margin: `${space.sm}px 0 0`, fontSize: font.size.base };
