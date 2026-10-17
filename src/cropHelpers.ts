export const IMAGE_MAX_BYTES=12*1024*1024
export function validateImageFile(file:Pick<File,'type'|'size'>){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<=0||file.size>IMAGE_MAX_BYTES)throw new Error('Choose a JPG, PNG or WebP image under 12 MB.')
}
export type CropRectangle={x:number;y:number;width:number;height:number}
/** A normalized framing offset remains inside the original at every zoom level. */
export function cropRectangle(width:number,height:number,aspect=3/4,zoom=1,x=0.5,y=0.5):CropRectangle{
 if(![width,height,aspect,zoom,x,y].every(Number.isFinite)||width<=0||height<=0||aspect<=0)throw new Error('Invalid image dimensions.')
 const fitWidth=Math.min(width,height*aspect),fitHeight=fitWidth/aspect
 const factor=Math.max(1,Math.min(4,zoom)),w=fitWidth/factor,h=fitHeight/factor
 return {x:(width-w)*Math.max(0,Math.min(1,x)),y:(height-h)*Math.max(0,Math.min(1,y)),width:w,height:h}
}
export async function renderImageCrop(file:File,aspect:number,zoom:number,x:number,y:number):Promise<Blob>{
 validateImageFile(file)
 const bitmap=await createImageBitmap(file)
 try{
  const crop=cropRectangle(bitmap.width,bitmap.height,aspect,zoom,x,y),scale=Math.min(1,1600/Math.max(crop.width,crop.height))
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(crop.width*scale));canvas.height=Math.max(1,Math.round(crop.height*scale))
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable in this browser.')
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height)
  for(const quality of [0.88,0.76,0.62]){
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))
   if(blob&&blob.size<=2*1024*1024)return blob
  }
  throw new Error('Image remains too large. Choose a smaller photo.')
 }finally{bitmap.close()}
}
