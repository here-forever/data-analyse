import type { ReactNode } from "react";

import { CleaningWorkbenchPage } from "../features/cleaning/CleaningWorkbenchPage";
import { DataSourcesPage } from "../features/dataSources/DataSourcesPage";
import { DataViewSourcePage } from "../features/dataViews/DataViewSourcePage";
import { DatasetPage } from "../features/datasets/DatasetPage";
import { ImportWizardPage } from "../features/imports/ImportWizardPage";
import { SqlWorkspacePage } from "../features/sql/SqlWorkspacePage";
import { TaskCenterPage } from "../features/tasks/TaskCenterPage";
import { PlaceholderPage } from "./PlaceholderPage";

export const routePlaceholders: Record<string, ReactNode> = {
  "/": (
    <PlaceholderPage
      title="Professional data workspace"
      description="Start from project data sources, create datasets, clean data, save reusable views, and build dashboards."
    />
  ),
  "/data-sources": <DataSourcesPage />,
  "/import": <ImportWizardPage />,
  "/datasets": <DatasetPage />,
  "/cleaning": <CleaningWorkbenchPage />,
  "/sql": <SqlWorkspacePage />,
  "/charts": <DataViewSourcePage mode="charts" />,
  "/dashboards": <DataViewSourcePage mode="dashboards" />,
  "/tasks": <TaskCenterPage />,
};
