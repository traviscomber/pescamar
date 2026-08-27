export type UniVisionMetrics={pixelCount:number;rMean:number;gMean:number;bMean:number;lMean:number;aMean:number;labBMean:number;lStd:number;aStd:number;bStd:number;chroma:number;hueDeg:number}
export type SegmentationConfidence='good'|'review'
export type UniVisionSegmentation={metrics:UniVisionMetrics;usableRatio:number;borderCandidateRatio:number;confidence:SegmentationConfidence;previewDataUrl:string}

type Lab=readonly[number,number,number]

export function rgbToLab(r:number,g:number,b:number):Lab{
 const linear=(value:number)=>{const v=value/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4}
 const rr=linear(r),gg=linear(g),bb=linear(b)
 const x=(rr*0.4124564+gg*0.3575761+bb*0.1804375)/0.95047
 const y=rr*0.2126729+gg*0.7151522+bb*0.0721750
 const z=(rr*0.0193339+gg*0.1191920+bb*0.9503041)/1.08883
 const f=(value:number)=>value>0.008856?Math.cbrt(value):7.787*value+16/116
 const fx=f(x),fy=f(y),fz=f(z)
 return[116*fy-16,500*(fx-fy),200*(fy-fz)] as const
}

// Broad roe-domain mask only. These limits separate warm biological product from
// white/metal trays, green baskets and dark scale hardware. They never map to A-E.
function isRoeCandidate([l,a,b]:Lab){const chroma=Math.sqrt(a*a+b*b);return l>15&&l<95&&a>-5&&b>10&&chroma>15}

function buildMaskPreview(canvas:HTMLCanvasElement){
 const scale=Math.min(1,480/canvas.width,360/canvas.height),preview=document.createElement('canvas')
 preview.width=Math.max(1,Math.round(canvas.width*scale));preview.height=Math.max(1,Math.round(canvas.height*scale))
 const context=preview.getContext('2d',{willReadFrequently:true});if(!context)return''
 context.drawImage(canvas,0,0,preview.width,preview.height)
 const image=context.getImageData(0,0,preview.width,preview.height),marginX=Math.floor(preview.width*0.08),marginY=Math.floor(preview.height*0.08)
 for(let y=0;y<preview.height;y++){for(let x=0;x<preview.width;x++){const index=(y*preview.width+x)*4,inside=x>=marginX&&x<preview.width-marginX&&y>=marginY&&y<preview.height-marginY,product=inside&&isRoeCandidate(rgbToLab(image.data[index],image.data[index+1],image.data[index+2]));if(!product){image.data[index]=Math.round(image.data[index]*0.22+198);image.data[index+1]=Math.round(image.data[index+1]*0.22+198);image.data[index+2]=Math.round(image.data[index+2]*0.22+198)}}}
 context.putImageData(image,0,0)
 return preview.toDataURL('image/jpeg',0.82)
}

export function analyzeSegmentedCanvas(canvas:HTMLCanvasElement):UniVisionSegmentation{
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas no disponible')
 const full=context.getImageData(0,0,canvas.width,canvas.height),marginX=Math.floor(canvas.width*0.08),marginY=Math.floor(canvas.height*0.08),width=Math.max(1,canvas.width-marginX*2),height=Math.max(1,canvas.height-marginY*2),stride=Math.max(1,Math.floor(Math.sqrt((width*height)/120000)))
 let total=0,count=0,r=0,g=0,b=0,l=0,a=0,labB=0,l2=0,a2=0,b2=0
 for(let y=marginY;y<canvas.height-marginY;y+=stride){for(let x=marginX;x<canvas.width-marginX;x+=stride){const index=(y*canvas.width+x)*4;if(full.data[index+3]<200)continue;total++;const rr=full.data[index],gg=full.data[index+1],bb=full.data[index+2],candidate=rgbToLab(rr,gg,bb);if(!isRoeCandidate(candidate))continue;const[ll,aa,bbb]=candidate;count++;r+=rr;g+=gg;b+=bb;l+=ll;a+=aa;labB+=bbb;l2+=ll*ll;a2+=aa*aa;b2+=bbb*bbb}}
 const usableRatio=total?count/total:0
 if(count<100||usableRatio<0.03)throw new Error('No se pudo aislar suficiente roe. Acerca la muestra, reduce reflejos o deja el producto sobre un fondo neutro.')
 const border=Math.max(4,Math.round(Math.min(canvas.width,canvas.height)*0.08)),borderStride=Math.max(1,Math.floor(Math.sqrt(Math.max(1,(canvas.width*border*2+canvas.height*border*2)/8000))))
 let borderTotal=0,borderCandidates=0
 for(let y=0;y<canvas.height;y+=borderStride){for(let x=0;x<canvas.width;x+=borderStride){if(x>=border&&x<canvas.width-border&&y>=border&&y<canvas.height-border)continue;const index=(y*canvas.width+x)*4;if(full.data[index+3]<200)continue;borderTotal++;if(isRoeCandidate(rgbToLab(full.data[index],full.data[index+1],full.data[index+2])))borderCandidates++}}
 const borderCandidateRatio=borderTotal?borderCandidates/borderTotal:0
 const rMean=r/count,gMean=g/count,bMean=b/count,lMean=l/count,aMean=a/count,labBMean=labB/count,lStd=Math.sqrt(Math.max(0,l2/count-lMean*lMean)),aStd=Math.sqrt(Math.max(0,a2/count-aMean*aMean)),bStd=Math.sqrt(Math.max(0,b2/count-labBMean*labBMean)),chroma=Math.sqrt(aMean*aMean+labBMean*labBMean),hueDeg=(Math.atan2(labBMean,aMean)*180/Math.PI+360)%360
 const confidence:SegmentationConfidence=usableRatio<0.05||usableRatio>0.97||borderCandidateRatio>0.45?'review':'good'
 return{metrics:{pixelCount:count,rMean,gMean,bMean,lMean,aMean,labBMean,lStd,aStd,bStd,chroma,hueDeg},usableRatio,borderCandidateRatio,confidence,previewDataUrl:buildMaskPreview(canvas)}
}
