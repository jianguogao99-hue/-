import assert from 'node:assert/strict';import {normalizeSupabaseUrl as normalize} from '../server/supabase-url.mjs';
for(const suffix of ['','/','/rest/v1','/rest/v1/','/auth/v1/'])assert.equal(normalize(' https://example.supabase.co'+suffix+' '),'https://example.supabase.co');
for(const url of ['http://example.supabase.co','https://user:pass@example.supabase.co','https://example.supabase.co/dashboard','https://example.supabase.co?key=anything'])assert.throws(()=>normalize(url));
console.log('PASS: copied Data API endpoint resolves to project base; unsafe/unrecognized URLs rejected');
