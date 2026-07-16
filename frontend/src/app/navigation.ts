import {
  BarChart3,
  BrushCleaning,
  Database,
  FileUp,
  Home,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  SquareTerminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  accent: "brand" | "sky" | "lilac" | "rose" | "mint" | "amber";
}

export interface NavigationSection {
  label: string;
  advanced?: boolean;
  items: NavigationItem[];
}

export const workspaceNavigationItem: NavigationItem = {
  label: "Workspace",
  description: "Project overview and workflow entry points",
  path: "/",
  icon: Home,
  accent: "brand",
};

export const navigationSections: NavigationSection[] = [
  {
    label: "Bring in data",
    items: [
      {
        label: "Data Sources",
        description: "Files and external database connections",
        path: "/data-sources",
        icon: Database,
        accent: "mint",
      },
      {
        label: "Import",
        description: "Upload, preview, and confirm fields",
        path: "/import",
        icon: FileUp,
        accent: "sky",
      },
      {
        label: "Datasets",
        description: "Materialized tables and data quality",
        path: "/datasets",
        icon: ListChecks,
        accent: "brand",
      },
    ],
  },
  {
    label: "Tell the story",
    items: [
      {
        label: "Charts",
        description: "Visualize reusable data views",
        path: "/charts",
        icon: BarChart3,
        accent: "sky",
      },
      {
        label: "Dashboards",
        description: "Compose analysis and reports",
        path: "/dashboards",
        icon: LayoutDashboard,
        accent: "lilac",
      },
    ],
  },
  {
    label: "Advanced tools",
    advanced: true,
    items: [
      {
        label: "Cleaning",
        description: "Reusable visual transformation recipes",
        path: "/cleaning",
        icon: BrushCleaning,
        accent: "rose",
      },
      {
        label: "SQL Workspace",
        description: "Read-only project analysis queries",
        path: "/sql",
        icon: SquareTerminal,
        accent: "lilac",
      },
    ],
  },
  {
    label: "Run and trace",
    items: [
      {
        label: "Tasks",
        description: "Status, failures, retries, and resources",
        path: "/tasks",
        icon: ScrollText,
        accent: "amber",
      },
    ],
  },
];

export const navigationItems = [
  workspaceNavigationItem,
  ...navigationSections.flatMap((section) => section.items),
];

export const routeMeta = Object.fromEntries(
  navigationItems.map((item) => [
    item.path,
    {
      section:
        item.path === "/"
          ? "Project workspace"
          : (navigationSections.find((section) => section.items.includes(item))
              ?.label ?? "Workspace"),
      title: item.label,
      description: item.description,
    },
  ]),
);
