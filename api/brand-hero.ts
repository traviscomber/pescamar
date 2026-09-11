import type {VercelRequest,VercelResponse} from '@vercel/node'

const SOURCE='https://pescamarchile.cl/wp-content/uploads/2021/06/AAAAAA.jpg'

export default async function handler(_req:VercelRequest,res:VercelResponse){
 try{
  const upstream=await fetch(SOURCE,{headers:{'user-agent':'Mozilla/5.0 Pescamar/1.0'}})
  if(!upstream.ok)throw new Error(`Upstream ${upstream.status}`)
  const body=Buffer.from(await upstream.arrayBuffer())
  res.setHeader('Content-Type',upstream.headers.get('content-type')||'image/jpeg')
  res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000')
  res.status(200).send(body)
 }catch{
  res.status(502).end()
 }
}
