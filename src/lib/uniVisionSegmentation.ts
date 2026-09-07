export type UniVisionMetrics={pixelCount:number;rMean:number;gMean:number;bMean:number;lMean:number;aMean:number;labBMean:number;lStd:number;aStd:number;bStd:number;chroma:number;hueDeg:number}
export type SegmentationConfidence='good'|'review'
export type UniVisionMaskMode='focused'|'broad'
export type UniVisionSegmentation={metrics:UniVisionMetrics;usableRatio:number;borderCandidateRatio:number;confidence:SegmentationConfidence;maskMode:UniVisionMaskMode;previewDataUrl:string;retainedComponents:number}

type Lab=readonly[number,number,number]
type Candidate=(lab:Lab)=>boolean
type Selection={candidate:Candidate;seed:Candidate;maskMode:UniVisionMaskMode}
type GridMask={cols:number;rows:number;stride:number;originX:number;originY:number;mask:Uint8Array;retainedComponents:number}

export function rgbToLab(r:number,g:number,b:number):Lab{
 const linear=(value:number)=>{const v=value/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4}
 const rr=linear(r),gg=linear(g),bb=linear(b)
 const x=(rr*0.4124564+gg*0.3575761+bb*0.1804375)/0.95047
 const y=(rr*0.2126729+gg*0.7151522+bb*0.0721750)
 const z=(rr*0.0193339+gg*0.1191920+bb*0.9503041)/1.08883
 const f=(value:number)=>value>0.008856?Math.cbrt(value):7.787*value+16/116
 const fx=f(x),fy=f(y),fz=f(z)
 return[116*fy-16,500*(fx-fy),200*(fy-fz)] as const
}

function isBroadRoeCandidate([l,a,b]:Lab){const chroma=Math.sqrt(a*a+b*b);return l>18&&l<98&&a>-8&&b>8&&chroma>14}
function isFocusedRoeCandidate([l,a,b]:Lab){const chroma=Math.sqrt(a*a+b*b);return l>40&&l<92&&a>2&&b>20&&chroma>24}
function deltaE76([l1,a1,b1]:Lab,[l2,a2,b2]:Lab){return Math.sqrt((l1-l2)**2+(a1-a2)**2+(b1-b2)**2)}

function chooseCandidate(full:ImageData,canvas:HTMLCanvasElement,marginX:number,marginY:number,stride:number):Selection{
 let total=0,focused=0,l=0,a=0,b=0
 for(let y=marginY;y<canvas.height-marginY;y+=stride){for(let x=marginX;x<canvas.width-marginX;x+=stride){
  const index=(y*canvas.width+x)*4
  if(full.data[index+3]<200)continue
  total++
  const lab=rgbToLab(full.data[index],full.data[index+1],full.data[index+2])
  if(isFocusedRoeCandidate(lab)){focused++;l+=lab[0];a+=lab[1];b+=lab[2]}
 }}
 const focusedRatio=total?focused/total:0
 if(focused>=100&&focusedRatio>=0.015){
  const centre:[number,number,number]=[l/focused,a/focused,b/focused]
  const adaptive:Candidate=(lab)=>isBroadRoeCandidate(lab)&&(isFocusedRoeCandidate(lab)||deltaE76(lab,centre)<=34)
  return{candidate:adaptive,seed:isFocusedRoeCandidate,maskMode:'focused'}
 }
 return{candidate:isBroadRoeCandidate,seed:isFocusedRoeCandidate,maskMode:'broad'}
}

function smoothMask(input:Uint8Array,cols:number,rows:number){
 let current=input
 for(let pass=0;pass<2;pass++){
  const next=new Uint8Array(current)
  for(let y=1;y<rows-1;y++){for(let x=1;x<cols-1;x++){
   const i=y*cols+x
   let neighbours=0
   for(let yy=-1;yy<=1;yy++){for(let xx=-1;xx<=1;xx++){if(xx||yy)neighbours+=current[(y+yy)*cols+x+xx]}}
   if(!current[i]&&neighbours>=5)next[i]=1
   else if(current[i]&&neighbours<=1)next[i]=0
  }}
  current=next
 }
 return current
}

