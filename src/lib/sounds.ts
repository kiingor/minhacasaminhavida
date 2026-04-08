import { Howl } from "howler";

const SOUND_KEY = "mcmv-sound-enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_KEY) !== "false";
}

export function setSoundEnabled(v: boolean) {
  localStorage.setItem(SOUND_KEY, v ? "true" : "false");
}

const cache = new Map<string, Howl>();

export function playSound(src: string, volume = 0.6) {
  if (!isSoundEnabled()) return;
  let howl = cache.get(src);
  if (!howl) {
    howl = new Howl({ src: [src], volume });
    cache.set(src, howl);
  }
  howl.play();
}

export const SOUNDS = {
  levelUp: "/sounds/level-up-medieval.mp3",
  taskCheck: "/sounds/task-check.mp3",
  taskUncheck: "/sounds/task-uncheck.mp3",
  xpGain: "/sounds/xp-gain.mp3",
} as const;
