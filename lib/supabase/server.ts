// utils/supabase/server.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem: (key: string) => {
            try {
              return cookieStore.get(key)?.value ?? null;
            } catch (error) {
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              cookieStore.set(key, value, { path: '/' });
            } catch (error) {
              // Handle error
            }
          },
          removeItem: (key: string) => {
            try {
              cookieStore.delete(key);
            } catch (error) {
              // Handle error
            }
          },
        },
      },
    }
  );
}