function spatialMask(full:ImageData,canvas:HTMLCanvasElement,selection:Selection,marginX:number,marginY:number,stride:number):GridMask{
 const cols=Math.max(1,Math.ceil((canvas.width-marginX*2)/stride)),rows=Math.max(1,Math.ceil((canvas.height-marginY*2)/stride)),raw=new Uint8Array(cols*rows),seed=new Uint8Array(cols*rows)
 for(let gy=0;gy<rows;gy++){const y=Math.min(canvas.height-marginY-1,marginY+gy*stride);for(let gx=0;gx<cols;gx++){const x=Math.min(canvas.width-marginX-1,marginX+gx*stride),index=(y*canvas.width+x)*4;if(full.data[index+3]<200)continue;const lab=rgbToLab(full.data[index],full.data[index+1],full.data[index+2]),i=gy*cols+gx;if(selection.candidate(lab))raw[i]=1;if(selection.seed(lab))seed[i]=1}}
 const mask=smoothMask(raw,cols,rows),seen=new Uint8Array(mask.length),out=new Uint8Array(mask.length),minimumArea=Math.max(10,Math.round(mask.length*0.00035))
 let retainedComponents=0
 const dirs=[-1,0,1]
 for(let start=0;start<mask.length;start++){
  if(!mask[start]||seen[start])continue
  const stack=[start],pixels:number[]=[];seen[start]=1
  let minX=cols,maxX=0,minY=rows,maxY=0,seedCount=0,boundaryCount=0
  while(stack.length){const i=stack.pop() as number,pY=Math.floor(i/cols),pX=i-pY*cols;pixels.push(i);if(seed[i])seedCount++;if(pX===0||pY===0||pX===cols-1||pY===rows-1)boundaryCount++;minX=Math.min(minX,pX);maxX=Math.max(maxX,pX);minY=Math.min(minY,pY);maxY=Math.max(maxY,pY);for(const dy of dirs){for(const dx of dirs){if(!dx&&!dy)continue;const nx=pX+dx,ny=pY+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const ni=ny*cols+nx;if(mask[ni]&&!seen[ni]){seen[ni]=1;stack.push(ni)}}}}
  const area=pixels.length,bboxW=maxX-minX+1,bboxH=maxY-minY+1,bboxArea=bboxW*bboxH,fill=area/Math.max(1,bboxArea),aspect=Math.max(bboxW/bboxH,bboxH/bboxW),seedRatio=seedCount/Math.max(1,area),boundaryRatio=boundaryCount/Math.max(1,area)
  const tiny=area<minimumArea
  const frameLike=bboxArea>mask.length*0.08&&fill<0.16
  const lineLike=aspect>8&&fill<0.45
  const edgeArtifact=boundaryRatio>0.30&&seedRatio<0.35
  const weakColour=seedCount===0&&area<minimumArea*4
  if(tiny||frameLike||lineLike||edgeArtifact||weakColour)continue
  retainedComponents++
  for(const i of pixels)out[i]=1
 }
 return{cols,rows,stride,originX:marginX,originY:marginY,mask:out,retainedComponents}
}

function gridContains(grid:GridMask,x:number,y:number){const gx=Math.floor((x-grid.originX)/grid.stride),gy=Math.floor((y-grid.originY)/grid.stride);return gx>=0&&gy>=0&&gx<grid.cols&&gy<grid.rows&&grid.mask[gy*grid.cols+gx]===1}

