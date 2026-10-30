import { createClient } from '@supabase/supabase-js'
const clean=v=>String(v||'').trim().replace(/^['"]|['"]$/g,'')
const url = clean(import.meta.env.VITE_SUPABASE_URL)
const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY||import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
export const supabase = url && key ? createClient(url, key) : null
let keyType='absente',host=''
try{host=new URL(url).host}catch{}
if(key.startsWith('sb_publishable_'))keyType='publishable (correcte)'
else if(key.startsWith('sb_secret_'))keyType='SECRÈTE : à retirer immédiatement'
else if(key){try{const r=JSON.parse(atob(key.split('.')[1])).role;keyType=r==='anon'?'anon (correcte)':r==='service_role'?'SERVICE_ROLE : à retirer immédiatement':'inconnue'}catch{keyType='inconnue'}}
export const SUPA_INFO={host,keyType}
export const WHATSAPP = import.meta.env.VITE_WHATSAPP || '22940319181'
export const formatXOF = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(/\u202f/g, ' ')
