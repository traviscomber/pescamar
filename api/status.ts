type ApiResponse={status:(code:number)=>ApiResponse;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
declare const process:{env:Record<string,string|undefined>}

export default function handler(_request:unknown,response:ApiResponse){
  response.setHeader('Cache-Control','no-store')
  response.status(200).json({
    ok:true,
    service:'pescamar-control',
    platform:'vercel-functions',
    environment:process.env.VERCEL_ENV??'local',
    persistence:{database:Boolean(process.env.DATABASE_URL),files:Boolean(process.env.BLOB_READ_WRITE_TOKEN)},
    commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7)??null,
    checkedAt:new Date().toISOString()
  })
}
