// Original instrumental loop: 16 bars, D-minor cyber ambient, 100 BPM.
// No samples, third-party music, or network requests are used.
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const rate=44100, beat=.6, duration=64*beat, frames=Math.round(rate*duration);
const left=new Float32Array(frames),right=new Float32Array(frames);
const tau=Math.PI*2, hz=n=>440*2**((n-69)/12);
let seed=81723;
function noise(){seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/2147483648-1;}
function add(start,length,signal,pan=0){
 const offset=Math.round(start*rate),count=Math.round(length*rate);
 const l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2);
 for(let i=0;i<count;i++){const v=signal(i/rate,i),index=(offset+i)%frames;left[index]+=v*l;right[index]+=v*r;}
}
const chords=[ [50,53,57,64], [46,50,53,57], [48,53,57,60], [48,50,55,62], [43,50,53,57], [46,50,53,60], [45,50,52,57], [45,49,52,55] ];
const roots=[38,34,41,36,31,34,33,33];
for(let chord=0;chord<8;chord++){
 const at=chord*8*beat;
 chords[chord].forEach((note,voice)=>{
  const f=hz(note),phase=voice*.83;
  add(at,6.2,t=>{
   const envelope=Math.min(1,t/1.1)*Math.max(0,Math.min(1,(6.2-t)/1.6));
   return .045*envelope*(Math.sin(tau*f*t+phase)+.32*Math.sin(tau*f*1.002*t+phase)+.10*Math.sin(tau*f*2*t+phase));
  },(voice-1.5)*.35);
 });
 for(let step=0;step<16;step++){
  const notes=chords[chord],note=notes[[0,2,1,3,2,1,3,2][step%8]]+12;
  const f=hz(note),pan=step%2? .52:-.52;
  add(at+step*beat/2,.85,t=>.095*Math.min(1,t/.009)*Math.exp(-t*7.8)*(Math.sin(tau*f*t)+.2*Math.sin(tau*f*2*t)),pan);
 }
 for(let pulse=0;pulse<8;pulse++){
  const f=hz(roots[chord]);
  add(at+pulse*beat,beat*.85,t=>.18*Math.min(1,t/.015)*Math.exp(-t*6)*(Math.sin(tau*f*t)+.16*Math.sin(tau*f*2*t)),0);
 }
}
for(let bar=0;bar<16;bar++){
 for(const pulse of [0,2])add((bar*4+pulse)*beat,.28,t=>.16*Math.exp(-t*18)*Math.sin(tau*(47*t+5.2*(1-Math.exp(-t*28)))),0);
 for(let pulse=0;pulse<8;pulse++){
  let prior=0;
  add((bar*4+pulse*.5+.25)*beat,.075,t=>{const n=noise(),high=n-prior;prior=n;return .012*high*Math.exp(-t*70);},pulse%2?.5:-.5);
 }
 for(const pulse of [1,3])add((bar*4+pulse)*beat,.13,t=>.013*noise()*Math.exp(-t*33),.15);
}
const dryL=left.slice(),dryR=right.slice();
for(let i=0;i<frames;i++){
 const d1=(i-Math.round(rate*.3)+frames)%frames,d2=(i-Math.round(rate*.45)+frames)%frames,d3=(i-Math.round(rate*.9)+frames)%frames;
 left[i]=dryL[i]+dryR[d1]*.2+dryL[d2]*.12+dryR[d3]*.075;
 right[i]=dryR[i]+dryL[d1]*.2+dryR[d2]*.12+dryL[d3]*.075;
}
let peak=0;for(let i=0;i<frames;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
const pcm=Buffer.alloc(frames*4),gain=.72/peak;
for(let i=0;i<frames;i++){pcm.writeInt16LE(Math.round(Math.tanh(left[i]*gain)*30000),i*4);pcm.writeInt16LE(Math.round(Math.tanh(right[i]*gain)*30000),i*4+2);}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
mkdirSync('source-material/audio',{recursive:true});mkdirSync('public/assets/audio',{recursive:true});
writeFileSync('source-material/audio/password-challenge-score.wav',Buffer.concat([header,pcm]));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i','source-material/audio/password-challenge-score.wav','-c:a','aac','-b:a','192k','-movflags','+faststart','-metadata','title=Password Challenge — Neon Circuit','-metadata','comment=Original synthesized instrumental; 16-bar seamless loop, 100 BPM.','public/assets/audio/password-challenge-score.m4a']);
console.log(`Original stereo score rendered: ${duration.toFixed(1)} seconds, 100 BPM.`);
