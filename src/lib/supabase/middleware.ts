import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on every request, per Supabase's
// documented Next.js proxy/middleware pattern. proxy.ts calls this first and
// uses the returned `user` for its own auth/verification redirects.
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() (not getSession()) revalidates against Supabase's servers — see
  // docs/ARCHITECTURE.md's Auth & session note on why getSession() alone is
  // unsafe for anything used in an authorization decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
