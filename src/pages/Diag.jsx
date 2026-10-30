import { useEffect, useState } from 'react'
import { supabase, SUPA_INFO } from '../lib/supabase.js'
export function Diag(){const [r,setR]=useState('en cours…')
 useEffect(()=>{if(!supabase)return setR('non testé : Supabase n’est pas configuré dans cette version du site.')
  supabase.from('products').select('id',{count:'exact',head:true}).then(({count,error})=>setR(error?'erreur : '+error.message:'connexion réussie, produits dans la base : '+count))},[])
 return <div className="legal"><h1 className="ptitle">Diagnostic</h1><ul><li>Supabase configuré : <b>{supabase?'oui':'non'}</b></li><li>Adresse du projet : {SUPA_INFO.host||'absente'}</li><li>Type de clé : {SUPA_INFO.keyType}</li><li>Test de la base : {r}</li></ul><p className="note">Page temporaire, à supprimer avant le lancement.</p></div>}
