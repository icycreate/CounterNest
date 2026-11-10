import {useEffect,useRef,useState} from 'react'
import {App as NativeApp} from '@capacitor/app'
import {BrandLogo} from './BrandLogo'
import {Button} from './Button'
import {LanguageSelector,tr,useUiLanguage} from './i18n'
import {useSharedTheme,type AppearanceMode} from './sharedTheme'
import {notifyStartupReady} from './startupLifecycle'
import {isAndroid} from './native/platform'
import {fetchApprovedRelease,hasNewerRelease,releaseOrigin,type AndroidRelease} from './androidRelease'
import './androidDownload.css'

export function AndroidReleaseAccess(){return <section className="panel"><h2>{tr('CounterNest for Android')}</h2><p>{tr('Official Android downloads and update instructions.')}</p><a href="/download">{tr('Download & updates')}</a></section>}

export default function AndroidDownload(){
 const language=useUiLanguage();const [appearance,setAppearance]=useState<AppearanceMode>(()=>{try{const v=localStorage.getItem('counternest.download.appearance');return v==='dark'||v==='light'?v:'system'}catch{return 'system'}})
 useSharedTheme(null,appearance,'counternest.catalogue-theme.download')
 const [release,setRelease]=useState<AndroidRelease|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(false),[installed,setInstalled]=useState<number|null>(null),[nativeUnknown,setNativeUnknown]=useState(false)
 const controller=useRef<AbortController|null>(null)
 async function check(){
  controller.current?.abort();const next=new AbortController();controller.current=next;setBusy(true);setError(false);setRelease(null)
  const timeout=setTimeout(()=>next.abort(),15000)
  try{const result=await fetchApprovedRelease(next.signal,isAndroid()?releaseOrigin:window.location.origin);if(controller.current===next)setRelease(result)}catch{if(controller.current===next)setError(true)}finally{clearTimeout(timeout);if(controller.current===next)setBusy(false)}
 }
 useEffect(()=>{notifyStartupReady();void check();let active=true;if(isAndroid())void NativeApp.getInfo().then(info=>{const code=Number(info.build);if(active){if(Number.isSafeInteger(code)&&code>0)setInstalled(code);else setNativeUnknown(true)}}).catch(()=>{if(active)setNativeUnknown(true)});return()=>{active=false;controller.current?.abort();controller.current=null}},[])
 const current=release&&installed!==null&&!hasNewerRelease(release,installed)
 return <main className="android-download">
  <header className="download-top"><a href="/" aria-label="CounterNest"><BrandLogo mode="platform" variant="horizontal"/></a><LanguageSelector id="download-language"/></header>
  <section className="download-hero"><span className="download-eyebrow">CounterNest POS · Android</span><h1>{tr('Your workspace, wherever you work.')}</h1><p>{tr('Sales, inventory and order alerts on your Android phone.')}</p></section>
  <section className="panel download-release" aria-busy={busy}>
   <h2>{tr('CounterNest for Android')}</h2>
   <p role="status">{busy?tr('Checking approved releases…'):error?tr('Unable to check releases. Connect to the internet and try again.'):!release?tr('No production APK is approved for download yet.'):current?tr('Your installed version is up to date.'):installed!==null?tr('An approved update is available.'):tr('Latest approved release')}</p>
   {installed!==null&&<p>{tr('Installed build')}: {installed}</p>}{nativeUnknown&&<p>{tr('Installed version could not be read. Compare the build number in Android App info before updating.')}</p>}
   {release&&<><dl>{[[tr('Version'),release.versionName],[tr('Build'),String(release.versionCode)],[tr('File size'),(release.sizeBytes/1024/1024).toFixed(1)+' MB'],[tr('Release date'),release.releasedAt],[tr('Requires Android'),release.minAndroid+'+']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {!current&&!nativeUnknown&&<a className="download-apk" href={release.url} download={release.fileName} rel="noreferrer">{tr('Download APK')}</a>}
    <h3>{tr('Release notes')}</h3><p className="download-notes">{release.notes[language]??release.notes.en}</p><details><summary>{tr('Verify this download')}</summary><p>{release.fileName}</p><p>SHA-256</p><code>{release.sha256}</code><p>{tr('Signing certificate')}</p><code>{release.certificateSha256}</code></details></>}
   <Button disabled={busy} onClick={()=>void check()}>{tr('Check for Updates')}</Button>
   {!release&&!busy&&<p><a href="/">{tr('Continue in the web app')}</a></p>}
  </section>
  <section className="panel"><h2>{tr('Install on Android')}</h2><ol className="download-steps">
   <li><strong>{tr('Download the approved APK')}</strong><p>{tr('Open this page on your Android phone and tap Download APK. Keep the downloaded file intact.')}</p></li>
   <li><strong>{tr('Open the downloaded file')}</strong><p>{tr('Use your browser downloads or Files app. If Android asks, allow this browser or Files app to install unknown apps only if you trust this official download.')}</p></li>
   <li><strong>{tr('Review and approve installation')}</strong><p>{tr('Keep Play Protect enabled. Do not bypass a security warning. Review the app name, then approve installation in Android. You can turn off the install permission afterward.')}</p></li>
   <li><strong>{tr('Open CounterNest and sign in')}</strong><p>{tr('Use your existing CounterNest account. Notification permission is optional and requested separately.')}</p></li>
  </ol></section>
  <section className="panel"><h2>{tr('Updating safely')}</h2><p>{tr('Use Check for Updates to find a newer approved version. Install it over the existing app only when Android accepts the update. Do not uninstall to resolve a signing mismatch; contact your administrator first.')}</p><p>{tr('Android always asks you to approve installation. CounterNest never installs updates silently.')}</p><p>{tr('This APK is for Android only. On iPhone, iPad or a computer, use the web app.')}</p></section>
  <footer><label>{tr('Appearance')}<select value={appearance} onChange={e=>{const value=e.target.value as AppearanceMode;setAppearance(value);try{localStorage.setItem('counternest.download.appearance',value)}catch{}}}>{(['system','light','dark'] as const).map(v=><option key={v} value={v}>{tr(v==='system'?'System':v==='light'?'Light':'Dark')}</option>)}</select></label><a href="/">{tr('Open CounterNest')}</a></footer>
 </main>
}
