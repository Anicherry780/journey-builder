import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormList } from "../components/FormList";
import type { FormNode } from "../types";

function n(id: string, name: string, prerequisites: string[]): FormNode {
  return {
    id,
    type: "form",
    data: {
      id: `bp_${id}`,
      component_key: id,
      component_type: "form",
      component_id: "form-def-1",
      name,
      prerequisites,
      input_mapping: {},
    },
  };
}

describe("FormList", () => {
  it("renders each form and groups them under section headers", () => {
    const nodes = [n("a", "Form A", []), n("b", "Form B", ["a"])];
    render(
      <FormList nodes={nodes} selectedId={null} onSelect={() => {}} mappings={{}} />
    );

    expect(screen.getByText("Form A")).toBeInTheDocument();
    expect(screen.getByText("Form B")).toBeInTheDocument();
    expect(screen.getByText("Root forms")).toBeInTheDocument();
    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked form's id", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const nodes = [n("a", "Form A", [])];
    render(
      <FormList nodes={nodes} selectedId={null} onSelect={onSelect} mappings={{}} />
    );

    await user.click(screen.getByRole("button", { name: /Form A/ }));
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("shows a count chip when a form has configured mappings", () => {
    const nodes = [n("a", "Form A", [])];
    render(
      <FormList
        nodes={nodes}
        selectedId={null}
        onSelect={() => {}}
        mappings={{
          a: {
            email: { type: "global", globalKey: "user_email" },
            name: { type: "global", globalKey: "user_id" },
          },
        }}
      />
    );

    expect(screen.getByTitle(/2 mappings configured/)).toBeInTheDocument();
  });

  it("marks the active form via aria-pressed", () => {
    const nodes = [n("a", "Form A", [])];
    render(
      <FormList nodes={nodes} selectedId="a" onSelect={() => {}} mappings={{}} />
    );

    const btn = screen.getByRole("button", { name: /Form A/ });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});
