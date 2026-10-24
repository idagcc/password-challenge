export type AudioPreferences = { muted: boolean; musicVolume: number; effectsVolume: number };
export const AUDIO_PREFERENCES_KEY = 'password-challenge.audio.v1';
export const AUDIO_PREFERENCES_EVENT = 'password-challenge-audio-change';
const defaults: AudioPreferences = { muted: false, musicVolume: .24, effectsVolume: .55 };
const clamp = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
export function getAudioPreferences(): AudioPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIO_PREFERENCES_KEY) || '{}');
    return { muted: saved.muted === true, musicVolume: clamp(saved.musicVolume, defaults.musicVolume), effectsVolume: clamp(saved.effectsVolume, defaults.effectsVolume) };
  } catch { return { ...defaults }; }
}
export function saveAudioPreferences(value: AudioPreferences) {
  try { localStorage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify(value)); } catch {}
  window.dispatchEvent(new Event(AUDIO_PREFERENCES_EVENT));
}
