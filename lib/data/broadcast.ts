// Emissão do broadcast de tempo real (seção 8.4). Usa `httpSend` (REST, sem
// socket) porque quem chama é uma Server Action de vida curta. Nunca lança:
// um aviso em tempo real perdido não pode derrubar a escrita que o originou.

import { REALTIME_EVENT, REALTIME_TOPIC, type ChangeEvent } from "@/lib/realtime";
import { getSupabaseAdmin } from "./supabaseAdmin";

/** Toda Server Action de escrita chama isto depois de gravar (seção 8.4). */
export async function broadcastChanged(event: ChangeEvent): Promise<void> {
  const supabase = getSupabaseAdmin();
  const channel = supabase.channel(REALTIME_TOPIC);

  try {
    await channel.httpSend(REALTIME_EVENT, event);
  } catch (error) {
    console.error("Falha ao emitir broadcast em tempo real:", error);
  } finally {
    await supabase.removeChannel(channel);
  }
}
