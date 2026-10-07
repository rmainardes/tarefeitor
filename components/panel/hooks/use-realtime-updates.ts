"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { REALTIME_EVENT, REALTIME_TOPIC, type ChangeEvent } from "@/lib/realtime";

const FALLBACK_REFRESH_MS = 60_000;

interface UseRealtimeUpdatesOptions {
  /** Chamado a cada broadcast recebido, antes da releitura (seção 8.4). */
  onChange?: (event: ChangeEvent) => void;
}

/**
 * Escuta o canal `panel`/`changed` e refaz a leitura pelo servidor; reserva
 * de releitura a cada 60s para o caso de o canal cair (seção 8.4).
 */
export function useRealtimeUpdates({ onChange }: UseRealtimeUpdatesOptions): void {
  const router = useRouter();
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(REALTIME_TOPIC)
      .on("broadcast", { event: REALTIME_EVENT }, ({ payload }) => {
        onChangeRef.current?.(payload as ChangeEvent);
        router.refresh();
      })
      .subscribe();

    const fallback = window.setInterval(() => router.refresh(), FALLBACK_REFRESH_MS);

    return () => {
      window.clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [router]);
}
