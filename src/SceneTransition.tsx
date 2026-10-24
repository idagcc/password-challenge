import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type Scene = { key: string; content: ReactNode };
/** Keeps the outgoing board briefly, while the next board powers on above it. */
export function SceneTransition({ sceneKey, children }: { sceneKey: string; children: ReactNode }) {
  const current = useRef<Scene>({ key: sceneKey, content: children });
  const [exiting, setExiting] = useState<Scene | null>(null);
  useLayoutEffect(() => {
    if (current.current.key === sceneKey) return;
    setExiting(current.current);
    const timer = window.setTimeout(() => setExiting(null), 460);
    return () => window.clearTimeout(timer);
  }, [sceneKey]);
  useLayoutEffect(() => { current.current = { key: sceneKey, content: children }; });
  return <>
    {exiting && <div className="scene-layer scene-exiting" key={`exit-${exiting.key}`} aria-hidden="true" inert>{exiting.content}</div>}
    <div className="scene-layer scene-current" key={sceneKey}>{children}</div>
    <div className="transition-light" key={`light-${sceneKey}`} aria-hidden="true" />
  </>;
}
