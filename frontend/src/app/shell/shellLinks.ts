export const DEFAULT_PROJECT_ID = "prj_demo";

export function projectPath(path: string, projectId: string) {
  if (path === "/") {
    return `/?project_id=${encodeURIComponent(projectId)}`;
  }
  return `${path}?project_id=${encodeURIComponent(projectId)}`;
}
