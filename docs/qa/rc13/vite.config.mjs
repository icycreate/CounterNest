import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import {mergeConfig} from '../../../node_modules/vite/dist/node/index.js'
import base from '../../../vite.config.ts'
export default mergeConfig(base,{root:fileURLToPath(new URL('../../../',import.meta.url)),plugins:[{name:'visual-qa-only',enforce:'pre',transformIndexHtml(html,ctx){if(ctx.originalUrl?.includes('qa_screen=contrast'))return html.replace('/src/main.tsx','/qa/readability.tsx');if(ctx.originalUrl?.includes('qa_screen='))return html.replace('/src/main.tsx','/qa/rc12Screens.tsx');return html.replace('<meta charset="UTF-8" />','<meta charset="UTF-8" /><script>try{localStorage.setItem("counternest.appearance",new URLSearchParams(location.search).get("qa_appearance")||"system")}catch{}</script>')},load(id){if(id.replaceAll('\\','/').endsWith('/src/lib/supabase.ts'))return fs.readFileSync(new URL('./fixture-client.js',import.meta.url),'utf8')}}],server:{host:'127.0.0.1',port:5193,strictPort:true}})



