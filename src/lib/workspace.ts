import type { Enums } from "@/lib/supabase/database.types";

type ProfileCategory = Enums<"ProfileCategory">;

export type Workspace = "ADOLESCENT" | "PARENT_TEACHER";

export function workspaceFromCategory(category: ProfileCategory | null | undefined): Workspace {
  return category === "ADOLESCENT" ? "ADOLESCENT" : "PARENT_TEACHER";
}
