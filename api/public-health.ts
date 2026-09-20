type Request={method?:string}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export const PUBLIC_HEALTH_VERSION='pescamar.public-health.v1' as const

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 return res.status(200).json({ok:true,service:'pescamar',status:'live',healthVersion:PUBLIC_HEALTH_VERSION,checkedAt:new Date().toISOString()})
}
