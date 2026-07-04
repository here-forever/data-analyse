import type { ReactNode } from "react";

import { PlaceholderPage } from "./PlaceholderPage";

export const routePlaceholders: Record<string, ReactNode> = {
  "/": (
    <PlaceholderPage
      title="Professional data workspace"
      description="Start from project data sources, create datasets, clean data, save reusable views, and build dashboards."
    />
  ),
  "/data-sources": (
    <PlaceholderPage
      title="Data sources"
      description="CSV, Excel, and future database/API connectors will be managed here."
    />
  ),
  "/import": (
    <PlaceholderPage
      title="Import wizard"
      description="Upload files, preview fields, confirm types, and create formal datasets."
    />
  ),
  "/datasets": (
    <PlaceholderPage
      title="Datasets"
      description="Inspect formal datasets, fields, source metadata, and lineage entries."
    />
  ),
  "/sql": (
    <PlaceholderPage
      title="SQL workspace"
      description="Run safe project-scoped SQL and save results as reusable data views."
    />
  ),
  "/charts": (
    <PlaceholderPage
      title="Charts"
      description="Configure charts from stable data views with dimensions and metrics."
    />
  ),
  "/dashboards": (
    <PlaceholderPage
      title="Dashboards"
      description="Arrange chart widgets into configurable dashboards and reports."
    />
  ),
  "/tasks": (
    <PlaceholderPage
      title="Task center"
      description="Track imports, cleaning runs, SQL materialization, errors, and retries."
    />
  ),
};
