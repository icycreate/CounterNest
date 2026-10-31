const allowedOrigin = 'https://counternest.vercel.app'
const allowedOrigins = new Set([allowedOrigin,'https://counternest-icycreate.vercel.app','https://counternest-git-main-icycreate.vercel.app'])
export function cors(req:Request){
 const origin=req.headers.get('origin')
 return {'Access-Control-Allow-Origin':origin&&allowedOrigins.has(origin)?origin:allowedOrigin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'}
}
export function reply(req:Request,body:unknown,status=200){return Response.json(body,{status,headers:cors(req)})}
export async function readBody(req:Request,max=40000){
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('Invalid request')
 if(Number(req.headers.get('content-length'))>max)throw Error('Invalid request')
 const reader=req.body?.getReader();if(!reader)throw Error('Invalid request')
 let size=0;const chunks:Uint8Array[]=[]
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('Invalid request')}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
}
export const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
