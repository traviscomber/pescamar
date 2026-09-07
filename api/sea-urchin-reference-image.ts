import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

declare const fetch:(input:string,init?:Record<string,unknown>)=>Promise<{ok:boolean;status:number;headers:{get:(name:string)=>string|null};arrayBuffer:()=>Promise<ArrayBuffer>}>
declare const Buffer:{from:(input:ArrayBuffer)=>unknown}

type Request={method?:string;query?:Record<string,string|string[]|undefined>;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;end:(body?:unknown)=>void;json:(body:unknown)=>void}

function queryValue(req:Request,key:string){const value=req.query?.[key];return Array.isArray(value)?value[0]:value}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','public, max-age=300, s-maxage=86400, stale-while-revalidate=604800')
  try{
    const operator=await requireOperator(req)
    if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
    const id=String(queryValue(req,'id')??'').trim()
    if(!id)return res.status(400).json({ok:false,error:'Referencia requerida'})
    const rows=await getSql()`select image_url from sea_urchin_external_references where id=${id} limit 1` as Array<{image_url:string|null}>
    const url=rows[0]?.image_url
    if(!url)return res.status(404).json({ok:false,error:'Imagen no encontrada'})
    const upstream=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 Pescamar-UniVision/1.0','Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'}})
    if(!upstream.ok)return res.status(502).json({ok:false,error:`Fuente de imagen respondió ${upstream.status}`})
    const contentType=upstream.headers.get('content-type')||'image/jpeg'
    if(!contentType.toLowerCase().startsWith('image/'))return res.status(502).json({ok:false,error:'La fuente no devolvió una imagen'})
    const bytes=await upstream.arrayBuffer()
    res.setHeader('Content-Type',contentType)
    res.setHeader('X-Content-Type-Options','nosniff')
    return res.status(200).end(Buffer.from(bytes))
  }catch{
    return res.status(500).json({ok:false,error:'No fue posible cargar la imagen de referencia'})
  }
}
