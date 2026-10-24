import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
test('production HTTP flow, media ranges, private-file protection and operator export',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'password-http-'));
 const child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'0',PASSWORD_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{child.kill('SIGTERM');await once(child,'exit');rmSync(dir,{recursive:true,force:true});});
 const base=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Server startup timed out')),15000);let output='';child.stdout.on('data',data=>{output+=data;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timeout);resolve(m[0]);}});child.once('error',reject);});
 const request=async(path,data)=>fetch(base+path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});
 assert.equal((await request('/api/health')).status,200);
 assert.match(await (await request('/')).text(),/Password Challenge/);
 const videoPath='/assets/media/dge-background-portrait.mp4';
 const video=readFileSync('public'+videoPath);
 const range=await fetch(base+videoPath,{headers:{Range:'bytes=0-1023'}});
 assert.equal(range.status,206);assert.equal(range.headers.get('content-type'),'video/mp4');
 assert.equal(range.headers.get('content-range'),`bytes 0-1023/${video.length}`);
 assert.deepEqual(Buffer.from(await range.arrayBuffer()),video.subarray(0,1024));
 const suffix=await fetch(base+videoPath,{headers:{Range:'bytes=-256'}});
 assert.equal(suffix.status,206);assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),video.subarray(video.length-256));
 assert.equal((await fetch(base+videoPath,{headers:{Range:`bytes=${video.length}-`}})).status,416);
 const music=await fetch(base+'/assets/audio/password-challenge-score.m4a',{method:'HEAD'});
 assert.equal(music.status,200);assert.equal(music.headers.get('content-type'),'audio/mp4');
 assert.ok(Number(music.headers.get('content-length'))>0);assert.equal((await music.arrayBuffer()).byteLength,0);

 for(const path of ['/private/answers.json','/data/operator-key.txt','/server/game.mjs','/source-material/components-v3.zip','/..%2Fprivate/answers.json'])assert.ok((await request(path)).status>=400,path);
 assert.equal((await fetch(base+'/api/register',{method:'POST',headers:{'Origin':'https://example.com','Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await request('/api/register',{name:'X',email:'invalid'})).status,400);
 let session=await(await request('/api/register',{name:'HTTP Player',email:'http@example.com'})).json();
 assert.equal(session.email,undefined);assert.equal(session.puzzle.answer,undefined);
 session=await(await request(`/api/sessions/${session.id}/start`,{})).json();
 for(const [round,answer] of ['SUNFLOWER7!','FIREWALL4!','423#','CODE5!'].entries()){
  const r=await request(`/api/sessions/${session.id}/answer`,{round,answer,requestId:`http-${round}`});assert.equal(r.status,200);session=await r.json();assert.equal(session.correct,round+1);
 }
 const leaders=await(await request('/api/leaderboard')).json();assert.equal(leaders[0].name,'HTTP Player');assert.equal(leaders[0].email,undefined);
 assert.equal((await request('/api/operator/export')).status,401);
 const key=readFileSync(join(dir,'operator-key.txt'),'utf8').trim();
 const csv=await fetch(base+'/api/operator/export',{headers:{'X-Operator-Key':key}});assert.equal(csv.status,200);assert.match(await csv.text(),/http@example.com/);
});
