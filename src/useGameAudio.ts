import { useCallback, useEffect, useRef } from 'react';
import { AUDIO_PREFERENCES_EVENT, AUDIO_PREFERENCES_KEY, getAudioPreferences, saveAudioPreferences } from './audioPreferences';

type Cue = 'key' | 'tap' | 'page' | 'correct' | 'incorrect' | 'complete' | 'validation';
class GameAudio {
  private context: AudioContext | null = null;
  private effects: GainNode | null = null;
  private preferences = getAudioPreferences();
  private lastKey = 0;
  constructor(private music: HTMLAudioElement) { this.updatePreferences(); }
  updatePreferences() {
    this.preferences = getAudioPreferences();
    this.music.volume = this.preferences.musicVolume;
    this.music.muted = this.preferences.muted;
    if (this.effects && this.context) this.effects.gain.setTargetAtTime(this.preferences.muted ? 0 : this.preferences.effectsVolume, this.context.currentTime, .05);
    if (this.preferences.muted || document.hidden) this.music.pause();
    else void this.music.play().catch(() => {});
  }
  unlock() {
    if (this.preferences.muted || document.hidden) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.effects = this.context.createGain();
        this.effects.gain.value = this.preferences.effectsVolume;
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.ratio.value = 5;
        this.effects.connect(compressor).connect(this.context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      if (this.music.paused) void this.music.play().catch(() => {});
    } catch { /* Audio failure must never prevent a game. */ }
  }
  visibility() {
    if (document.hidden) {
      this.music.pause();
      if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
    } else this.unlock();
  }
  cue(cue: Cue) {
    const context = this.context;
    if (!context || context.state !== 'running' || this.preferences.muted || document.hidden) return;
    const at = context.currentTime;
    const tone = (from: number, to: number, duration: number, level: number, offset = 0, type: OscillatorType = 'sine') => {
      const oscillator = context.createOscillator(), envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, at + offset);
      oscillator.frequency.exponentialRampToValueAtTime(to, at + offset + duration);
      envelope.gain.setValueAtTime(.0001, at + offset);
      envelope.gain.exponentialRampToValueAtTime(level, at + offset + .008);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + offset + duration);
      oscillator.connect(envelope).connect(this.effects!);
      oscillator.start(at + offset); oscillator.stop(at + offset + duration + .01);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    };
    if (cue === 'key') {
      if (at - this.lastKey < .035) return;
      this.lastKey = at; tone(1050, 780, .045, .045);
    } else if (cue === 'tap') {
      tone(500, 850, .10, .065); tone(1100, 900, .08, .025, .035);
    } else if (cue === 'page') {
      tone(220, 780, .24, .045, 0, 'triangle'); tone(1400, 700, .20, .018, .05);
    } else if (cue === 'correct') {
      [659.25, 880, 1318.51].forEach((note, i) => tone(note, note, .24, .10, i * .075));
    } else if (cue === 'incorrect') {
      tone(293.66, 220, .28, .075); tone(220, 174.61, .22, .055, .13);
    } else if (cue === 'validation') {
      tone(392, 349.23, .12, .06); tone(392, 349.23, .12, .045, .15);
    } else {
      [587.33, 698.46, 880, 1174.66].forEach((note, i) => tone(note, note, .6, .10, i * .12));
      tone(293.66, 293.66, .85, .06, .15, 'triangle');
    }
  }
  dispose() {
    this.music.pause();
    if (this.context) void this.context.close().catch(() => {});
  }
}

export function useGameAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const director = useRef<GameAudio | null>(null);
  useEffect(() => {
    const audio = new GameAudio(audioRef.current!);
    director.current = audio;
    const pointer = (event: PointerEvent) => {
      if (!event.isTrusted) return;
      audio.unlock();
      const button = (event.target as Element)?.closest?.('button');
      if (button && !(button as HTMLButtonElement).disabled) audio.cue(button.closest('.touch-keyboard') ? 'key' : 'tap');
    };
    const key = (event: KeyboardEvent) => {
      if (!event.isTrusted) return;
      const target = event.target as HTMLElement;
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (!typing && event.key.toLowerCase() === 'm' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        const preferences = getAudioPreferences();
        saveAudioPreferences({ ...preferences, muted: !preferences.muted });
      } else { audio.unlock(); if (typing && event.key.length === 1) audio.cue('key'); }
    };
    const click = (event: MouseEvent) => { if (event.isTrusted) audio.unlock(); };
    const preferences = () => audio.updatePreferences();
    const storage = (event: StorageEvent) => { if (event.key === AUDIO_PREFERENCES_KEY) preferences(); };
    const visibility = () => audio.visibility();
    window.addEventListener('pointerdown', pointer, true);
    window.addEventListener('click', click, true);
    window.addEventListener('keydown', key, true);
    window.addEventListener(AUDIO_PREFERENCES_EVENT, preferences);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointerdown', pointer, true);
      window.removeEventListener('click', click, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener(AUDIO_PREFERENCES_EVENT, preferences);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', visibility);
      audio.dispose(); director.current = null;
    };
  }, []);
  const cue = useCallback((cue: Cue) => director.current?.cue(cue), []);
  return { audioRef, cue };
}
