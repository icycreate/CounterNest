import React from 'react'
import {createRoot} from 'react-dom/client'
import {BrandLogo} from '../src/BrandLogo'
import BootSplash from '../src/BootSplash'
import {createBootLifecycle} from '../src/startupLifecycle'
import {useSharedTheme} from '../src/sharedTheme'
import '../src/styles.css'
import '../src/buttons.css'
import '../src/sharedTheme.css'
import '../src/release12.css'
import '../src/branding.css'
import '../src/accessibility.css'
const p=new URLSearchParams(location.search),mode=p.get('qa_appearance')||'light',view=p.get('view')||'matrix'
document.documentElement.dataset.bootTheme=mode==='dark'||mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'
const life=createBootLifecycle({startedAt:0,clock:{now:()=>1500,setTimer:()=>0,clearTimer(){}}})
function Preview(){useSharedTheme({primary:'#ad4b20',background:'#f8efe6',text:'#33251e'},mode);return view==='boot'?<BootSplash lifecycle={life}/>:<main style={{padding:24,background:'var(--surface)',color:'var(--text)'}}><h1>RC14 branding verification</h1><p>Actual shared components · isolated sample data</p><div style={{display:'grid',gap:24,gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))'}}>{(['full','horizontal','icon'] as const).map(variant=><section key={variant}><h2>{variant}</h2><BrandLogo mode="platform" variant={variant} size={variant==='icon'?64:280}/></section>)}</div><h2>Business logo compatibility</h2><BrandLogo logoUrl="/missing-test-business-logo.png" businessName="Broken logo fallback"/><BrandLogo logoUrl={'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80"><rect width="300" height="80" fill="#026b81"/><text x="20" y="55" font-family="Arial" font-size="32" fill="white">Example Bakery</text></svg>')} businessName="Example Bakery" size={280}/></main>}
document.getElementById('boot-root')?.remove();document.getElementById('root')?.removeAttribute('inert');document.getElementById('root')?.removeAttribute('aria-hidden');createRoot(document.getElementById('root')!).render(<Preview/>);