function buildMaskPreview(canvas:HTMLCanvasElement,grid:GridMask){
 const scale=Math.min(1,480/canvas.width,360/canvas.height),preview=document.createElement('canvas')
 preview.width=Math.max(1,Math.round(canvas.width*scale));preview.height=Math.max(1,Math.round(canvas.height*scale))
 const context=preview.getContext('2d',{willReadFrequently:true});if(!context)return''
 context.drawImage(canvas,0,0,preview.width,preview.height)
 const image=context.getImageData(0,0,preview.width,preview.height)
 for(let y=0;y<preview.height;y++){for(let x=0;x<preview.width;x++){
  const index=(y*preview.width+x)*4,sourceX=x/scale,sourceY=y/scale,product=gridContains(grid,sourceX,sourceY)
  if(!product){image.data[index]=Math.round(image.data[index]*0.22+198);image.data[index+1]=Math.round(image.data[index+1]*0.22+198);image.data[index+2]=Math.round(image.data[index+2]*0.22+198)}
 }}
 context.putImageData(image,0,0)
 return preview.toDataURL('image/jpeg',0.82)
}

export function analyzeSegmentedCanvas(canvas:HTMLCanvasElement):UniVisionSegmentation{
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas no disponible')
 const full=context.getImageData(0,0,canvas.width,canvas.height),marginX=Math.floor(canvas.width*0.08),marginY=Math.floor(canvas.height*0.08),width=Math.max(1,canvas.width-marginX*2),height=Math.max(1,canvas.height-marginY*2),stride=Math.max(1,Math.floor(Math.sqrt((width*height)/120000))),selection=chooseCandidate(full,canvas,marginX,marginY,stride),grid=spatialMask(full,canvas,selection,marginX,marginY,stride)
 let total=0,count=0,r=0,g=0,b=0,l=0,a=0,labB=0,l2=0,a2=0,b2=0
 for(let gy=0;gy<grid.rows;gy++){const y=Math.min(canvas.height-marginY-1,marginY+gy*stride);for(let gx=0;gx<grid.cols;gx++){const x=Math.min(canvas.width-marginX-1,marginX+gx*stride),index=(y*canvas.width+x)*4;if(full.data[index+3]<200)continue;total++;if(!grid.mask[gy*grid.cols+gx])continue;const rr=full.data[index],gg=full.data[index+1],bb=full.data[index+2],[ll,aa,bbb]=rgbToLab(rr,gg,bb);count++;r+=rr;g+=gg;b+=bb;l+=ll;a+=aa;labB+=bbb;l2+=ll*ll;a2+=aa*aa;b2+=bbb*bbb}}
 const usableRatio=total?count/total:0
 if(count<100||usableRatio<0.02||grid.retainedComponents===0)throw new Error('No se pudo aislar suficiente roe con continuidad espacial. Acerca la muestra, reduce reflejos o deja el producto sobre un fondo neutro.')
 let borderTotal=0,borderCandidates=0
 for(let gy=0;gy<grid.rows;gy++){for(let gx=0;gx<grid.cols;gx++){if(gx>1&&gy>1&&gx<grid.cols-2&&gy<grid.rows-2)continue;borderTotal++;if(grid.mask[gy*grid.cols+gx])borderCandidates++}}
 const borderCandidateRatio=borderTotal?borderCandidates/borderTotal:0,rMean=r/count,gMean=g/count,bMean=b/count,lMean=l/count,aMean=a/count,labBMean=labB/count,lStd=Math.sqrt(Math.max(0,l2/count-lMean*lMean)),aStd=Math.sqrt(Math.max(0,a2/count-aMean*aMean)),bStd=Math.sqrt(Math.max(0,b2/count-labBMean*labBMean)),chroma=Math.sqrt(aMean*aMean+labBMean*labBMean),hueDeg=(Math.atan2(labBMean,aMean)*180/Math.PI+360)%360,minimumRatio=selection.maskMode==='focused'?0.015:0.03,confidence:SegmentationConfidence=usableRatio<minimumRatio||usableRatio>0.90||borderCandidateRatio>0.20?'review':'good'
 return{metrics:{pixelCount:count,rMean,gMean,bMean,lMean,aMean,labBMean,lStd,aStd,bStd,chroma,hueDeg},usableRatio,borderCandidateRatio,confidence,maskMode:selection.maskMode,previewDataUrl:buildMaskPreview(canvas,grid),retainedComponents:grid.retainedComponents}
}
