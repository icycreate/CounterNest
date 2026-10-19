/** Staff Catalogue shares a path with public links; only token-bearing links are public. */
export function isPublicCatalogueRoute(pathname:string,search:string){const path=pathname.replace(/\/$/,''),params=new URLSearchParams(search);return path==='/catalogue-display'||path==='/catalogue'&&params.has('token')||params.has('customer_display')}
