import {URL} from 'node:url'
import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

declare const fetch:(input:string,init?:Record<string,unknown>)=>Promise<{ok:boolean;status:number;url?:string;headers:{get:(name:string)=>string|null};arrayBuffer:()=>Promise<ArrayBuffer>;text:()=>Promise<string>}>
declare const Buffer:{from:(input:ArrayBuffer)=>unknown}

type Request={method?:string;query?:Record<string,string|string[]|undefined>;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;end:(body?:unknown)=>void;json:(body:unknown)=>void}
type ReferenceRow={image_url:string|null;source_page:string|null}

function queryValue(req:Request,key:string){const value=req.query?.[key];return Array.isArray(value)?value[0]:value}
function isImage(contentType:string|null){return Boolean(contentType&&contentType.toLowerCase().startsWith('image/'))}
function absoluteUrl(value:string,base:string){try{return new URL(value,base).toString()}catch{return null}}
function htmlImageCandidates(html:string,base:string){
  const found:string[]=[]
  const patterns=[
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi
  ]
  for(const pattern of patterns){for(const match of html.matchAll(pattern)){const candidate=absoluteUrl(match[1].replace(/&amp;/g,'&'),base);if(candidate&&!found.includes(candidate))found.push(candidate)}}
  return found
}
async function fetchImage(url:string,referer?:string|null){
  const headers:Record<string,string>={
    'User-Agent':'Mozilla/5.0 (compatible; Pescamar-UniVision/1.1; +https://pescamar-three.vercel.app)',
    'Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
  }
  if(referer)headers.Referer=referer
  const response=await fetch(url,{headers,redirect:'follow'})
  return response
}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','public, max-age=300, s-maxage=86400, stale-while-revalidate=604800')
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
    const id=String(queryValue(req,'id')??'').trim()
    if(!id)return res.status(400).json({ok:false,error:'Referencia requerida'})
    const rows=await getSql()`select image_url,source_page from sea_urchin_external_references where id=${id} limit 1` as ReferenceRow[]
    const row=rows[0]
    if(!row?.image_url)return res.status(404).json({ok:false,error:'Imagen no encontrada'})

    const attempts:string[]=[row.image_url]
    let upstream=await fetchImage(row.image_url,row.source_page)

    if((!upstream.ok||!isImage(upstream.headers.get('content-type')))&&row.source_page){
      try{
        const page=await fetch(row.source_page,{headers:{'User-Agent':'Mozilla/5.0 (compatible; Pescamar-UniVision/1.1)','Accept':'text/html,application/xhtml+xml'}})
        if(page.ok){
          const html=await page.text()
          for(const candidate of htmlImageCandidates(html,row.source_page)){
            if(attempts.includes(candidate))continue
            attempts.push(candidate)
            const candidateResponse=await fetchImage(candidate,row.source_page)
            if(candidateResponse.ok&&isImage(candidateResponse.headers.get('content-type'))){upstream=candidateResponse;break}
          }
        }
      }catch{/* fallback exhausted below */}
    }

    if(!upstream.ok)return res.status(502).json({ok:false,error:`Fuente de imagen respondió ${upstream.status}`,attempted:attempts.length})
    const contentType=upstream.headers.get('content-type')||'image/jpeg'
    if(!isImage(contentType))return res.status(502).json({ok:false,error:'La fuente no devolvió una imagen',attempted:attempts.length})
    const bytes=await upstream.arrayBuffer()
    if(bytes.byteLength===0)return res.status(502).json({ok:false,error:'La fuente devolvió una imagen vacía'})
    res.setHeader('Content-Type',contentType)
    res.setHeader('X-Content-Type-Options','nosniff')
    res.setHeader('Content-Length',String(bytes.byteLength))
    return res.status(200).end(Buffer.from(bytes))
  }catch{
    return res.status(500).json({ok:false,error:'No fue posible cargar la imagen de referencia'})
  }
}
