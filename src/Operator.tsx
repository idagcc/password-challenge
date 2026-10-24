import { useEffect, useState } from 'react';
import { AUDIO_PREFERENCES_EVENT, getAudioPreferences, saveAudioPreferences, type AudioPreferences } from './audioPreferences';

export function Operator() {
 const [key,setKey]=useState(''),[error,setError]=useState('');
 const [audio,setAudio]=useState(getAudioPreferences);
 useEffect(()=>{
  const sync=()=>setAudio(getAudioPreferences());
  window.addEventListener('storage',sync);
  window.addEventListener(AUDIO_PREFERENCES_EVENT,sync);
  return ()=>{window.removeEventListener('storage',sync);window.removeEventListener(AUDIO_PREFERENCES_EVENT,sync);};
 },[]);
 const changeAudio=(next:Partial<AudioPreferences>)=>{const updated={...audio,...next};setAudio(updated);saveAudioPreferences(updated);};
 async function download(){
  setError('');
  const response=await fetch('/api/operator/export',{headers:{'X-Operator-Key':key.trim()}});
  if(!response.ok){setError('Check the operator key.');return;}
  const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');
  link.href=url;link.download='password-challenge-results.csv';link.click();URL.revokeObjectURL(url);
 }
 return <main className="operator">
  <h1>Password Challenge · Event team</h1>
  <section className="operator-audio" aria-label="Sound controls">
   <h2>Sound</h2>
   <label className="sound-enabled"><input type="checkbox" checked={!audio.muted} onChange={event=>changeAudio({muted:!event.target.checked})}/>Enable sound</label>
   <label>Background music · {Math.round(audio.musicVolume*100)}%<input aria-label="Background music volume" type="range" min="0" max="100" value={audio.musicVolume*100} onChange={event=>changeAudio({musicVolume:Number(event.target.value)/100})}/></label>
   <label>Sound effects · {Math.round(audio.effectsVolume*100)}%<input aria-label="Sound effects volume" type="range" min="0" max="100" value={audio.effectsVolume*100} onChange={event=>changeAudio({effectsVolume:Number(event.target.value)/100})}/></label>
   <p>Changes apply to the game on this browser. Press M outside a text field to mute or unmute.</p>
  </section>
  <h2>Results</h2>
  <p>Export registration details, scores, individual answers and response times. The operator key is saved in data/operator-key.txt on the kiosk computer.</p>
  <label>Operator key<input type="password" value={key} onChange={event=>setKey(event.target.value)}/></label>
  <button onClick={download}>Download results CSV</button>
  <p role="alert">{error}</p><p><a href="/">Return to game</a></p>
 </main>;
}
