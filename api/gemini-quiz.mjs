export const runtime = 'nodejs';
export const maxDuration = 30;

const PROJECT_ID = 'edunexus-live-e0b84';
const FILES_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/edunexus-live/public/data/files`;
const MAX_SOURCE_FILES = 20;
const MAX_SOURCE_BYTES = 8000000;
const MAX_TOTAL_SOURCE_BYTES = 24000000;
const MAX_FILE_METADATA = 500;
const requestLog = new Map();

const keyOf = req => String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0].trim().slice(0, 100);
const limited = key => { const now=Date.now(); const xs=(requestLog.get(key)||[]).filter(t=>now-t<60000); if(xs.length>=20){requestLog.set(key,xs);return true;} xs.push(now); requestLog.set(key,xs); return false; };
const typed = v => { if(!v||typeof v!=='object')return ''; if('stringValue'in v)return v.stringValue; if('integerValue'in v)return Number(v.integerValue); if('doubleValue'in v)return Number(v.doubleValue); if('booleanValue'in v)return v.booleanValue; if('timestampValue'in v)return v.timestampValue; if('referenceValue'in v)return v.referenceValue; if('arrayValue'in v)return(v.arrayValue.values||[]).map(typed); if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,typed(x)])); return ''; };
const decode = d => Object.fromEntries(Object.entries(d?.fields||{}).map(([k,v])=>[k,typed(v)]));
const titleOf = x => String(x?.title||x?.name||x?.fileName||x?.subject||x?.course||'Untitled file').trim();
const urlOf = x => String(x?.url||x?.downloadURL||x?.downloadUrl||x?.fileUrl||x?.href||x?.link||'').trim();
const terms = p => String(p||'').toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(x=>x.length>1);
const courses = p => [...new Set([...String(p||'').toUpperCase().matchAll(/\b(?:CS|MGT|MTH|PHY|ENG|ISL|PAK|IT|SE|STA|ECO|ACC|FIN|HRM|PSY|BIO|CHE|EDU)\s*[-]?\s*\d{3}\b/g)].map(m=>m[0].replace(/\s+/g,'').replace('-','')))];
function scoreFile(file,prompt){
  const hay=[file.title,file.name,file.fileName,file.subject,file.course,file.code,file.category,file.description,file.text,file.storagePath].map(v=>String(v||'').toLowerCase()).join(' ');
  const compact=hay.replace(/\s+/g,''); const p=String(prompt||'').toLowerCase(); const cs=courses(prompt).map(x=>x.toLowerCase());
  if(cs.length&&!cs.some(c=>compact.includes(c))) return -1000;
  let score=0; for(const t of terms(prompt)) if(t.length>=3&&hay.includes(t)) score+=t.length>=4?2:1;
  if(cs.length&&cs.some(c=>compact.includes(c))) score+=60;
  const title=String(file.title||'').toLowerCase(); if(title&&p.includes(title)) score+=30;
  if(/mcq|quiz|question bank|past paper|handout|lecture|notes|slides|ppt|pdf/.test(hay)) score+=4; return score;
}
async function fetchFiles(){
  const out=[]; let pageToken=''; try{
    for(let page=0;page<3&&out.length<MAX_FILE_METADATA;page++){
      const url=`${FILES_BASE}?pageSize=250${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:''}`;
      const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)}); if(!r.ok) break; const d=await r.json();
      for(const raw of(d.documents||[])){const x=decode(raw);out.push({id:raw.name?.split('/').pop()||'',title:titleOf(x),name:x.name||'',fileName:x.fileName||'',subject:x.subject||'',course:x.course||'',code:x.code||'',category:x.category||'',description:x.description||'',text:x.text||x.content||'',contentType:x.contentType||x.mimeType||'',url:urlOf(x),storagePath:x.storagePath||''});if(out.length>=MAX_FILE_METADATA)break;}
      pageToken=d.nextPageToken||''; if(!pageToken)break;
    } return out.filter(x=>x.title||x.url||x.text);
  }catch{return out;}
}
function directSource(prompt){const p=String(prompt||'');return{url:(p.match(/SOURCE_FILE_URL:\s*(https?:\/\/[^\s\n]+)/i)||[])[1]||'',name:(p.match(/SOURCE_FILE_NAME:\s*([^\n]+)/i)||[])[1]?.trim()||'',mime:(p.match(/SOURCE_FILE_MIME:\s*([^\n]+)/i)||[])[1]?.trim()||'application/octet-stream'};}
function lectureRange(prompt){const p=String(prompt||'');const m=p.match(/LECTURES?\s*(?:FROM|START)?\s*(\d+)\s*(?:TO|UNTIL|-)\s*(\d+)/i);return m?{from:Number(m[1]),to:Number(m[2])}:null;}
async function geminiUpload(apiKey,bytes,mime,name){
  const s=await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files',{method:'POST',headers:{'x-goog-api-key':apiKey,'X-Goog-Upload-Protocol':'resumable','X-Goog-Upload-Command':'start','X-Goog-Upload-Header-Content-Length':String(bytes.byteLength),'X-Goog-Upload-Header-Content-Type':mime,'Content-Type':'application/json'},body:JSON.stringify({file:{display_name:name}})});
  if(!s.ok)throw new Error('Gemini source upload could not start'); const u=s.headers.get('x-goog-upload-url'); if(!u)throw new Error('Gemini source upload URL missing');
  const r=await fetch(u,{method:'POST',headers:{'Content-Length':String(bytes.byteLength),'X-Goog-Upload-Offset':'0','X-Goog-Upload-Command':'upload, finalize'},body:bytes}); if(!r.ok)throw new Error('Gemini source upload failed'); return(await r.json())?.file;
}
async function ingest(file,apiKey){
  if(file.text)return{ok:true,parts:[{text:`SOURCE DOCUMENT: ${file.title}\nCourse/Subject: ${file.course||file.subject||file.code||'N/A'}\nSOURCE TEXT:\n${String(file.text).slice(0,120000)}`}],bytes:0};
  if(!file.url)return{ok:false,error:'No source URL'};
  try{
    const r=await fetch(file.url,{signal:AbortSignal.timeout(9000)}); if(!r.ok)throw new Error(`source ${r.status}`); const buf=await r.arrayBuffer(); if(buf.byteLength>MAX_SOURCE_BYTES)throw new Error('source exceeds 8 MB');
    const ct=String(r.headers.get('content-type')||file.contentType||'').toLowerCase();
    if(ct.includes('pdf')||/\.pdf(?:$|\?)/i.test(file.url))return{ok:true,parts:[{text:`SOURCE DOCUMENT: ${file.title}\nCourse/Subject: ${file.course||file.subject||file.code||'N/A'}\n`},{inlineData:{mimeType:'application/pdf',data:Buffer.from(buf).toString('base64')}}],bytes:buf.byteLength};
    const office=/presentationml\.presentation|wordprocessingml\.document|spreadsheetml\.sheet|application\/vnd\.ms-powerpoint|application\/msword/i.test(ct)||/\.(pptx?|docx?|xlsx?)(?:$|\?)/i.test(file.url);
    if(office){const f=await geminiUpload(apiKey,buf,ct||'application/octet-stream',file.fileName||file.title);if(!f?.uri)throw new Error('Gemini file URI missing');return{ok:true,fileData:{mimeType:f.mimeType||ct,fileUri:f.uri},bytes:buf.byteLength};}
    if(ct.startsWith('text/')||/json|csv|xml|html|markdown/i.test(ct)||/\.(txt|csv|json|md|html?)(?:$|\?)/i.test(file.url))return{ok:true,parts:[{text:`SOURCE DOCUMENT: ${file.title}\nCourse/Subject: ${file.course||file.subject||file.code||'N/A'}\nSOURCE TEXT:\n${Buffer.from(buf).toString('utf8').slice(0,120000)}`}],bytes:buf.byteLength};
    throw new Error(`unsupported source type ${ct||'unknown'}`);
  }catch(e){return{ok:false,error:e?.message||'source ingestion failed'};}
}
async function buildSources(prompt,apiKey){
  const files=await fetchFiles(); const d=directSource(prompt); const range=lectureRange(prompt);
  const ranked=files.map(f=>({file:f,score:scoreFile(f,prompt)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,MAX_SOURCE_FILES);
  const direct=d.url?{file:{id:'direct-upload',title:d.name||'Uploaded source',fileName:d.name||'',contentType:d.mime,url:d.url,course:'',subject:'',code:''},score:100000}:null;
  const candidates=direct?[direct,...ranked]:ranked; const parts=[]; const selected=[]; let total=0;
  for(const item of candidates){if(total>=MAX_TOTAL_SOURCE_BYTES)break; const got=await ingest(item.file,apiKey); if(!got.ok){if(direct&&item.file.id==='direct-upload')return{parts:[],selected:[],fatal:`Uploaded source could not be read: ${got.error}`};continue;} total+=got.bytes||0; if(got.parts)parts.push(...got.parts); if(got.fileData)parts.push(got.fileData); selected.push({title:item.file.title,fileName:item.file.fileName||'',contentType:item.file.contentType||'',course:item.file.course||item.file.subject||item.file.code||'',score:item.score,lectureRange:range});}
  return{parts,selected,fatal:parts.length?'':'No usable source was found'};
}
const cleanJson=text=>{try{const s=String(text||'').replace(/```json/gi,'').replace(/```/g,'').trim();const a=s.indexOf('['),b=s.lastIndexOf(']');return a>=0&&b>a?JSON.parse(s.slice(a,b+1)):null;}catch{return null;}};
const validate=xs=>{if(!Array.isArray(xs))return[];const seen=new Set();return xs.map((q,i)=>{const question=String(q?.q||'').trim();const opts=Array.isArray(q?.options)?q.options.map(x=>String(x??'').trim()):[];const ans=Number(q?.ans);if(!question||opts.length!==4||opts.some(x=>!x)||!Number.isInteger(ans)||ans<0||ans>3)return null;const k=question.toLowerCase().replace(/\s+/g,' ').replace(/[^a-z0-9 ]/g,'').trim();if(seen.has(k))return null;seen.add(k);return{id:i+1,q:question,options:opts,ans,explanation:String(q?.explanation||'').trim(),source:String(q?.source||'').trim(),exact:Boolean(q?.exact)};}).filter(Boolean);};
async function generate(apiKey,model,contents,isQuiz,ctl){const body={contents,generationConfig:isQuiz?{temperature:0.05,responseMimeType:'application/json'}:{temperature:0.4}};const r=await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify(body)});const data=await r.json().catch(()=>null);return{r,data};}
export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});} if(limited(keyOf(req)))return res.status(429).json({error:'Too many requests. Please try again shortly.'});
  const apiKey=process.env.GEMINI_API_KEY;if(!apiKey)return res.status(503).json({code:'GEMINI_NOT_CONFIGURED',error:'GEMINI_API_KEY is missing in the Vercel environment.'});
  const raw=typeof req.body?.prompt==='string'?req.body.prompt:'';if(!raw.trim())return res.status(400).json({error:'A non-empty prompt is required.'});
  const isQuiz=/multiple\s+choice|mcq|quiz|question bank|generate.*questions/i.test(raw); const source=await buildSources(raw,apiKey); if(isQuiz&&source.fatal)return res.status(422).json({error:source.fatal});
  const m=raw.match(/exactly\s+(\d+)/i); const limit=Math.min(Math.max(Number(m?.[1]||5),1),50); const range=lectureRange(raw);
  const instruction=isQuiz?`You are EduNexus Exam Quiz Engine. Generate exactly ${limit} MCQs.\nSTRICT SOURCE RULES:\n- Use ONLY supplied source documents. Never add outside facts.\n- If a primary uploaded/source document already contains MCQs, extract those exact MCQs FIRST. Preserve EXACT question wording, EXACT A-D option wording, EXACT option order, and source-supported correct answer. Set exact=true. Do not paraphrase existing MCQs.\n- Only if the source does not contain enough MCQs, create additional questions from explicit facts/concepts present in the source. Set exact=false. Never invent facts.\n- Respect requested lecture range strictly. If lectures 1 to 5 are requested, only use lecture 1 through lecture 5 material, and omit anything that cannot be verified as inside that range.\n- With multiple matching course files, prioritize exact MCQs first, then repeated questions/concepts across files, then past papers, quizzes, question banks, definitions and emphasized material.\n- Course code is a hard boundary. Never mix other courses.\n- Preserve the source sequence for extracted MCQs before additional source-grounded items.\n- Exactly four options and exactly one correct answer.\n- Return ONLY JSON array with q, options, ans, explanation, source, exact.`:`You are EduNexus AI. Use supplied sources as authoritative and do not invent source facts.\nUSER: ${raw}`;
  const contents=[{role:'user',parts:[{text:`${instruction}\n\nUSER REQUEST:\n${raw}\n\nLECTURE RANGE: ${range?`${range.from}-${range.to}`:'not specified'}\n\nSOURCE INDEX: ${source.selected.map(s=>s.title).join(', ')}`},...source.parts]}];
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),29000);
  try{let result=await generate(apiKey,'gemini-2.5-flash',contents,isQuiz,ctl);if(!result.r.ok&&!ctl.signal.aborted)result=await generate(apiKey,'gemini-2.0-flash',contents,isQuiz,ctl);const{r,data}=result;if(!r.ok||data?.error){const providerMessage=String(data?.error?.message||'unknown provider error').slice(0,300);return res.status(502).json({code:'GEMINI_PROVIDER_ERROR',error:`Gemini provider error (${r.status}): ${providerMessage}`});}const out=data?.candidates?.[0]?.content?.parts?.map(p=>typeof p?.text==='string'?p.text:'').filter(Boolean).join('\n').trim();if(!out)return res.status(502).json({error:'The AI provider returned no text.'});if(isQuiz){const valid=validate(cleanJson(out));if(!valid.length)return res.status(502).json({error:'No valid source-grounded quiz questions were returned.'});return res.status(200).json({text:JSON.stringify(valid),sources:source.selected});}return res.status(200).json({text:out,sources:source.selected});}catch(e){return res.status(e?.name==='AbortError'?504:500).json({error:e?.name==='AbortError'?'The AI request timed out.':`The AI request failed on the server.`});}finally{clearTimeout(timer);}
}
