import {getSql} from './_db.js'

type Request={method?:string}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(req:Request,res:Response){
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Metodo no permitido'})}
  try{
    const sql=getSql()
    const rows=await sql`select current_setting('neon.branch_id',true) as branch_id,current_database() as database_name`
    const row=Array.isArray(rows)?rows[0] as {branch_id?:string|null;database_name?:string|null}|undefined:undefined
    return res.status(200).json({ok:true,verificationOnly:true,branchId:row?.branch_id??null,databaseName:row?.database_name??null})
  }catch{
    return res.status(500).json({ok:false,error:'No fue posible verificar la identidad de la base del preview'})
  }
}
