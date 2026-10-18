import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
 "https://fikrauz.773649664s.workers.dev",
 "https://sayt-usta-shaxboz.teal-heron-6800.chatgpt.site"
]);
const cacheKey = "safe_uz_shorts";
const cacheDurationMs = 6 * 60 * 60 * 1000;
const lockDurationMs = 10 * 60 * 1000;

function headersFor(origin: string) {
 const allowed = origin && allowedOrigins.has(origin) ? origin : "https://fikrauz.773649664s.workers.dev";
 return {
  "Access-Control-Allow-Origin": allowed,
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
  "Cache-Control": "private, max-age=180",
  "Content-Type": "application/json; charset=utf-8"
 };
}
function respond(status: number, payload: unknown, origin: string) {
 return new Response(JSON.stringify(payload), { status, headers: headersFor(origin) });
}
function durationSeconds(input: string) {
 const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(input || "");
 if (!m) return Number.POSITIVE_INFINITY;
 return Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0);
}
function secretKey() {
 const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if (legacy) return legacy;
 try {
  return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || "";
 } catch {
  return "";
 }
}
async function loadYouTube(key: string) {
 const params = new URLSearchParams({
  part:"snippet",
  type:"video",
  q:"#shorts",
  order:"date",
  videoDuration:"short",
  videoEmbeddable:"true",
  safeSearch:"strict",
  regionCode:"UZ",
  maxResults:"40",
  key
 });
 const res=await fetch("https://www.googleapis.com/youtube/v3/search?"+params, {signal:AbortSignal.timeout(13000)});
 if(!res.ok) throw new Error("YouTube search: HTTP "+res.status);
 const data=await res.json();
 const items=Array.isArray(data.items)?data.items:[];
 const ids=[...new Set(items.map((item:any)=>item?.id?.videoId).filter((v:unknown)=>typeof v==="string"&&/^[A-Za-z0-9_-]{11}$/.test(v)))];
 if(!ids.length) return [];
 const vParams=new URLSearchParams({
  part:"contentDetails,status",
  id:ids.join(","),
  key
 });
 const vRes=await fetch("https://www.googleapis.com/youtube/v3/videos?"+vParams, {signal:AbortSignal.timeout(13000)});
 if(!vRes.ok) throw new Error("YouTube video details: HTTP "+vRes.status);
 const videoData=await vRes.json();
 const acceptable=new Set((Array.isArray(videoData.items)?videoData.items:[])
  .filter((v:any)=>{
   const seconds=durationSeconds(v?.contentDetails?.duration||"");
   return seconds>=1 && seconds<=180 && v?.status?.embeddable===true && v?.status?.privacyStatus==="public";
  }).map((v:any)=>v.id));
 return items.filter((item:any)=>acceptable.has(item?.id?.videoId))
  .slice(0,32)
  .map((item:any)=>({
   youtube_id:String(item.id.videoId),
   title:String(item.snippet?.title||"Shorts").slice(0,160),
   channel:String(item.snippet?.channelTitle||"YouTube").slice(0,80),
   published_at:String(item.snippet?.publishedAt||"")
  }));
}

Deno.serve(async (request:Request)=>{
 const origin=request.headers.get("origin")||"";
 if (request.method==="OPTIONS") return new Response(null,{status:204,headers:headersFor(origin)});
 if (origin&&!allowedOrigins.has(origin))return respond(403,{items:[],enabled:false,error:"origin_not_allowed"},origin);
 if(request.method!=="POST"&&request.method!=="GET")return respond(405,{items:[],enabled:false,error:"method_not_allowed"},origin);

 const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
 const service=secretKey();
 if(!supabaseUrl||!service)return respond(503,{items:[],enabled:false,error:"server_not_configured"},origin);
 const db=createClient(supabaseUrl,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:cache,error:readError}=await db.from("fikra_youtube_cache")
  .select("cache_key,items,fetched_at,last_attempt_at").eq("cache_key",cacheKey).maybeSingle();
 if(readError) return respond(503,{items:[],enabled:false,error:"cache_unavailable"},origin);
 const cached=Array.isArray(cache?.items)?cache.items:[];
 const age=Date.now()-new Date(cache?.fetched_at||0).getTime();
 const apiKey=(Deno.env.get("YOUTUBE_API_KEY")||"").trim();
 if(age<cacheDurationMs && cached.length)return respond(200,{items:cached,enabled:!!apiKey,cached:true},origin);
 if(!apiKey)return respond(200,{items:cached,enabled:false,cached:cached.length>0,reason:"missing_youtube_api_key"},origin);

 const nextCutoff=new Date(Date.now()-lockDurationMs).toISOString();
 const {data:lock,error:lockErr}=await db.from("fikra_youtube_cache").update({last_attempt_at:new Date().toISOString()})
  .eq("cache_key",cacheKey).lt("last_attempt_at",nextCutoff).select("cache_key");
 if(lockErr||!lock?.length)return respond(200,{items:cached,enabled:true,cached:true,refreshing:true},origin);
 try {
  const found=await loadYouTube(apiKey);
  if(found.length){
   const {error:writeError}=await db.from("fikra_youtube_cache")
    .update({items:found,fetched_at:new Date().toISOString()}).eq("cache_key",cacheKey);
   if(writeError) throw writeError;
   return respond(200,{items:found,enabled:true,cached:false},origin);
  }
  return respond(200,{items:cached,enabled:true,cached:cached.length>0},origin);
 }catch(e){
  console.warn("FIKRA automatic Shorts refresh:", String(e instanceof Error?e.message:e).slice(0,190));
  return respond(200,{items:cached,enabled:true,cached:cached.length>0,refresh_failed:true},origin);
 }
});
