export const runtime = 'nodejs';
export const maxDuration = 30;

const PROJECT_ID = 'edunexus-live-e0b84';
const FILES_PATH = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/edunexus-live/public/data/files?pageSize=250`;
const MAX_SOURCE_FILES = 12;
const MAX_SOURCE_BYTES = 8000000;
const MAX_TOTAL_SOURCE_BYTES = 24000000;
const requestLog = new Map();

const keyOf = req => String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0].trim().slice(0, 100);
const limited = key => { const now=Date.now(); const xs=(requestLog.get(key)||[]).filter(t=>now-t<60000); if(xs.length>=20){requestLog.set(key,xs);return true;} xs.push(now); requestLog.set(key,xs); return false; };
const typed = v => { if(!v||typeof v!=='object')return ''; if('stringValue'in v)return v.stringValue; if('integerValue'in v)return Number(v.integerValue); if('doubleValue'in v)return Number(v.doubleValue); if('booleanValue'in v)return v.booleanValue; if('timestampValue'in v)return v.timestampValue; if('arrayValue'in v)return(v.arrayValue.values||[]).map(typed); if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,typed(x)])); return ''; };
const decode = d => Object.fromEntries(Object.entries(d?.fields||{}).map(([k,v])=>[k,typed(v)]));
const titleOf = x => String(x?.title||x?.name||x?.fileName||x?.subject||x?.course||'Untitled file').trim();
const urlOf = x => String(x?.url||x?.downloadURL||x?.downloadUrl||x?.fileUrl||x?.href||x?.link||'').trim();
const terms = p => String(p||'').toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(x=>x.length>1);
const courses = p => [...new Set([...String(p||'').toUpperCase().matchAll(/\b(?:CS|MGT|MTH|PHY|ENG|ISL|PAK|IT|SE|STA|ECO|ACC|FIN|HRM|PSY|BIO|CHE|EDU)\s*[-]?\s*\d{3}\b/g)].map(m=>m[0].replace(/\s+/g,'').replace('-','')))];

function scoreFile(file,prompt){
  const hay=[file.title,file.name,file.fileName,file.subject,file.course,file.code,file.category,file.description,file.text,file.storagePath].map(v=>String(v||'').toLowerCase()).join(' ');
  const compact=hay.replace(/\s+/g,'');
  const cs=courses(prompt).map(x=>x.toLowerCase());
  if(cs.length&&!cs.some(c=>compact.includes(c))) return -1000;
  let score=0;
  for(const t of terms(prompt)) if(t.length>=3&&hay.includes(t)) score+=t.length>=4?2:1;
  if(cs.length&&cs.some(c=>compact.includes(c))) score+=50;
  if(file.title&&String(prompt).toLowerCase().includes(file.title.toLowerCase())) score+=30;
  if(/quiz|mcq|question|past paper|handout|lecture|notes|slides|ppt|pdf/.test(hay)) score+=2;
  return score;
}

async function fetchFiles(){
  try{const r=await fetch(FILES_PATH,{headers:{Accept:'application/json'}});if(!r.ok)return[];const d=await r.json();return(d.documents||[]).map(raw=>{const x=decode(raw);return{id:raw.name?.split('/').pop()||'',title:titleOf(x),name:x.name||'',fileName:x.fileName||'',subject:x.subject||'',course:x.course||'',code:x.code||'',category:x.category||'',description:x.description||'',text:x.text||x.content||'',contentType:x.contentType||x.mimeType||'',url:urlOf(x),storagePath:x.storagePath||''};}).filter(x=>x.title||x.url||x.text);}catch{return[];}
}

function directSource(prompt){const p=String(prompt||'');return{url:(p.match(/SOURCE_FILE_URL:\s*(https?:\/\/[^\s\n]+)/i)||[])[1]||'',name:(p.match(/SOURCE_FILE_NAME:\s*([^\n]+)/i)||[])[1]?.trim()||'',mime:(p.match(/SOURCE_FILE_MIME:\s*([^\n]+)/i)||[])[1]?.trim()||'application/octet-stream'};}

async function geminiUpload(apiKey,bytes,mime,name){
  const s=await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files',{method:'POST',headers:{'x-goog-api-key':apiKey,'X-Goog-Upload-Protocol':'resumable','X-Goog-Upload-Command':'start','X-Goog-Upload-Header-Content-Length':String(bytes.byteLength),'X-Goog-Upload-Header-Content-Type':mime,'Content-Type':'application/json'},body:JSON.stringify({file:{display_name:name}})});
  if(!s.ok)throw new Error('Gemini source upload could not start');
  const u=s.headers.get('x-goog-upload-url');if(!u)throw new Error('Gemini source upload URL missing');
  const r=await fetch(u,{method:'POST',headers:{'Content-Length':String(bytes.byteLength),'X-Goog-Upload-Offset':'0','X-Goog-Upload-Command':'upload, finalize'},body:bytes});
  if(!r.ok)throw new Error('Gemini source upload failed');return(await r.json())?.file;
}

async function ingest(file,apiKey){
  if(file.text)return{ok:true,parts:[{text:`SOURCE DOCUMENT: ${file.title}\nCourse/Subject: ${file.course||file.subject||file.code||'N/A'}\nSOURCE TEXT:\n${String(file.text).slice(0,90000)}`}],bytes:0};
  if(!file.url)return{ok:false,error:'No source URL'};
  try{
    const r=await fetch(file.url,{signal:AbortSignal.timeout(9000)});if(!r.ok)throw new Error(`source ${r.status}`);
    const buf=await r.arrayBuffer();if(buf.byteLength>MAX_SOURCE_BYTES)throw new Error('source exceeds 8 MB');
    const ct=String(r.headers.get('content-type')||file.contentType||'').toLowerCase();
    if(ct.includes('pdf')||/\.pdf(?:$|\?)/i.test(file.url))return{ok:true,parts:[{text:`SOURCE DOCUMENT: ${file.title}\nCourse/Subject: ${file.course||file.subject||file.code||'N/A'}\n`},{inlineData:{mimeType:'application/pdf',data:Buffer.from(buf).toString('base64')}}],bytes:buf.byteLength};
    const office=/presentationml\.presentation|wordprocessingml\.document|spreadsheetml\.sheet|application\/vnd\.ms-powerpoint|application\/msword/i.test(ct)||/\.(pptx?|docx?|xlsx?)(?:$|\?)/i.test(file.url);
    if(office){const f=await geminiUpload(apiKey,buf,ct||'application/octet-stream',file.fileName||file.title);if(!f?.uri)throw new Error('Gemini file URI missing');return{ok:true,fileData:{mimeType:f.mimeType||ct,fileUri:f.uri},bytes:buf.byteLength};}
    if(ct.startsWith('text/')||/json|csv|xml|html|markdown/i.test(ct)||/\.(txt|csv|json|md|html?)(?:$|\?)/i.test(file.url))return{ok:true,parts:[{text:`SOURCE DOCUMENT: ${file.title}\nCourse/Subject: ${file.course||file.subject||file.code||'N/A'}\nSOURCE TEXT:\n${Buffer.from(buf).toString('utf8').slice(0,90000)}`}],bytes:buf.byteLength};
    throw new Error(`unsupported source type ${ct||'unknown'}`);
  }catch(e){return{ok:false,error:e?.message||'source ingestion failed'};}
}

async function buildSources(prompt,apiKey){
  const files=await fetchFiles();const d=directSource(prompt);
  const ranked=files.map(f=>({file:f,score:scoreFile(f,prompt)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,MAX_SOURCE_FILES);
  const direct=d.url?{id:'direct-upload',title:d.name||'Uploaded quiz source',fileName:d.name||'',contentType:d.mime,url:d.url,course:'',subject:'',code:''}:null;
  const candidates=direct?[{file:direct,score:100000},...ranked]:ranked;const parts=[];const selected=[];let total=0;
  for(const item of candidates){if(total>=MAX_TOTAL_SOURCE_BYTES)break;const got=await ingest(item.file,apiKey);if(!got.ok){if(direct&&item.file.id==='direct-upload')return{parts:[],selected:[],fatal:got.error};continue;}total+=got.bytes||0;if(got.parts)parts.push(...got.parts);if(got.fileData)parts.push(got.fileData);selected.push({title:item.file.title,fileName:item.file.fileName||'',contentType:item.file.contentType||'',course:item.file.course||item.file.subject||item.file.code||'',score:item.score});}
  return{parts,selected,fatal:parts.length?'':'No usable uploaded source was found'};
}

const cleanJson = text => {const s=String(text||'').replace(/```json/gi,'').replace(/```/g,'').trim();const a=s.indexOf('['),b=s.lastIndexOf(']');return a>=0&&b>a?JSON.parse(s.slice(a,b+1)):null;};
const validate = xs => {if(!Array.isArray(xs))return[];const seen=new Set();return xs.map((q,i)=>{const question=String(q?.q||'').trim();const opts=Array.isArray(q?.options)?q.options.map(x=>String(x??'').trim()):[];const ans=Number(q?.ans);if(!question||opts.length!==4||opts.some(x=>!x)||!Number.isInteger(ans)||ans<0||ans>3)return null;const k=question.toLowerCase().replace(/\s+/g,' ').replace(/[^a-z0-9 ]/g,'').trim();if(seen.has(k))return null;seen.add(k);return{id:i+1,q:question,options:opts,ans,explanation:String(q?.explanation||'').trim(),source:String(q?.source||'').trim()};}).filter(Boolean);};

export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}if(limited(keyOf(req)))return res.status(429).json({error:'Too many requests. Please try again shortly.'});
  const apiKey=process.env.GEMINI_API_KEY;if(!apiKey)return res.status(503).json({error:'AI service is not configured yet.'});
  const raw=typeof req.body?.prompt==='string'?req.body.prompt:'';if(!raw.trim())return res.status(400).json({error:'A non-empty prompt is required.'});
  const isQuiz=/multiple\s+choice|mcq|quiz|question bank|generate.*questions/i.test(raw);const source=await buildSources(raw,apiKey);
  if(isQuiz&&source.fatal)return res.status(422).json({error:source.fatal});
  const m=raw.match(/exactly\s+(\d+)/i);const limit=Math.min(Math.max(Number(m?.[1]||5),1),50);
  const instruction=isQuiz?`You are EduNexus Exam Quiz Engine. Generate exactly ${limit} MCQs.\nSTRICT RULES:\n- Use ONLY supplied source documents.\n- The direct uploaded file is PRIMARY and must be read from its actual contents.\n- If an existing source contains MCQs, extract those exact MCQs first. Preserve exact question wording, exact A-D option wording, exact option order, and the source-supported answer. Do not paraphrase.\n- If source is a handout/PPT/DOCX/notes without enough MCQs, create exam-likely questions only from explicit source facts/concepts.\n- With multiple matching course files, deeply compare them and prioritize repeated questions/concepts, quizzes, question banks, past papers, definitions and emphasized material.\n- A course code such as CS620 is a hard boundary: never use CS101 or another unrelated course.\n- Never use outside knowledge to guess an answer. Omit unsupported questions.\n- Exactly four options and exactly one correct answer per question.\n- Return ONLY JSON array with q, options, ans, explanation, source.`:`You are EduNexus AI. Answer accurately. Use supplied sources as authoritative and do not invent source facts.\nUSER: ${raw}`;
  const office=source.selected.some(s=>/ppt|powerpoint|slide|docx|word|xlsx|excel|presentationml|wordprocessingml|spreadsheetml/i.test(`${s.title} ${s.fileName} ${s.contentType}`));const model=office?'gemini-3.7-flash':'gemini-2.5-flash';
  const contents=[{role:'user',parts:[{text:`${instruction}\n\nUSER REQUEST:\n${raw}\n\nSOURCE INDEX: ${source.selected.map(s=>s.title).join(', ')}`},...source.parts]}];
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),29000);
  try{const r=await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents,generationConfig:isQuiz?{temperature:0.05,responseMimeType:'application/json'}:{temperature:0.4}})});const data=await r.json().catch(()=>null);if(!r.ok||data?.error)return res.status(502).json({error:'The AI provider could not complete the request.'});const out=data?.candidates?.[0]?.content?.parts?.map(p=>typeof p?.text==='string'?p.text:'').filter(Boolean).join('\n').trim();if(!out)return res.status(502).json({error:'The AI provider returned no text.'});if(isQuiz){const valid=validate(cleanJson(out));if(!valid.length)return res.status(502).json({error:'No valid source-grounded quiz questions were returned.'});return res.status(200).json({text:JSON.stringify(valid),sources:source.selected});}return res.status(200).json({text:out,sources:source.selected});}catch(e){return res.status(e?.name==='AbortError'?504:500).json({error:e?.name==='AbortError'?'The AI request timed out.':'The AI request failed on the server.'});}finally{clearTimeout(timer);}
}
