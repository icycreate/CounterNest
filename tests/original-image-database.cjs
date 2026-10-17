const assert=require('assert');
module.exports=async({db,check,scalar,rejects})=>{
 await db.exec('reset role');const shop=await scalar("insert into shops(name) values('Image Bakery') returning id"),other=await scalar("insert into shops(name) values('Foreign Image Bakery') returning id"),admin=await scalar("insert into auth.users(id,email) values(gen_random_uuid(),'image-admin@test.example') returning id");
 await db.query("insert into staff_profiles(user_id,shop_id,display_name,role) values($1,$2,'Image admin','admin')",[admin,shop]);await db.query("select set_config('test.user',$1,false)",[admin]);
 const product=await scalar("insert into products(shop_id,name,price,stock,catalogue_visible) values($1,'Original Cake',10,2,true) returning id",[shop]);await scalar('select ensure_customer_display_config()');const token=await scalar('select access_token from customer_display_configs where shop_id=$1',[shop]);const path=shop+'/'+product+'/',url='https://storage.example/storage/v1/object/public/catalogue-media/';
 await db.query("insert into storage.objects(bucket_id,name) values('catalogue-media',$1),('catalogue-media',$2),('catalogue-media',$3)",[path+'original.png',path+'crop.jpg',other+'/foreign.png']);
 await check('Original and cropped photos persist separately without exposing uploader metadata',async()=>{
  await scalar('select save_catalogue_media($1,$2)',[product,JSON.stringify([{url:url+path+'crop.jpg',original_image:url+path+'original.png',cropped_catalogue_image:url+path+'crop.jpg',private_cost:12345}])]);
  assert.equal(await scalar('select original_image from products where id=$1',[product]),url+path+'original.png');assert.equal(await scalar('select image_url from products where id=$1',[product]),url+path+'crop.jpg');
  const adminPayload=await scalar('select get_catalogue_admin()');assert.equal(adminPayload.products.find(p=>p.id===product).original_image,url+path+'original.png');
  await db.exec('set role anon');const payload=await scalar('select get_commercial_catalogue($1)',[token]),p=payload.products.find(p=>p.id===product);assert.equal(p.original_image,url+path+'original.png');assert.equal(p.cropped_catalogue_image,url+path+'crop.jpg');assert(!JSON.stringify(payload).includes('private_cost'));assert(!JSON.stringify(payload).includes('foreign.png'));await rejects('select catalogue_image_projection($1)',[JSON.stringify({products:[{id:product}]})],/permission denied/);await rejects('select get_commercial_catalogue_before_original_images($1)',[token],/permission denied/);await db.exec('reset role');
 });
 await check('Gallery rejects foreign originals and preserves existing saved photos on failure',async()=>{
  await rejects('select save_catalogue_media($1,$2)',[product,JSON.stringify([{url:url+path+'crop.jpg',original_image:url+other+'/foreign.png'}])],/Invalid catalogue media/);assert.equal(await scalar('select original_image from products where id=$1',[product]),url+path+'original.png');
 });
};
