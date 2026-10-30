import { useEffect, useState } from 'react'
import { supabase, SUPA_INFO } from '../lib/supabase.js'
const toBlob=u=>{const [h,b]=u.split(',');const t=(h.match(/:(.*?);/)||[])[1]||'image/webp';const a=atob(b);const x=new Uint8Array(a.length);for(let i=0;i<a.length;i++)x[i]=a.charCodeAt(i);return new Blob([x],{type:t})}
const up=async u=>{if(!u.startsWith('data:'))return u;const b=toBlob(u);const p=crypto.randomUUID()+'.webp';const {error}=await supabase.storage.from('product-images').upload(p,b,{contentType:b.type||'image/webp'});if(error)throw error;return supabase.storage.from('product-images').getPublicUrl(p).data.publicUrl}
const slug=n=>n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
export function Diag(){const [who,setWho]=useState('…');const [prods,setProds]=useState(null);const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false)
 let local=[];try{local=(JSON.parse(localStorage.getItem('tp_admin_products'))||[]).filter(r=>r.name&&!/\(exemple\)/i.test(r.name))}catch{}
 const load=async()=>{if(!supabase)return setWho('Supabase non configuré')
  const {data:{session}}=await supabase.auth.getSession();if(!session)setWho('non connecté')
  else{const {data}=await supabase.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle();setWho(session.user.email+(data?.is_admin?' (administrateur)':' (PAS administrateur : les enregistrements seront refusés)'))}
  const r=await supabase.from('products').select('id,name,is_active').order('created_at',{ascending:false}).limit(30);setProds(r.error?'erreur : '+r.error.message:r.data)}
 useEffect(()=>{load()},[])
 const test=async()=>{setBusy(true);const {data,error}=await supabase.from('products').insert({name:'TEST (à supprimer)',price_xof:1,is_active:false}).select('id').single()
  if(error)setMsg('Écriture REFUSÉE : '+error.message);else{const d=await supabase.from('products').delete().eq('id',data.id);setMsg(d.error?'Écriture réussie, suppression refusée : '+d.error.message:'Écriture, lecture et suppression réussies : l’enregistrement fonctionne.')};setBusy(false)}
 const imp=async()=>{setBusy(true);setMsg('Import en cours…');let n=0
  try{const cats=(await supabase.from('categories').select('id,name')).data||[]
   for(const r of local){let cid=null;if(r.cat){let c=cats.find(x=>x.name===r.cat);if(!c){const {data,error}=await supabase.from('categories').insert({name:r.cat,slug:slug(r.cat)}).select('id,name').single();if(error)throw error;c=data;cats.push(c)}cid=c.id}
    const imgs=[];for(const u of (r.images||[]).filter(Boolean))imgs.push(await up(u))
    const specs=(r.specs||'').split('\n').map(l=>l.split(':')).filter(a=>a[0].trim()&&a[1]).map(a=>[a[0].trim(),a.slice(1).join(':').trim()])
    const {error}=await supabase.from('products').insert({name:r.name,category_id:cid,description:r.desc||null,price_xof:+r.price,old_price_xof:r.old?+r.old:null,shipping_note:r.ship||null,image_url:imgs[0]||null,images:imgs,specs,is_active:r.active!==false,is_new:!!r.isNew,is_qualified:!!r.qualified,weight_kg:r.weight?+r.weight:null,lead_time_days:r.lead?+r.lead:null,variants:(r.variants||'').split(',').map(v=>v.trim()).filter(Boolean),stock_status:r.stock||'Disponible'})
    if(error)throw error;n++}
   setMsg(n+' produit(s) importé(s) dans la base.')}catch(e){setMsg('Import interrompu après '+n+' produit(s) : '+(e.message||e))}
  setBusy(false);load()}
 return <div className="legal"><h1 className="ptitle">Diagnostic</h1><ul><li>Supabase configuré : <b>{supabase?'oui':'non'}</b></li><li>Adresse du projet : {SUPA_INFO.host||'absente'}</li><li>Type de clé : {SUPA_INFO.keyType}</li><li>Compte connecté : {who}</li>
 <li>Produits dans la base : {Array.isArray(prods)?<b>{prods.length}</b>:prods||'…'}{Array.isArray(prods)&&prods.length>0&&<ul>{prods.map(p=><li key={p.id}>{p.name} {p.is_active?'':'(masqué)'}</li>)}</ul>}</li>
 <li>Produits gardés seulement dans CE navigateur (ancienne démo) : <b>{local.length}</b>{local.length>0&&<ul>{local.map((r,i)=><li key={i}>{r.name}</li>)}</ul>}</li></ul>
 {supabase&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="btn btn-secondary" disabled={busy} onClick={test}>Tester l’enregistrement</button>{local.length>0&&<button className="btn btn-primary" disabled={busy} onClick={imp}>Importer ces {local.length} produit(s) dans la base</button>}</div>}
 {msg&&<p role="status" className={/REFUS|interrompu|erreur/i.test(msg)?'err':'okmsg'}>{msg}</p>}<p className="note">Page temporaire, à supprimer avant le lancement. Connectez-vous d’abord sur /admin pour tester l’écriture.</p></div>}
