import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import * as Design from './design';
import type { DesignProps } from './design/types';
import { textNodes } from './design/textNodes';
import { PuzzleBody } from './PuzzleBody';
import { TouchKeyboard } from './TouchKeyboard';
import { BackgroundVideo } from './BackgroundVideo';
import { SceneTransition } from './SceneTransition';
import { useGameAudio } from './useGameAudio';
import { api, formatTime, type Session, type Leader, type Settings } from './types';
type Screen = 'idle' | 'registration' | 'instructions' | 'playing' | 'result' | 'validation';
type Field = 'name' | 'email' | 'answer';
type AnswerFeedback = { correct: boolean; nextSession: Session; receivedAt: number };
const defaults: Settings = { idleTimeoutSeconds: 30, resultTimeoutSeconds: 25, maxGameSeconds: 600, scoringMode: 'correct-then-time', totalRounds: 10 };
export default function App() {
 const { audioRef, cue } = useGameAudio();
 const [videoReady, setVideoReady] = useState(false);
 const [screen, setScreen] = useState<Screen>('idle'), [session, setSession] = useState<Session | null>(null);
 const [leaders,setLeaders] = useState<Leader[]>([]), [settings,setSettings] = useState(defaults);
 const [name,setName] = useState(''), [email,setEmail] = useState(''), [answer,setAnswer] = useState('');
 const [answerFeedback,setAnswerFeedback] = useState<AnswerFeedback | null>(null);
 const [keyboard,setKeyboard] = useState<Field | null>(null), [error,setError] = useState(''), [busy,setBusy] = useState(false);
 const [elapsed,setElapsed] = useState(0), [scale,setScale] = useState(1);
 const [keyboardHeight, setKeyboardHeight] = useState(0);
 const lastActivity = useRef(Date.now()), resultAt = useRef(0), clock = useRef({ at: 0, elapsed: 0 }), inFlight = useRef(false), attemptId = useRef<string | null>(null);
 const stageRef = useRef<HTMLDivElement>(null);
 const reset = () => { setScreen('idle');setSession(null);setName('');setEmail('');setAnswer('');setAnswerFeedback(null);setKeyboard(null);setError('');setElapsed(0);attemptId.current=null;lastActivity.current=Date.now(); };
 useEffect(() => {
  const resize = () => setScale(Math.min(window.innerWidth / 2160, window.innerHeight / 3840));resize();window.addEventListener('resize',resize);
  const touch = () => { lastActivity.current=Date.now(); };window.addEventListener('pointerdown',touch);window.addEventListener('keydown',touch);
  api<Settings>('/config').then(setSettings).catch(() => setError('Game server unavailable. Please ask the event team for help.'));
  return () => {window.removeEventListener('resize',resize);window.removeEventListener('pointerdown',touch);window.removeEventListener('keydown',touch);};
 }, []);
 useEffect(() => {
  if(screen!=='idle')return;
  const refresh=()=>api<Leader[]>('/leaderboard').then(setLeaders).catch(()=>{});refresh();const t=setInterval(refresh,10000);return ()=>clearInterval(t);
 }, [screen]);
 useEffect(() => {
  const t = setInterval(() => {
   if ((screen==='playing'||screen==='validation')&&answerFeedback?.nextSession.status!=='completed') {
    const e=clock.current.elapsed+performance.now()-clock.current.at;setElapsed(e);
    if(e>settings.maxGameSeconds*1000){reset();setError('Time is up. Tap Start to play again.');}
   }
   if(screen==='result' && Date.now()-resultAt.current>settings.resultTimeoutSeconds*1000)reset();
   else if(screen!=='idle'&&screen!=='result'&&!inFlight.current&&Date.now()-lastActivity.current>settings.idleTimeoutSeconds*1000)reset();
  },250);return ()=>clearInterval(t);
 },[screen,settings,answerFeedback]);
 const applySession=(s:Session)=>{setSession(s);setElapsed(s.elapsedMs);clock.current={at:performance.now(),elapsed:s.elapsedMs};};
 useEffect(()=>{
  if(!answerFeedback)return;
  const timer=window.setTimeout(()=>{
   const s=answerFeedback.nextSession;
   const elapsedMs=s.elapsedMs+(s.status==='completed'?0:performance.now()-answerFeedback.receivedAt);
   applySession({...s,elapsedMs});setAnswer('');setAnswerFeedback(null);attemptId.current=null;
   if(s.status==='completed'){setScreen('result');resultAt.current=Date.now();cue('complete');}
  },1000);
  return ()=>window.clearTimeout(timer);
 },[answerFeedback,cue]);
 async function act(work:()=>Promise<void>) {
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
  try{await work();}catch(e){setError((e as Error).message);cue('validation');}finally{inFlight.current=false;setBusy(false);}
 }
 const register=()=>act(async()=>{const s=await api<Session>('/register',{name,email});applySession(s);setKeyboard(null);setScreen('instructions');});
 const start=()=>act(async()=>{if(!session)return;applySession(await api<Session>(`/sessions/${session.id}/start`,{}));setScreen('playing');});
 const submit=()=>{
  if(inFlight.current||answerFeedback)return;
  if(!answer.trim()){setKeyboard(null);setScreen('validation');cue('validation');return;}
  return act(async()=>{
   if(!session)return;
   setKeyboard(null);
   attemptId.current ??= crypto.randomUUID();
   const s=await api<Session>(`/sessions/${session.id}/answer`,{answer,round:session.round,requestId:attemptId.current});
   const correct=s.correct>session.correct;
   cue(correct?'correct':'incorrect');
   const receivedAt=performance.now();
   setElapsed(s.elapsedMs);clock.current={at:receivedAt,elapsed:s.elapsedMs};
   setAnswerFeedback({correct,nextSession:s,receivedAt});
  });
 };
 const onNext=()=>{if(screen==='idle'){setError('');setScreen('registration');}else if(screen==='registration')register();else if(screen==='instructions')start();else if(screen==='playing')submit();else if(screen==='validation')setScreen('playing');else reset();};
 const puzzle=session?.puzzle;
 const totalRounds=session?.totalRounds??settings.totalRounds;
 const staticPuzzle = puzzle && ((puzzle.id==='puzzle-001' && session?.round===0) || (puzzle.id==='puzzle-002' && session?.round===1) || puzzle.id==='approved-count' || puzzle.id==='vault-maze');
 const dynamicPuzzle=screen==='playing'&&puzzle&&!staticPuzzle;
 let template:keyof typeof Design = screen==='idle'?'Idle':screen==='registration'?'Registration':screen==='instructions'?'Instructions':screen==='result'?'Result':screen==='validation'?'Validation':puzzle?.category==='vault_maze'?'Maze':puzzle?.category==='security_count'?'Counting':((session?.round??0)%3===1)?'PictureTwo':'PictureOne';
 const values:Record<string,ReactNode>={};
 for(const [id,text] of Object.entries(textNodes[template])) {
  if(text.startsWith('ROUND '))values[id]=`ROUND ${String((session?.round||0)+1).padStart(2,'0')} / ${String(totalRounds).padStart(2,'0')}`;
  if(text.startsWith('AGENT '))values[id]=`AGENT ${(session?.name||'').slice(0,22)}${(session?.name.length||0)>22?'…':''}`;
  if(text.startsWith('TIME '))values[id]=`TIME ${formatTime(elapsed)}`;
  if(text.startsWith('CORRECT '))values[id]=`CORRECT ${session?.correct||0} / ${totalRounds}`;
  if(template==='Instructions'){
   if(id==='6136:8773')values[id]=`SOLVE ${totalRounds} PUZZLES`;
   if(id==='6136:8780')values[id]=`Move through all ${totalRounds} rounds.`;
  }
  if(template==='Result'){
   if(id==='6136:8797')values[id]=`${session?.correct||0} / ${totalRounds}`;
   if(text.startsWith('Total time:'))values[id]=`Total time: ${formatTime(session?.elapsedMs||0)}`;
   if(text==='Jordan Lee')values[id]=session?.name;
  }
  if(template==='Counting' && puzzle?.legend && text==='Use the entry order below, then add #.')values[id]=`Use the entry order below, then add ${puzzle.legend.suffix}.`;
 }
 if(template==='Idle') for(let i=0;i<5;i++){
  const base=8719+i*5,leader=leaders[i];values[`6129:${base}`]=leader?i+1:'';values[`6129:${base+1}`]=leader?.name||'';values[`6129:${base+2}`]=leader?.correct??'';values[`6129:${base+3}`]=leader?formatTime(leader.elapsedMs):'';
 }
 const sceneKey=screen==='playing'?`round-${session?.round||0}`:screen;
 useEffect(()=>{cue('page');},[sceneKey,cue]);
 const ScreenComponent=Design[template] as ComponentType<DesignProps>;
 const closeKeyboard=()=>{setKeyboard(null);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();};
 const keyboardKey=(key:string)=>{
  if(!keyboard||inFlight.current||answerFeedback)return;
  const value=keyboard==='name'?name:keyboard==='email'?email:answer;
  const limit=keyboard==='name'?60:keyboard==='email'?254:80;
  change(keyboard,key==='BACKSPACE'?value.slice(0,-1):(value+key).slice(0,limit));
 };
 const keyboardLift=keyboard==='answer'?Math.max(0,keyboardHeight-560):0;
 const change=(field:Field,value:string)=>{setError('');if(field==='name')setName(value);else if(field==='email')setEmail(value);else {setAnswer(value.toUpperCase().replace(/\s/g,''));attemptId.current=null;}};
 return <main className="viewport" onContextMenu={e=>e.preventDefault()}>
  <div className="stage-wrap" style={{width:2160*scale,height:3840*scale}}>
   <div ref={stageRef} className={`stage ${videoReady?'video-ready':''}`} style={{transform:`scale(${scale})`}} aria-label="Password Challenge">
    <BackgroundVideo onReady={setVideoReady}/>
    <audio ref={audioRef} className="background-score" src="/assets/audio/password-challenge-score.m4a" loop preload="auto" aria-hidden="true"/>
    <div className="game-scene" style={{transform:keyboardLift?`translateY(-${keyboardLift}px)`:undefined}}>
    <SceneTransition sceneKey={sceneKey}>
    <div className={`scene-content ${dynamicPuzzle?'dynamic-puzzle':''} screen-${screen}`}>
    <div className="game-artwork"><ScreenComponent values={values} onNext={onNext} disabled={busy || !!answerFeedback || (screen==='registration' && (name.trim().length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))}/></div>
    {screen==='idle'&&leaders.length===0&&<p className="empty-leaderboard">Be the first to take the challenge.</p>}
    {screen==='registration'&&<form onSubmit={e=>{e.preventDefault();register();}} noValidate>
     <input className="registration-input name-input" aria-label="Name" value={name} onChange={e=>change('name',e.target.value)} onFocus={()=>setKeyboard('name')} placeholder="Enter your name" maxLength={60} inputMode="none" autoComplete="off"/>
     <input className="registration-input email-input" aria-label="Email" value={email} onChange={e=>change('email',e.target.value)} onFocus={()=>setKeyboard('email')} placeholder="Enter your email" maxLength={254} inputMode="none" autoComplete="off" spellCheck={false}/>
    </form>}
    {screen==='playing'&&<>
     {dynamicPuzzle&&puzzle&&<PuzzleBody puzzle={puzzle}/>}
     <input key={session?.round} className={`answer-input${answerFeedback?` answer-${answerFeedback.correct?'correct':'incorrect'}`:''}`} aria-label="Your password" aria-describedby={answerFeedback?'answer-feedback':undefined} placeholder="Tap to enter your answer" value={answer} readOnly={busy||!!answerFeedback} maxLength={80} inputMode="none" autoComplete="off" spellCheck={false} onFocus={()=>{if(!busy&&!answerFeedback)setKeyboard('answer');}} onChange={e=>change('answer',e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit();}}/>
     {answerFeedback&&<p id="answer-feedback" className={`answer-feedback answer-feedback-${answerFeedback.correct?'correct':'incorrect'}`} role="status">{answerFeedback.correct?'✓ Correct answer':'✕ Incorrect answer'}</p>}
    </>}
    {busy&&!answerFeedback&&<span className="saving" role="status">Saving…</span>}
    {error&&<div className={`error-message error-${screen}`} role="alert">{error}</div>}
    </div>
    </SceneTransition>
    </div>
    {keyboard&&<TouchKeyboard kind={keyboard} onKey={keyboardKey} onClose={closeKeyboard} onHeightChange={setKeyboardHeight}/>}
   </div>
  </div>
 </main>;
}
