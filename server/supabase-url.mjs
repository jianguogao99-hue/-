// Supabase's Data API page also exposes /rest/v1 endpoints. The SDK needs
// the project base URL because it appends /auth/v1, /rest/v1, etc itself.
export function normalizeSupabaseUrl(value){
 const url=new URL(String(value||'').trim());
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Supabase configuration must use the HTTPS project URL, without credentials or query parameters.');
 const path=url.pathname.replace(/\/+$/,'');
 if(path&&!['/rest/v1','/auth/v1','/storage/v1','/functions/v1'].includes(path))throw Error('Use the Supabase project URL, not an API endpoint or dashboard URL.');
 return url.origin;
}
