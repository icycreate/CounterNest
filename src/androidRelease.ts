// No approved production signing identity exists yet. Pin its public SHA-256
// fingerprint through review before accepting any downloadable release.
export const approvedSigningCertificate: string | null = null
export const releaseOrigin = 'https://counternest.vercel.app'
const apkBase = 'https://onfhqlsovqkwrmjuuauy.supabase.co/storage/v1/object/public/app-releases/'
export type AndroidRelease = {
 packageId: 'com.counternest.pos'; versionCode: number; versionName: string;
 fileName: string; sizeBytes: number; sha256: string; certificateSha256: string;
 releasedAt: string; minAndroid: string; notes: Record<string,string>; url: string;
}
export function parseApprovedRelease(value: unknown, certificate = approvedSigningCertificate): AndroidRelease | null {
 const m=value as {schemaVersion?:unknown;release?:unknown}
 if(!m||m.schemaVersion!==1)throw new Error('Invalid release manifest')
 if(m.release===null)return null
 const r=m.release as AndroidRelease & {approved?:boolean;buildType?:string}
 if(!certificate||!r||r.approved!==true||r.buildType!=='release'||r.packageId!=='com.counternest.pos'||
  !Number.isSafeInteger(r.versionCode)||r.versionCode<=0||typeof r.versionName!=='string'||!/^\d+\.\d+\.\d+(?:[.-][A-Za-z0-9.-]+)?$/.test(r.versionName)||
  r.fileName!==`CounterNest-${r.versionName}-${r.versionCode}.apk`||
  !Number.isSafeInteger(r.sizeBytes)||r.sizeBytes<=0||r.sizeBytes>50*1024*1024||
  !/^[a-f0-9]{64}$/.test(r.sha256)||r.certificateSha256!==certificate||
  !/^\d{4}-\d{2}-\d{2}$/.test(r.releasedAt)||!Number.isFinite(Date.parse(r.releasedAt))||
  typeof r.minAndroid!=='string'||!/^\d+(?:\.\d+)?$/.test(r.minAndroid)||
  !r.notes||!['en','es','zh-TW','zh-CN'].every(k=>typeof r.notes[k]==='string'&&r.notes[k].length>0&&r.notes[k].length<=6000)||
  r.url!==apkBase+r.versionCode+'/'+r.fileName)throw new Error('Unapproved or invalid release')
 return r
}
export async function fetchApprovedRelease(signal?:AbortSignal,origin=releaseOrigin):Promise<AndroidRelease|null>{
 const response=await fetch(origin+'/releases/approved.json',{cache:'no-store',credentials:'omit',signal})
 if(!response.ok)throw new Error('Release check failed')
 return parseApprovedRelease(await response.json())
}
export function hasNewerRelease(release:AndroidRelease,installedCode:number){return Number.isSafeInteger(installedCode)&&release.versionCode>installedCode}
