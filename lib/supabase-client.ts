import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — use ONLY in Client Components and hooks
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
