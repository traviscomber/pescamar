import {requireOperator} from './_auth.js'
import {segmentUniVisionFrame} from './_uni-vision-segmentation.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Body={width?:unknown;height?:unknown;rgbaBase64?:unknown}
const MAX_WIDTH=720,MAX_HEIGHT=540,MAX_PIXELS=MAX_WIDTH*MAX_HEIGHT

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 try{
  if(request.method!=='POST'){response.setHeader('Allow','POST');return response.status(405).json({ok:false,error:'Método no permitido'})}
  const operator=await requireOperator(request,['admin','operations','quality'])
  if(!operator)return response.status(401).json({ok:false,error:'Sesión operativa requerida'})
  const body=(request.body??{}) as Body,width=Number(body.width),height=Number(body.height),rgbaBase64=typeof body.rgbaBase64==='string'?body.rgbaBase64:''
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||width>MAX_WIDTH||height>MAX_HEIGHT||width*height>MAX_PIXELS)return response.status(400).json({ok:false,error:'Dimensiones de análisis inválidas'})
  const expectedBytes=width*height*4
  if(!rgbaBase64||rgbaBase64.length>Math.ceil(expectedBytes/3)*4+16)return response.status(400).json({ok:false,error:'Frame visual inválido'})
  const decoded=Buffer.from(rgbaBase64,'base64')
  if(decoded.length!==expectedBytes)return response.status(400).json({ok:false,error:'Frame visual incompleto'})
  const result=segmentUniVisionFrame({width,height,rgba:new Uint8Array(decoded.buffer,decoded.byteOffset,decoded.byteLength)})
  return response.status(200).json({ok:true,segmentation:{metrics:result.metrics,usableRatio:result.usableRatio,borderCandidateRatio:result.borderCandidateRatio,confidence:result.confidence,maskMode:result.maskMode,retainedComponents:result.retainedComponents,suppressedFramePixels:result.suppressedFramePixels,filledHolePixels:result.filledHolePixels,recoveredEdgePixels:result.recoveredEdgePixels,roi:result.roi,segmentationVersion:result.segmentationVersion,mask:{cols:result.mask.cols,rows:result.mask.rows,stride:result.mask.stride,originX:result.mask.originX,originY:result.mask.originY,dataBase64:Buffer.from(result.mask.data).toString('base64')}}})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const userSafe=message==='Frame visual inválido'||message.startsWith('No se pudo aislar suficiente uni')
  return response.status(userSafe?422:500).json({ok:false,error:userSafe?message:'No fue posible analizar la captura visual'})
 }
}
