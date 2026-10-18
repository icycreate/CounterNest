export type GalleryPhoto={url:string;original_image?:string;cropped_catalogue_image?:string;caption?:string}
export function productGallery(product:{catalogue_media?:GalleryPhoto[];image_url?:string|null;original_image?:string|null;cropped_catalogue_image?:string|null}):GalleryPhoto[]{
 const photos:GalleryPhoto[]=[];
 for(const p of product.catalogue_media??[]){const original=p.original_image||p.url;if(!original||photos.some(x=>x.original_image===original||x.url===p.url))continue;photos.push({...p,url:p.url||original,original_image:original,cropped_catalogue_image:p.cropped_catalogue_image||p.url||original})}
 if(product.image_url&&!photos.some(x=>[x.url,x.original_image,x.cropped_catalogue_image].includes(product.image_url!)))photos.unshift({url:product.cropped_catalogue_image||product.image_url,original_image:product.original_image||product.image_url,cropped_catalogue_image:product.cropped_catalogue_image||product.image_url});
 return photos;
}
