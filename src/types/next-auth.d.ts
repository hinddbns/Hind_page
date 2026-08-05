import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      workspace: "ADOLESCENT" | "PARENT_TEACHER";
    } & DefaultSession["user"];
  }

  interface User {
    role: "USER" | "ADMIN";
    workspace: "ADOLESCENT" | "PARENT_TEACHER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
    workspace: "ADOLESCENT" | "PARENT_TEACHER";
  }
}
