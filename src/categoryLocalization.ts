import {getUiLanguage,tr} from './i18n'
// Closed list only. Unknown business labels, product/variant/option names are never translated.
const known=new Map(['Breads','Bread','Pastries','Cakes','Cookies','Desserts','Drinks','Other','Packaging','Ingredients','Supplies'].map(s=>[s.toLowerCase(),s]));
export function localizeCategory(name:string){const key=known.get(name.trim().toLowerCase());return key&&getUiLanguage()!=='en'?tr(key):name}
