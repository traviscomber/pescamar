import {get} from 'node:https'

type Response={statusCode:number;setHeader:(name:string,value:string)=>void;end:(body?:Buffer)=>void}
const SOURCE='https://pescamarchile.cl/wp-content/uploads/2021/06/AAAAAA.jpg'

function pipeImage(url:string,res:Response,redirects=0){
 get(url,{headers:{'user-agent':'Mozilla/5.0 Pescamar/1.0'}},upstream=>{
  const status=upstream.statusCode??500
  const location=upstream.headers.location
  if(status>=300&&status<400&&location&&redirects<3){upstream.resume();return pipeImage(new URL(location,url).toString(),res,redirects+1)}
  if(status<200||status>=300){upstream.resume();res.statusCode=502;return res.end()}
  const chunks:Buffer[]=[]
  upstream.on('data',(chunk:Buffer)=>chunks.push(chunk))
  upstream.on('end',()=>{
   res.statusCode=200
   res.setHeader('Content-Type',String(upstream.headers['content-type']||'image/jpeg'))
   res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000')
   res.end(Buffer.concat(chunks))
  })
 }).on('error',()=>{res.statusCode=502;res.end()})
}

export default function handler(_req:unknown,res:Response){pipeImage(SOURCE,res)}
