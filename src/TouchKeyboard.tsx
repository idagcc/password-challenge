import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './TouchKeyboard.css';

type Props = {
  kind: 'name' | 'email' | 'answer';
  onKey: (key: string) => void;
  onClose: () => void;
  onHeightChange: (height: number) => void;
};

/** Catch the Phish keyboard, on the game's existing 2160 × 3840 canvas. */
export function TouchKeyboard({ kind, onKey, onClose, onHeightChange }: Props) {
  const [shift, setShift] = useState(kind !== 'email');
  const ref = useRef<HTMLElement>(null);
  const rows = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  useLayoutEffect(() => {
    const keyboard = ref.current!;
    const measure = () => onHeightChange(keyboard.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(keyboard);
    return () => observer.disconnect();
  }, [onHeightChange]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);

  return (
    <section
      ref={ref}
      className="touch-keyboard"
      aria-label="Touch keyboard"
      onPointerDown={event => event.preventDefault()}
    >
      <div className="keyboard-title">
        {kind === 'name' ? 'Enter your name' : kind === 'email' ? 'Enter your email' : 'Enter your password'}
        <button type="button" onClick={onClose}>Done ✓</button>
      </div>
      {rows.map(row => (
        <div className="key-row" key={row}>
          {[...row].map(key => (
            <button
              type="button"
              key={key}
              onClick={() => {
                onKey(shift ? key.toUpperCase() : key);
                if (shift) setShift(false);
              }}
            >
              {shift ? key.toUpperCase() : key}
            </button>
          ))}
        </div>
      ))}
      <div className="key-row">
        <button type="button" onClick={() => setShift(!shift)} aria-pressed={shift}>Shift</button>
        {kind === 'email' && ['@', '.', '.com'].map(key => (
          <button type="button" key={key} onClick={() => onKey(key)}>{key}</button>
        ))}
        {kind === 'answer' && ['!', '#', '@'].map(key => (
          <button type="button" key={key} onClick={() => onKey(key)}>{key}</button>
        ))}
        {['-', '_', "'", '+'].map(key => (
          <button type="button" key={key} onClick={() => onKey(key)}>{key}</button>
        ))}
        <button type="button" className="space-key" onClick={() => onKey(' ')}>Space</button>
        <button type="button" onClick={() => onKey('BACKSPACE')} aria-label="Backspace">⌫</button>
      </div>
    </section>
  );
}
