// Generates a candidate only; never uploads or marks a release approved.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const [apk,notesFile,output]=process.argv.slice(2);
function fail(message){throw new Error(message)}
try{
 if(!apk||!notesFile||!output)fail('Usage: node scripts/verify-android-release.cjs APK NOTES_JSON CANDIDATE_JSON')
 const buildTools=process.env.CN_ANDROID_BUILD_TOOLS;
 const certificate=(process.env.CN_ANDROID_CERT_SHA256||'').toLowerCase();
 const debug='3ba3111813512552497bcf5f9f069b57b816caefd91ab5d76be1c177a2f6d044';
 if(!buildTools||!/^[a-f0-9]{64}$/.test(certificate)||certificate===debug)fail('An approved production certificate fingerprint and build-tools directory are required; debug identity is forbidden.')
 const java=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin','java.exe'):'java';
 const signing=execFileSync(java,['-jar',path.join(buildTools,'lib','apksigner.jar'),'verify','--verbose','--print-certs',apk],{encoding:'utf8'});
 if(/CN=Android Debug/i.test(signing))fail('Debug certificate rejected')
 const certs=[...signing.matchAll(/Signer #\d+ certificate SHA-256 digest: ([a-f0-9]{64})/gi)].map(m=>m[1].toLowerCase());
 if(certs.length!==1||certs[0]!==certificate)fail('Signing certificate does not match approved production identity')
 const badging=execFileSync(path.join(buildTools,process.platform==='win32'?'aapt.exe':'aapt'),['dump','badging',apk],{encoding:'utf8'});
 const pkg=badging.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
 if(!pkg||pkg[1]!=='com.counternest.pos'||/application-debuggable/.test(badging))fail('Unexpected package or debuggable APK')
 const notes=JSON.parse(fs.readFileSync(notesFile,'utf8'));
 if(!['en','es','zh-TW','zh-CN'].every(k=>typeof notes[k]==='string'&&notes[k].trim()))fail('Release notes in all four languages are required')
 const versionCode=Number(pkg[2]),versionName=pkg[3],fileName=`CounterNest-${versionName}-${versionCode}.apk`,sizeBytes=fs.statSync(apk).size;
 if(!Number.isSafeInteger(versionCode)||versionCode<=60502||!/^\d+\.\d+\.\d+$/.test(versionName)||sizeBytes>50*1024*1024)fail('Expected a new version code, stable version name, and APK under 50 MiB')
 const candidate={schemaVersion:1,release:{approved:false,buildType:'release',packageId:pkg[1],versionCode,versionName,fileName,sizeBytes,sha256:crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex'),certificateSha256:certificate,releasedAt:null,minAndroid:'7.0',notes,url:`https://onfhqlsovqkwrmjuuauy.supabase.co/storage/v1/object/public/app-releases/${versionCode}/${fileName}`},verification:{signature:true,debuggable:false,minSdk:Number(badging.match(/sdkVersion:'(\d+)'/)?.[1]),cleanInstall:false,upgrade:false,authenticatedLogin:false,downloadIntegrity:false}};
 if(candidate.verification.minSdk!==24)fail('Unexpected minimum Android SDK; review compatibility metadata')
 fs.writeFileSync(output,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
 console.log('Candidate verified. Not approved, uploaded or published. Complete device/download tests and release review first.');
}catch(e){console.error(e.message);process.exit(1)}
