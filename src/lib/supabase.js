import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient(url, key) : null
export const WHATSAPP = import.meta.env.VITE_WHATSAPP || '22940319181'
export const formatXOF = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(/\u202f/g, ' ')
