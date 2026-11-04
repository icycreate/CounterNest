const fs=require('fs'),path=require('path'),sharp=require('sharp');
const source='public/counternest-icon-transparent.svg',base='android/app/src/main/res';
async function layer(size,art,background){return sharp({create:{width:size,height:size,channels:4,background}}).composite([{input:await sharp(source).resize(art,art,{fit:'contain'}).png().toBuffer(),gravity:'centre'}]).png().toBuffer()}
(async()=>{for(const[density,scale]of Object.entries({mdpi:1,hdpi:1.5,xhdpi:2,xxhdpi:3,xxxhdpi:4})){
 const dir=path.join(base,'mipmap-'+density);fs.mkdirSync(dir,{recursive:true});const size=48*scale;
 const icon=await layer(size,Math.round(size*.88),'#fff7ef');fs.writeFileSync(path.join(dir,'ic_launcher.png'),icon);
 const circle=Buffer.from('<svg width="'+size+'" height="'+size+'"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+size/2+'" fill="white"/></svg>');
 fs.writeFileSync(path.join(dir,'ic_launcher_round.png'),await sharp(icon).composite([{input:circle,blend:'dest-in'}]).png().toBuffer());
 fs.writeFileSync(path.join(dir,'ic_launcher_foreground.png'),await layer(108*scale,64*scale,{r:0,g:0,b:0,alpha:0}));
 }
 for(const[folder,color]of [['values','#fff7ef'],['values-night','#211b17']]){fs.mkdirSync(path.join(base,folder),{recursive:true});fs.writeFileSync(path.join(base,folder,'counternest_colors.xml'),'<resources><color name="counternest_splash_background">'+color+'</color></resources>')}
 fs.writeFileSync(path.join(base,'values/ic_launcher_background.xml'),'<resources><color name="ic_launcher_background">#fff7ef</color></resources>');
 for(const[folder,asset]of [['drawable','public/counternest-icon-transparent.svg'],['drawable-night','public/counternest-icon-light.svg']]){fs.mkdirSync(path.join(base,folder),{recursive:true});await sharp(asset).resize(288,288).extend({top:72,bottom:72,left:72,right:72,background:{r:0,g:0,b:0,alpha:0}}).png().toFile(path.join(base,folder,'counternest_splash.png'))}
 console.log('Generated launcher, adaptive safe-zone layers and themed splash from official web icon.');
})().catch(e=>{console.error(e);process.exit(1)});
