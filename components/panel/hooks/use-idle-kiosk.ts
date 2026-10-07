"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["keydown", "mousemove", "mousedown", "touchstart", "wheel"] as const;

interface UseIdleKioskOptions {
  /** Só roda no modo parede (notebook); celular nunca troca de pessoa sozinho. */
  enabled: boolean;
  idleSeconds: number;
  /** Chamado em loop, a cada `idleSeconds`, enquanto ocioso (seção 8.3). */
  onRotate: () => void;
  /** Chamado uma vez, quando qualquer tecla ou o mouse interrompe a rotação. */
  onInterrupt: () => void;
}

/**
 * Rotação ociosa do painel (seção 8.3): depois de `idleSeconds` sem
 * interação, alterna sozinho entre as pessoas; qualquer tecla ou movimento
 * do mouse interrompe e volta à pessoa selecionada.
 */
export function useIdleKiosk({ enabled, idleSeconds, onRotate, onInterrupt }: UseIdleKioskOptions) {
  const onRotateRef = useRef(onRotate);
  const onInterruptRef = useRef(onInterrupt);

  useEffect(() => {
    onRotateRef.current = onRotate;
    onInterruptRef.current = onInterrupt;
  }, [onRotate, onInterrupt]);

  useEffect(() => {
    if (!enabled || idleSeconds <= 0) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    let rotateTimer: ReturnType<typeof setInterval> | null = null;
    let idle = false;

    const stopRotation = () => {
      if (rotateTimer !== null) {
        clearInterval(rotateTimer);
        rotateTimer = null;
      }
      if (idle) {
        idle = false;
        onInterruptRef.current();
      }
    };

    const startRotation = () => {
      idle = true;
      rotateTimer = setInterval(() => onRotateRef.current(), idleSeconds * 1000);
    };

    const resetIdleTimer = () => {
      stopRotation();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(startRotation, idleSeconds * 1000);
    };

    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, resetIdleTimer);
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      if (rotateTimer !== null) clearInterval(rotateTimer);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, resetIdleTimer);
    };
    // Só depende do que muda o próprio ciclo ocioso — `onRotate`/`onInterrupt`
    // mais recentes já estão nos refs, sem reiniciar o timer a cada render.
  }, [enabled, idleSeconds]);
}
