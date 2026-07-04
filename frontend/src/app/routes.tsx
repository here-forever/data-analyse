import type { ReactNode } from "react";

import { CleaningWorkbenchPage } from "../features/cleaning/CleaningWorkbenchPage";
import { DatasetPage } from "../features/datasets/DatasetPage";
import { ImportWizardPage } from "../features/imports/ImportWizardPage";
import { SqlWorkspacePage } from "../features/sql/SqlWorkspacePage";
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
  "/import": <ImportWizardPage />,
  "/datasets": <DatasetPage />,
  "/cleaning": <CleaningWorkbenchPage />,
  "/sql": <SqlWorkspacePage />,
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
