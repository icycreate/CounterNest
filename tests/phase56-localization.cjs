const fs=require('fs'),path=require('path'),ts=require('typescript'),esbuild=require('esbuild'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const compiled=esbuild.buildSync({entryPoints:[path.join(root,'src/translations.ts')],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text;
const scope={exports:{},module:{exports:{}}};vm.runInNewContext(compiled,scope);const translations=scope.module.exports.translations;
const names=['SetupJourney','SetupPreferences','HelpCenter','EditorDraft','PublicationHistory','MediaLibrary','ConnectionStatus'];
const labels=new Set();
for(const name of names){const file=path.join(root,'src',name+'.tsx'),source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function walk(node){if(ts.isStringLiteral(node)&&/^[A-Z][A-Za-z /&]/.test(node.text)&&!/[{}<>]/.test(node.text)&&!['AbortError'].includes(node.text))labels.add(node.text);ts.forEachChild(node,walk)}walk(source)}
const missing=[];for(const label of labels)for(const language of ['es','zh-TW','zh-CN'])if(!translations[label]?.[language])missing.push(language+': '+label);
assert.deepEqual(missing,[],'Missing phase 5–6 translations');console.log('PASS '+labels.size+' new interface/help labels have all three non-English translations');
