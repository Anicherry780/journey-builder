import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { DataSourceProvider, defaultRegistry } from "../datasources";
import type { GraphData } from "../types";

// minimal but realistic graph: A -> B -> D
const stubGraph: GraphData = {
  id: "bp_test",
  name: "Test Blueprint",
  edges: [
    { source: "node-A", target: "node-B" },
    { source: "node-B", target: "node-D" },
  ],
  nodes: [
    {
      id: "node-A",
      type: "form",
      data: {
        id: "bp_A", component_key: "node-A", component_type: "form",
        component_id: "form-def-1", name: "Form A", prerequisites: [], input_mapping: {},
      },
    },
    {
      id: "node-B",
      type: "form",
      data: {
        id: "bp_B", component_key: "node-B", component_type: "form",
        component_id: "form-def-1", name: "Form B", prerequisites: ["node-A"], input_mapping: {},
      },
    },
    {
      id: "node-D",
      type: "form",
      data: {
        id: "bp_D", component_key: "node-D", component_type: "form",
        component_id: "form-def-1", name: "Form D", prerequisites: ["node-B"], input_mapping: {},
      },
    },
  ],
  forms: [
    {
      id: "form-def-1",
      name: "test form",
      field_schema: {
        type: "object",
        properties: {
          email: { avantos_type: "short-text", type: "string", title: "Email" },
          name: { avantos_type: "short-text", type: "string", title: "Name" },
        },
      },
    },
  ],
};

vi.mock("../api/graph", () => ({
  fetchGraph: vi.fn(() => Promise.resolve(stubGraph)),
}));

function renderApp() {
  return render(
    <DataSourceProvider registry={defaultRegistry}>
      <App />
    </DataSourceProvider>
  );
}

describe("App integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("loads the graph and lists forms in topological order", async () => {
    renderApp();
    expect(await screen.findByText("Form A")).toBeInTheDocument();

    const rows = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    const formAIdx = rows.findIndex((t) => t.includes("Form A"));
    const formBIdx = rows.findIndex((t) => t.includes("Form B"));
    const formDIdx = rows.findIndex((t) => t.includes("Form D"));
    expect(formAIdx).toBeLessThan(formBIdx);
    expect(formBIdx).toBeLessThan(formDIdx);
  });

  it("opens the modal, picks a source field, saves, then clears it", async () => {
    const user = userEvent.setup();
    renderApp();

    // pick Form D so we have direct + transitive ancestors available
    await user.click(await screen.findByText("Form D"));

    // each field row has an "Add prefill source" button when empty —
    // there are two, scope to the first (under "Email")
    const emailRow = (await screen.findByText("Email")).closest("article")!;
    await user.click(within(emailRow).getByRole("button", { name: /Add prefill source/ }));

    // modal opens — scope subsequent queries to it
    const dialog = await screen.findByRole("dialog");
    const inModal = within(dialog);

    // expand "Direct parent forms" group and pick Form B's email
    await user.click(inModal.getByRole("button", { name: /Direct parent forms/ }));
    await user.click(inModal.getByRole("button", { name: "Email" }));
    await user.click(inModal.getByRole("button", { name: "Select" }));

    // mapped tag appears in the panel
    expect(await screen.findByText(/Form B → Email/)).toBeInTheDocument();

    // click the X to clear
    await user.click(screen.getByRole("button", { name: /clear email/ }));

    // and the empty "Add prefill source" button is back
    const emailRowAfter = (await screen.findByText("Email")).closest("article")!;
    expect(within(emailRowAfter).getByRole("button", { name: /Add prefill source/ })).toBeInTheDocument();
  });

  it("persists mappings to sessionStorage and rehydrates on next load", async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();

    await user.click(await screen.findByText("Form D"));
    const emailRow = (await screen.findByText("Email")).closest("article")!;
    await user.click(within(emailRow).getByRole("button", { name: /Add prefill source/ }));

    const dialog = await screen.findByRole("dialog");
    const inModal = within(dialog);
    await user.click(inModal.getByRole("button", { name: /Direct parent forms/ }));
    await user.click(inModal.getByRole("button", { name: "Email" }));
    await user.click(inModal.getByRole("button", { name: "Select" }));

    // confirm it was written
    const stored = sessionStorage.getItem("jb:mappings");
    expect(stored).toContain("node-B");

    // remount the app — mapping should still be there
    unmount();
    renderApp();
    await user.click(await screen.findByText("Form D"));
    expect(await screen.findByText(/Form B → Email/)).toBeInTheDocument();
  });
});
