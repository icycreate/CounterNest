// Dedicated dispatch capability: never give a scheduler a database/service-role key.
export async function authorizedWorker(req:Request,secret:string|undefined){
 if(!secret || secret.length<32)return false
 const presented=req.headers.get('authorization')
 if(!presented || presented.length>512)return false
 const digest=async(value:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))
 const [a,b]=await Promise.all([digest(presented),digest('Bearer '+secret)])
 let different=0;for(let i=0;i<a.length;i++)different|=a[i]^b[i]
 return different===0
}
