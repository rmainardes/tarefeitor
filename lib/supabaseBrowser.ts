// Cliente Supabase do navegador (seção 8.4): só assina o canal de broadcast
// "panel" com a publishable key. Nunca lê tabelas direto — RLS não libera
// nenhuma policy, todo acesso a dados passa pelo servidor (seção 4).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | undefined;

export function getSupabaseBrowser(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  cachedClient = createClient(url, publishableKey, { auth: { persistSession: false } });
  return cachedClient;
}
