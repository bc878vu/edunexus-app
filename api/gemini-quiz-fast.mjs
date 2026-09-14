export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 8_000_000;
const cache = new Map();

const sourceFromPrompt = (prompt) => ({
  url: (String(prompt).match(/SOURCE_FILE_URL:\s*(https?:\/\/[^\s\n]+)/i) || [])[1] || '',
  name: ((String(prompt).match(/SOURCE_FILE_NAME:\s*([^\n]+)/i) || [])[1] || 'uploaded-source').trim(),
  mime: ((String(prompt).match(/SOURCE_FILE_MIME:\s*([^\n]+)/i) || [])[1] || 'application/octet-stream').trim()
});
const lectureRange = (prompt) => { const m=String(prompt||'').match(/lecture(?:s)?\s*(?:from\s*)?(\d+)\s*(?:to|until|-)\s*(\d+)/i); return m?{from:Number(m[1]),to:Number(m[2])}:null; };
const jsonArray = (text) => { try { const s=String(text||'').replace(/```json/gi,'').replace(/```/g,'').trim(); const a=s.indexOf('['),b=s.lastIndexOf(']'); return a>=0&&b>a?JSON.parse(s.slice(a,b+1)):null; } catch { return null; } };
const validateQuiz = items => { if(!Array.isArray(items))return[]; const seen=new Set(); return items.map((q,i)=>{ const text=String(q?.q||'').trim(); const options=Array.isArray(q?.options)?q.options.map(v=>String(v??'').trim()):[]; const ans=Number(q?.ans); if(!text||options.length!==4||options.some(v=>!v)||!Number.isInteger(ans)||ans<0||ans>3)return null; const key=text.toLowerCase().replace(/\s+/g,' ').replace(/[^a-z0-9 ]/g,'').trim(); if(seen.has(key))return null; seen.add(key); return{id:i+1,q:text,options,ans,explanation:String(q?.explanation||'').trim(),source:String(q?.source||'').trim(),exact:Boolean(q?.exact)}; }).filter(Boolean); };

