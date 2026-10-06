// Cliente Supabase com a secret key (seção 4: "todo acesso a dados passa pelo
// servidor Next"). Só deve ser importado por Server Actions e outros módulos
// de lib/data — nunca por um componente cliente.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY.",
    );
  }

  cachedClient = createClient(url, secretKey, { auth: { persistSession: false } });
  return cachedClient;
}
