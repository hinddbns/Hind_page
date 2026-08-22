import type { Workspace } from "./workspace";

export function parseAuthWorkspace(value: string | null): Workspace | null {
  return value === "ADOLESCENT" || value === "PARENT_TEACHER" ? value : null;
}

type AuthTheme = {
  badgeClass: string;
  toggleActiveClass: string;
  toggleInactiveClass: string;
  buttonClass: string;
  outlineButtonClass: string;
  linkClass: string;
};

const AUTH_THEMES: Record<Workspace, AuthTheme> = {
  ADOLESCENT: {
    badgeClass: "border-accent/40 text-accent",
    toggleActiveClass: "border-accent bg-accent text-ink",
    toggleInactiveClass: "border-accent/30 text-ink-soft hover:border-accent hover:text-accent",
    buttonClass: "bg-accent text-ink hover:bg-accent-dark",
    outlineButtonClass: "border-accent text-accent hover:bg-accent hover:text-ink",
    linkClass: "text-accent hover:underline",
  },
  PARENT_TEACHER: {
    badgeClass: "border-olive-light text-olive-dark",
    toggleActiveClass: "border-olive bg-olive text-cream",
    toggleInactiveClass: "border-olive-light text-ink-soft hover:border-olive hover:text-olive",
    buttonClass: "bg-olive text-cream hover:bg-olive-dark",
    outlineButtonClass: "border-olive text-olive hover:bg-olive hover:text-cream",
    linkClass: "text-olive hover:underline",
  },
};

const DEFAULT_THEME: AuthTheme = {
  badgeClass: "",
  toggleActiveClass: "border-primary bg-primary text-cream",
  toggleInactiveClass: "border-primary-light text-ink-soft hover:border-primary hover:text-primary",
  buttonClass: "bg-primary text-cream hover:bg-primary-dark",
  outlineButtonClass: "border-primary text-primary hover:bg-primary hover:text-cream",
  linkClass: "text-primary hover:underline",
};

export function getAuthTheme(workspace: Workspace | null): AuthTheme {
  return workspace ? AUTH_THEMES[workspace] : DEFAULT_THEME;
}

export function authQueryString(workspace: Workspace | null): string {
  return workspace ? `?workspace=${workspace}` : "";
}
