import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const header = request.headers.get('cookie') ?? '';
          return header
            .split(';')
            .map((pair) => pair.trim())
            .filter(Boolean)
            .map((pair) => {
              const eq = pair.indexOf('=');
              const name = eq === -1 ? pair : pair.slice(0, eq);
              const value = eq === -1 ? '' : pair.slice(eq + 1);
              return { name, value: decodeURIComponent(value) };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options as CookieOptions);
          });
        },
      },
    },
  );
}
