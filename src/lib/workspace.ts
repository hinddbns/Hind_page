import type { ProfileCategory } from "@prisma/client";

export type Workspace = "ADOLESCENT" | "PARENT_TEACHER";

export function workspaceFromCategory(category: ProfileCategory | null | undefined): Workspace {
  return category === "ADOLESCENT" ? "ADOLESCENT" : "PARENT_TEACHER";
}
