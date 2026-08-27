export type UniVisionMetrics={pixelCount:number;rMean:number;gMean:number;bMean:number;lMean:number;aMean:number;labBMean:number;lStd:number;aStd:number;bStd:number;chroma:number;hueDeg:number}
export type SegmentationConfidence='good'|'review'
export type UniVisionSegmentation={metrics:UniVisionMetrics;usableRatio:number;backgroundThreshold:number;backgroundSpread:number;confidence:SegmentationConfidence;previewDataUrl:string}

type Lab=readonly[number,number,number]
type Centroid=[number,number,number]

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value))
const percentile=(values:number[],ratio:number)=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.max(0,Math.floor((sorted.length-1)*ratio)))]}
const distance=(a:Lab,b:Lab)=>Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2)
const nearestDistance=(value:Lab,centroids:Centroid[])=>centroids.reduce((best,item)=>Math.min(best,distance(value,item)),Number.POSITIVE_INFINITY)

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

function kMeansBackground(samples:Lab[],count=3){
 if(!samples.length)throw new Error('No fue posible estimar el fondo')
 const first=samples[0]
 const second=samples.reduce((best,item)=>distance(item,first)>distance(best,first)?item:best,first)
 const third=samples.reduce((best,item)=>nearestDistance(item,[first as Centroid,second as Centroid])>nearestDistance(best,[first as Centroid,second as Centroid])?item:best,first)
 let centroids:Centroid[]=[first,second,third].slice(0,Math.min(count,samples.length)).map(item=>[item[0],item[1],item[2]])
 for(let iteration=0;iteration<6;iteration++){
  const sums=centroids.map(()=>[0,0,0,0] as [number,number,number,number])
  for(const sample of samples){let best=0,bestDistance=Number.POSITIVE_INFINITY;centroids.forEach((item,index)=>{const candidate=distance(sample,item);if(candidate<bestDistance){bestDistance=candidate;best=index}});const sum=sums[best];sum[0]+=sample[0];sum[1]+=sample[1];sum[2]+=sample[2];sum[3]++}
  centroids=centroids.map((item,index)=>{const sum=sums[index];return sum[3]?[sum[0]/sum[3],sum[1]/sum[3],sum[2]/sum[3]]:item})
 }
 return centroids
}

function borderSamples(image:ImageData,width:number,height:number){
 const band=Math.max(4,Math.round(Math.min(width,height)*0.08))
 const perimeterPixels=Math.max(1,(width*band*2)+(Math.max(0,height-band*2)*band*2))
 const stride=Math.max(1,Math.floor(Math.sqrt(perimeterPixels/8000)))
 const samples:Lab[]=[]
 for(let y=0;y<height;y+=stride){for(let x=0;x<width;x+=stride){if(x>=band&&x<width-band&&y>=band&&y<height-band)continue;const index=(y*width+x)*4;if(image.data[index+3]<200)continue;samples.push(rgbToLab(image.data[index],image.data[index+1],image.data[index+2]))}}
 return samples
}

function buildMaskPreview(canvas:HTMLCanvasElement,centroids:Centroid[],threshold:number){
 const scale=Math.min(1,480/canvas.width,360/canvas.height),preview=document.createElement('canvas')
 preview.width=Math.max(1,Math.round(canvas.width*scale));preview.height=Math.max(1,Math.round(canvas.height*scale))
 const context=preview.getContext('2d',{willReadFrequently:true});if(!context)return''
 context.drawImage(canvas,0,0,preview.width,preview.height)
 const image=context.getImageData(0,0,preview.width,preview.height),marginX=Math.floor(preview.width*0.08),marginY=Math.floor(preview.height*0.08)
 for(let y=0;y<preview.height;y++){for(let x=0;x<preview.width;x++){const index=(y*preview.width+x)*4,inside=x>=marginX&&x<preview.width-marginX&&y>=marginY&&y<preview.height-marginY;const lab=rgbToLab(image.data[index],image.data[index+1],image.data[index+2]),product=inside&&nearestDistance(lab,centroids)>threshold;if(!product){image.data[index]=Math.round(image.data[index]*0.22+198);image.data[index+1]=Math.round(image.data[index+1]*0.22+198);image.data[index+2]=Math.round(image.data[index+2]*0.22+198)}}}
 context.putImageData(image,0,0)
 return preview.toDataURL('image/jpeg',0.82)
}

export function analyzeSegmentedCanvas(canvas:HTMLCanvasElement):UniVisionSegmentation{
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas no disponible')
 const full=context.getImageData(0,0,canvas.width,canvas.height),background=borderSamples(full,canvas.width,canvas.height)
 if(background.length<100)throw new Error('Fondo insuficiente para segmentar la muestra')
 const centroids=kMeansBackground(background),residuals=background.map(sample=>nearestDistance(sample,centroids)),spread=percentile(residuals,0.9),threshold=clamp(spread*1.8+2,6,24)
 const marginX=Math.floor(canvas.width*0.08),marginY=Math.floor(canvas.height*0.08),width=Math.max(1,canvas.width-marginX*2),height=Math.max(1,canvas.height-marginY*2),stride=Math.max(1,Math.floor(Math.sqrt((width*height)/120000)))
 let total=0,count=0,r=0,g=0,b=0,l=0,a=0,labB=0,l2=0,a2=0,b2=0
 for(let y=marginY;y<canvas.height-marginY;y+=stride){for(let x=marginX;x<canvas.width-marginX;x+=stride){const index=(y*canvas.width+x)*4;if(full.data[index+3]<200)continue;total++;const rr=full.data[index],gg=full.data[index+1],bb=full.data[index+2],lab=rgbToLab(rr,gg,bb);if(nearestDistance(lab,centroids)<=threshold)continue;const[ll,aa,bbb]=lab;count++;r+=rr;g+=gg;b+=bb;l+=ll;a+=aa;labB+=bbb;l2+=ll*ll;a2+=aa*aa;b2+=bbb*bbb}}
 const usableRatio=total?count/total:0
 if(count<100||usableRatio<0.03)throw new Error('No se pudo aislar suficiente roe del fondo. Acerca la muestra o usa un fondo más uniforme.')
 const rMean=r/count,gMean=g/count,bMean=b/count,lMean=l/count,aMean=a/count,labBMean=labB/count,lStd=Math.sqrt(Math.max(0,l2/count-lMean*lMean)),aStd=Math.sqrt(Math.max(0,a2/count-aMean*aMean)),bStd=Math.sqrt(Math.max(0,b2/count-labBMean*labBMean)),chroma=Math.sqrt(aMean*aMean+labBMean*labBMean),hueDeg=(Math.atan2(labBMean,aMean)*180/Math.PI+360)%360
 const confidence:SegmentationConfidence=usableRatio<0.1||spread>14?'review':'good'
 return{metrics:{pixelCount:count,rMean,gMean,bMean,lMean,aMean,labBMean,lStd,aStd,bStd,chroma,hueDeg},usableRatio,backgroundThreshold:threshold,backgroundSpread:spread,confidence,previewDataUrl:buildMaskPreview(canvas,centroids,threshold)}
}