async function uploadToGemini(apiKey,bytes,mime,name,signal){
  const start=await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files',{method:'POST',signal,headers:{'x-goog-api-key':apiKey,'X-Goog-Upload-Protocol':'resumable','X-Goog-Upload-Command':'start','X-Goog-Upload-Header-Content-Length':String(bytes.byteLength),'X-Goog-Upload-Header-Content-Type':mime,'Content-Type':'application/json'},body:JSON.stringify({file:{display_name:name}})});
  if(!start.ok)throw new Error('Gemini source upload could not start.'); const uploadUrl=start.headers.get('x-goog-upload-url'); if(!uploadUrl)throw new Error('Gemini source upload URL was not returned.');
  const done=await fetch(uploadUrl,{method:'POST',signal,headers:{'Content-Length':String(bytes.byteLength),'X-Goog-Upload-Offset':'0','X-Goog-Upload-Command':'upload, finalize'},body:bytes}); if(!done.ok)throw new Error('Gemini source upload failed.'); return(await done.json())?.file;
}
async function readPrimarySource(apiKey,source,signal){
  const cached=cache.get(source.url); if(cached&&cached.expires>Date.now())return cached.parts;
  const response=await fetch(source.url,{signal}); if(!response.ok)throw new Error(`Uploaded source returned HTTP ${response.status}.`); const bytes=await response.arrayBuffer(); if(bytes.byteLength>MAX_BYTES)throw new Error('Uploaded source exceeds the 8 MB limit.');
  const mime=String(response.headers.get('content-type')||source.mime||'application/octet-stream').split(';')[0].toLowerCase(); const isPdf=mime==='application/pdf'||/\.pdf(?:$|\?)/i.test(source.url); const isText=mime.startsWith('text/')||/json|csv|xml|markdown/i.test(mime)||/\.(txt|csv|md|json)(?:$|\?)/i.test(source.url); let parts;
  if(isText)parts=[{text:`PRIMARY SOURCE: ${source.name}\nSOURCE CONTENT:\n${Buffer.from(bytes).toString('utf8').slice(0,120000)}`}];
  else if(isPdf)parts=[{text:`PRIMARY SOURCE FILE: ${source.name}\nRead this PDF as the authoritative course source. Preserve existing MCQs exactly when present.`},{inlineData:{mimeType:'application/pdf',data:Buffer.from(bytes).toString('base64')}}];
  else {const file=await uploadToGemini(apiKey,bytes,mime,source.name,signal); if(!file?.uri)throw new Error('Gemini did not return a source file URI.'); parts=[{text:`PRIMARY SOURCE FILE: ${source.name}\nRead this document as the authoritative course source. Preserve existing MCQs exactly when present.`},{fileData:{mimeType:file.mimeType||mime,fileUri:file.uri}}];}
  cache.set(source.url,{parts,expires:Date.now()+10*60*1000}); return parts;
}
async function fastGenerate(apiKey,prompt,sourceParts,signal){
  const requested=Math.min(Math.max(Number((String(prompt).match(/exactly\s+(\d+)/i)||[])[1]||10),1),50); const range=lectureRange(prompt);
  const instruction=`You are EduNexus Exam Quiz Engine. Generate exactly ${requested} MCQs.\nSTRICT SOURCE RULES:\n- Use ONLY the supplied PRIMARY SOURCE. Read actual content. Never use outside knowledge.\n- If the source already contains MCQs, extract those exact MCQs FIRST. Preserve EXACT question wording, EXACT A-D option wording, EXACT option order and source-supported answer. Set exact=true. Do not paraphrase.\n- Preserve the original source sequence for extracted MCQs.\n- Only if more questions are needed, create questions ONLY from explicit facts/concepts in the source and set exact=false.\n- Respect requested lecture range ${range?`${range.from}-${range.to}`:'(none specified)'} strictly; do not use other lectures.\n- Exactly 4 options and exactly 1 correct answer.\n- Return ONLY JSON array with q, options, ans, explanation, source, exact.\n\nUSER REQUEST:\n${prompt}`;
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{method:'POST',signal,headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{role:'user',parts:[{text:instruction},...sourceParts]}],generationConfig:{responseMimeType:'application/json',temperature:0.05}})});
  const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(`Gemini provider error (${response.status}): ${String(data?.error?.message||'unknown error').slice(0,350)}`); const text=data?.candidates?.[0]?.content?.parts?.map(p=>p?.text||'').filter(Boolean).join('\n').trim(); const valid=validateQuiz(jsonArray(text)); if(!valid.length)throw new Error('Gemini returned no valid source-grounded four-option questions.'); return valid;
}
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'}); const apiKey=process.env.GEMINI_API_KEY; if(!apiKey)return res.status(503).json({code:'GEMINI_NOT_CONFIGURED',error:'GEMINI_API_KEY is missing in the Vercel environment.'}); const prompt=typeof req.body?.prompt==='string'?req.body.prompt:''; if(!prompt.trim())return res.status(400).json({error:'A non-empty prompt is required.'});
  const source=sourceFromPrompt(prompt); const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),27000);
  try{ if(!source.url){const upstream=await fetch(new URL('/api/gemini-quiz',req.url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt}),signal:controller.signal}); const data=await upstream.json().catch(()=>({})); return res.status(upstream.status).json(data);} const parts=await readPrimarySource(apiKey,source,controller.signal); const quiz=await fastGenerate(apiKey,prompt,parts,controller.signal); return res.status(200).json({text:JSON.stringify(quiz),sources:[{title:source.name,primary:true}]}); }
  catch(error){return res.status(error?.name==='AbortError'?504:502).json({error:error?.name==='AbortError'?'Source reading or AI generation timed out. Please try again.':String(error?.message||'Fast AI quiz generation failed.')});} finally{clearTimeout(timer);}
}
