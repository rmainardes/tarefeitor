"use client";

import { useEffect, useState } from "react";

const CACHE_KEY = "panel_last_state";

/**
 * Offline (seção 8.5): sem rede, mostra o estado guardado com selo "offline"
 * e desativa as ações de escrita. Sem service worker — o cache em
 * `localStorage` é só uma rede de segurança de baixo esforço (seção 1, #22).
 */
export function useOfflineCache<T>(data: T): boolean {
  const [isOffline, setIsOffline] = useState(false);

  // Leitura única de `navigator.onLine` (client-only, indisponível no SSR) —
  // mesmo padrão de `usePanelChrome` para evitar divergência de hidratação.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setIsOffline(!window.navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (isOffline) return;
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
      // Armazenamento indisponível (privado/cheio): cache é melhor-esforço.
    }
  }, [data, isOffline]);

  return isOffline;
}
