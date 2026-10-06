"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePref = "auto" | "light" | "night";
export type PanelMode = "hand" | "wall";

const THEME_KEY = "panel_theme";
const MODE_KEY = "panel_mode";

function detectMode(): PanelMode {
  if (typeof window === "undefined") return "hand";
  const stored = window.localStorage.getItem(MODE_KEY);
  if (stored === "wall" || stored === "hand") return stored;
  const isWall =
    window.matchMedia("(min-width: 1024px) and (min-height: 640px)").matches &&
    !/Mobi|Android|iPhone|iPad/i.test(window.navigator.userAgent);
  return isWall ? "wall" : "hand";
}

function detectThemePref(): ThemePref {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "night" || stored === "auto" ? stored : "auto";
}

function isNightHour(date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );
  return hour >= 21 || hour < 7;
}

/**
 * Chrome do painel: escala tipográfica por modo (parede × mão) e tema
 * noturno automático das 21h às 7h (seções 8.3 e 9 do plano).
 */
export function usePanelChrome() {
  const [pref, setPref] = useState<ThemePref>("auto");
  const [mode, setMode] = useState<PanelMode>("hand");
  const [night, setNight] = useState(() => isNightHour());
  const [now, setNow] = useState(() => new Date());

  // Lê as preferências salvas só depois de montar (SSR não tem window/localStorage).
  // Leitura única de um valor client-only para evitar divergência de hidratação —
  // não é o padrão de cascata que a regra normalmente evita.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPref(detectThemePref());
    setMode(detectMode());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // tema efetivo
  useEffect(() => {
    const effective = pref === "auto" ? (night ? "night" : "light") : pref;
    const root = document.documentElement;
    root.dataset.theme = effective;
    root.classList.toggle("dark", effective === "night");
  }, [pref, night]);

  // modo de exibição
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    window.localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, pref);
  }, [pref]);

  // vira às 21h sem recarregar o painel
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNight(isNightHour());
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "wall" ? "hand" : "wall"));
  }, []);

  const cycleTheme = useCallback(() => {
    setPref((current) =>
      current === "auto" ? "light" : current === "light" ? "night" : "auto",
    );
  }, []);

  const effectiveTheme: "light" | "night" =
    pref === "auto" ? (night ? "night" : "light") : pref;

  return { pref, effectiveTheme, mode, setMode, toggleMode, cycleTheme, now };
}
