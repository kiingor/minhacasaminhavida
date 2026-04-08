"use client";
import { useCallback } from "react";
import { playSound } from "@/lib/sounds";

export function useSound(src: string, volume = 0.6) {
  return useCallback(() => playSound(src, volume), [src, volume]);
}
