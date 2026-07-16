import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { useWorkspaceStore } from "../features/workspace/workspaceStore";
import { renderWithProviders } from "../test/test-utils";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      activeProjectId: null,
      advancedView: false,
      sidebarCollapsed: false,
    });
  });

  test("renders the project workspace and grouped navigation", () => {
    renderWithProviders(<AppShell />, { route: "/?project_id=prj_demo" });

    expect(
      screen.getByRole("heading", { name: "Data Analysis System" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute(
      "href",
      "/?project_id=prj_demo",
    );
    expect(
      screen.getByRole("link", { name: "Data Sources" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "SQL Workspace" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Turn curious data into clear stories."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Bring in data").length).toBeGreaterThan(0);
    expect(screen.getByText("Tell the story")).toBeInTheDocument();
  });

  test("reveals professional tools only when requested", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);

    await user.click(screen.getByRole("switch", { name: "Pro view" }));

    expect(
      screen.getByRole("link", { name: "SQL Workspace" }),
    ).toBeInTheDocument();
    expect(useWorkspaceStore.getState().advancedView).toBe(true);
  });

  test("groups workflow creation actions in a start menu", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />, {
      route: "/datasets?project_id=prj_target",
    });

    await user.click(screen.getByRole("button", { name: "Start" }));

    expect(
      screen.getByRole("menu", { name: "Start a workflow" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Import a file").closest("a")).toHaveAttribute(
      "href",
      "/import?project_id=prj_target",
    );
    expect(screen.getByText("Query with SQL")).toBeInTheDocument();
    expect(screen.getByText("Compose dashboard")).toBeInTheDocument();
  });

  test("opens a searchable workspace command palette", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);

    await user.click(
      screen.getByRole("button", { name: "Open workspace search" }),
    );
    const search = screen.getByRole("textbox", { name: "Search workspace" });
    await user.type(search, "SQL");

    expect(
      screen.getByRole("dialog", { name: "Navigate workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Read-only project analysis queries"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Materialized tables and data quality"),
    ).not.toBeInTheDocument();
  });

  test("supports a compact desktop sidebar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    expect(useWorkspaceStore.getState().sidebarCollapsed).toBe(true);
  });

  test("opens and closes the mobile navigation drawer", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Data Sources" })).toHaveLength(
      2,
    );

    await user.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(
      screen.queryByRole("button", { name: "Close navigation" }),
    ).not.toBeInTheDocument();
  });
});
