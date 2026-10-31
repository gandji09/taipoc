import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { formatXOF, supabase } from '../lib/supabase.js'
const TABS=[['/admin','Tableau de bord'],['/admin/commandes','Commandes'],['/admin/paiements','Paiements'],['/admin/produits','Produits'],['/admin/clients','Clients'],['/admin/livreurs','Livraisons'],['/admin/messages','Messages'],['/admin/temoignages','Témoignages'],['/admin/annonces','Annonces'],['/admin/securite','Sécurité']]
const Er=({m})=>m?<span className="err" role="alert">{m}</span>:null
function AdminLogin(){const [f,setF]=useState({email:'',pw:''});const [err,setErr]=useState('');const [busy,setBusy]=useState(false)
 const go=async ev=>{ev.preventDefault();setBusy(true);setErr('');const {error}=await supabase.auth.signInWithPassword({email:f.email.trim(),password:f.pw});setBusy(false);if(error)setErr('E-mail ou mot de passe incorrect.')}
 return <form className="form narrow" onSubmit={go}><h1 className="ptitle">Administration</h1><p className="note">Accès réservé à l’équipe TAIPOC.</p><label>E-mail<input type="email" autoComplete="username" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></label>
 <label>Mot de passe<input type="password" autoComplete="current-password" value={f.pw} onChange={e=>setF({...f,pw:e.target.value})}/></label><Er m={err}/><button className="btn btn-primary block" disabled={busy}>Se connecter</button></form>}
function MfaVerify({done}){const [code,setCode]=useState('');const [err,setErr]=useState('')
 const go=async ev=>{ev.preventDefault();setErr('');const {data:fs}=await supabase.auth.mfa.listFactors();const fac=fs?.totp?.[0];if(!fac)return setErr('Aucun appareil de vérification trouvé.')
  const {data:ch,error:e1}=await supabase.auth.mfa.challenge({factorId:fac.id});if(e1)return setErr(e1.message);const {error}=await supabase.auth.mfa.verify({factorId:fac.id,challengeId:ch.id,code:code.trim()});if(error)return setErr('Code incorrect ou expiré.');done()}
 return <form className="form narrow" onSubmit={go}><h1 className="ptitle">Vérification en deux étapes</h1><p>Entrez le code à 6 chiffres affiché par votre application d’authentification.</p><label>Code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label><Er m={err}/><button className="btn btn-primary block">Valider</button>
 <button type="button" className="lnk" onClick={()=>supabase.auth.signOut()}>Changer de compte</button></form>}
function MfaEnroll({done}){const [q,setQ]=useState(null);const [code,setCode]=useState('');const [err,setErr]=useState('')
 useEffect(()=>{(async()=>{const {data:fs}=await supabase.auth.mfa.listFactors();for(const f of (fs?.all||[]))if(f.status==='unverified')await supabase.auth.mfa.unenroll({factorId:f.id})
  const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'TAIPOC '+Date.now()});if(error)return setErr('Activation impossible : '+error.message);setQ(data)})()},[])
 const go=async ev=>{ev.preventDefault();setErr('');const {data:ch,error:e1}=await supabase.auth.mfa.challenge({factorId:q.id});if(e1)return setErr(e1.message);const {error}=await supabase.auth.mfa.verify({factorId:q.id,challengeId:ch.id,code:code.trim()});if(error)return setErr('Code incorrect ou expiré.');done()}
 return <form className="form narrow" onSubmit={go}><h1 className="ptitle">Activer la double authentification</h1><p>Obligatoire pour l’administration. 1) Installez Google Authenticator, Microsoft Authenticator ou Authy. 2) Scannez ce code. 3) Entrez le code à 6 chiffres affiché.</p>
 {q&&<><img src={q.totp.qr_code} alt="Code QR à scanner avec l’application d’authentification" width="200" height="200"/><p className="note">Si vous ne pouvez pas scanner, saisissez cette clé : <b style={{wordBreak:'break-all'}}>{q.totp.secret}</b></p></>}
 <label>Code à 6 chiffres<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label><Er m={err}/><button className="btn btn-primary block" disabled={!q}>Activer</button></form>}
export function AdminLayout(){const [st,setSt]=useState('loading')
 const check=async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session)return setSt('login')
  const {data:p}=await supabase.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle();if(!p?.is_admin)return setSt('denied')
  const {data:a}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();setSt(a.currentLevel==='aal2'?'ok':a.nextLevel==='aal2'?'verify':'enroll')}
 useEffect(()=>{check();const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(check,0)});return()=>subscription.unsubscribe()},[])
 if(st==='loading')return <div className="skeleton" style={{height:120}}/>
 if(st==='login')return <AdminLogin/>
 if(st==='verify')return <MfaVerify done={check}/>
 if(st==='enroll')return <MfaEnroll done={check}/>
 if(st==='denied')return <div className="empty"><h1 className="ptitle">Accès refusé</h1><p>Ce compte n’est pas administrateur.</p><button className="btn btn-secondary" onClick={()=>supabase.auth.signOut()}>Se déconnecter</button></div>
 return <><h1 className="ptitle">Administration</h1><nav className="tabs" aria-label="Administration">{TABS.map(([t,n])=><NavLink key={t} to={t} end>{n}</NavLink>)}<button className="lnk" onClick={()=>supabase.auth.signOut()}>Déconnexion</button></nav><Outlet/></>}
export function AdminSecurity(){const [pw,setPw]=useState('');const [m,setM]=useState('')
 const chg=async ev=>{ev.preventDefault();if(pw.length<12)return setM('Le mot de passe administrateur doit contenir au moins 12 caractères.');const {error}=await supabase.auth.updateUser({password:pw});setM(error?'Changement impossible : '+error.message:'Mot de passe modifié.');if(!error)setPw('')}
 return <div className="form narrow"><h2>Sécurité du compte</h2><p>Double authentification : <b>active</b>. Elle est exigée par la base de données pour toute action d’administration.</p>
 <form className="form" onSubmit={chg}><label>Nouveau mot de passe (12 caractères minimum)<input type="password" autoComplete="new-password" value={pw} onChange={e=>setPw(e.target.value)}/></label><button className="btn btn-secondary">Changer le mot de passe</button>{m&&<p role="status" className={m.startsWith('Mot')?'okmsg':'err'}>{m}</p>}</form>
 <button className="btn btn-secondary" onClick={()=>supabase.auth.signOut({scope:'global'})}>Déconnecter tous mes appareils</button></div>}

const EMPTY={name:'',cat:'',price:'',old:'',variants:'',sizes:'',desc:'',specs:'',images:['','',''],supUrl:'',supCost:'',weight:'',lead:'',stock:'Disponible',ship:'Hors frais d’expédition',active:true,isNew:false,qualified:false}
const IMG_OK=['image/jpeg','image/png','image/webp']
const pad=a=>[a?.[0]||'',a?.[1]||'',a?.[2]||'']
const toForm=(r,pv)=>({...EMPTY,id:r.id,name:r.name,cat:r.category_id||'',price:r.price_xof,old:r.old_price_xof||'',variants:(r.variants||[]).join(', '),sizes:(r.sizes||[]).join(', '),desc:r.description||'',specs:(r.specs||[]).map(([k,v])=>k+': '+v).join('\n'),
 images:pad(r.images?.length?r.images:(r.image_url?[r.image_url]:[])),supUrl:pv?.supplier_url||'',supCost:pv?.supplier_cost_xof||'',weight:r.weight_kg||'',lead:r.lead_time_days||'',stock:r.stock_status||'Disponible',ship:r.shipping_note||'',active:r.is_active,isNew:r.is_new,qualified:r.is_qualified})
async function shrink(file,max=1200,q=.85){const b=await createImageBitmap(file);const r=Math.min(1,max/Math.max(b.width,b.height));const c=document.createElement('canvas');c.width=Math.round(b.width*r);c.height=Math.round(b.height*r);c.getContext('2d').drawImage(b,0,0,c.width,c.height);return new Promise(res=>c.toBlob(res,'image/webp',q))}
async function uploadImage(file){if(!IMG_OK.includes(file.type))throw new Error('Format non accepté : utilisez JPG, PNG ou WebP.');if(file.size>15*1024*1024)throw new Error('Photo trop lourde (15 Mo maximum).')
 const blob=await shrink(file);const path=crypto.randomUUID()+'.webp';const {error}=await supabase.storage.from('product-images').upload(path,blob,{contentType:'image/webp',cacheControl:'31536000'});if(error)throw error
 return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl}
export function AdminProducts(){
 const [list,setL]=useState([]);const [cats,setCats]=useState([]);const [f,setF]=useState(EMPTY);const [e,setE]=useState({});const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);const [nc,setNc]=useState('')
 const load=async()=>{const [p,c,pr]=await Promise.all([supabase.from('products').select('*').order('created_at',{ascending:false}),supabase.from('categories').select('id,name').order('position'),supabase.from('product_private').select('*')])
  if(p.error)return setMsg('Chargement impossible : '+p.error.message);const pv=Object.fromEntries((pr.data||[]).map(x=>[x.product_id,x]));setL(p.data.map(r=>toForm(r,pv[r.id])));setCats(c.data||[])}
 useEffect(()=>{load()},[])
 const on=k=>ev=>setF({...f,[k]:ev.target.type==='checkbox'?ev.target.checked:ev.target.value})
 const pick=i=>async ev=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;setBusy(true);setMsg('');try{const u=await uploadImage(file);setF(g=>({...g,images:g.images.map((x,k)=>k===i?u:x)}))}catch(er){setMsg('Erreur : '+(er.message||'envoi impossible'))}setBusy(false)}
 const clear=i=>setF({...f,images:f.images.map((x,k)=>k===i?'':x)})
 const save=async ev=>{ev.preventDefault();const x={};if(f.images.slice(1).some(Boolean)&&!f.images[0])x.images='Ajoutez d’abord la photo principale.';if(!f.name.trim())x.name='Indiquez le nom du produit.';if(!(+f.price>0))x.price='Indiquez un prix en FCFA supérieur à 0.';if(f.old&&+f.old<=+f.price)x.old='L’ancien prix doit être supérieur au prix actuel (promotion réelle seulement).';setE(x);if(Object.keys(x).length)return
  setBusy(true);setMsg('')
  const specs=f.specs.split('\n').map(l=>l.split(':')).filter(a=>a[0].trim()&&a[1]).map(a=>[a[0].trim(),a.slice(1).join(':').trim()])
  const row={name:f.name.trim(),category_id:f.cat||null,description:f.desc||null,price_xof:+f.price,old_price_xof:f.old?+f.old:null,shipping_note:f.ship||null,image_url:f.images[0]||null,images:f.images.filter(Boolean),specs,
   is_active:f.active,is_new:f.isNew,is_qualified:f.qualified,weight_kg:f.weight?+f.weight:null,lead_time_days:f.lead?+f.lead:null,variants:f.variants.split(',').map(v=>v.trim()).filter(Boolean),sizes:f.sizes.split(',').map(v=>v.trim()).filter(Boolean),stock_status:f.stock}
  const r=f.id?await supabase.from('products').update(row).eq('id',f.id).select('id').single():await supabase.from('products').insert(row).select('id').single()
  if(r.error){setBusy(false);return setMsg('Erreur : enregistrement refusé : '+r.error.message)}
  const pv=await supabase.from('product_private').upsert({product_id:r.data.id,supplier_url:f.supUrl||null,supplier_cost_xof:f.supCost?+f.supCost:null});if(pv.error){setBusy(false);return setMsg('Erreur : infos internes refusées : '+pv.error.message)}
  setBusy(false);setF(EMPTY);setMsg('Produit enregistré dans la base. Il est visible sur le site.');load()}
 const toggle=async p=>{const {error}=await supabase.from('products').update({is_active:!p.active}).eq('id',p.id);if(error)return setMsg('Erreur : '+error.message);load()}
 const addCat=async()=>{const name=nc.trim();if(name.length<2)return;const slug=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const {error}=await supabase.from('categories').insert({name,slug});if(error)return setMsg('Erreur : catégorie refusée : '+error.message);setNc('');load()}
 const field=(k,l,p={})=><label>{l}<input value={f[k]} onChange={on(k)} {...p}/><Er m={e[k]}/></label>
 return <><div className="form inline" style={{maxWidth:720}}><label>Nouvelle catégorie<input value={nc} onChange={ev=>setNc(ev.target.value)} placeholder="Ex. Électroménager"/></label><button type="button" className="btn btn-secondary" onClick={addCat}>Ajouter</button></div>
 <form className="form" noValidate onSubmit={save} style={{maxWidth:720,marginTop:16}}><h2>{f.id?'Modifier le produit':'Nouveau produit'}</h2>
 <fieldset className="opts"><legend>Photos du produit</legend>{[['Photo principale (affichée dans la boutique)',0],['Photo de détail 1 (facultative)',1],['Photo de détail 2 (facultative)',2]].map(([l,i])=><div key={i} style={{display:'flex',gap:12,alignItems:'center',margin:'8px 0'}}>
  {f.images[i]?<img src={f.images[i]} alt={l} width="72" height="72" style={{objectFit:'cover',borderRadius:8,border:'1px solid var(--line)',flex:'none'}}/>:<div className="ph" style={{width:72,height:72,flex:'none',borderRadius:8}} aria-hidden="true"/>}
  <label style={{flex:1}}>{l}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick(i)} disabled={busy}/></label>{f.images[i]&&<button type="button" className="lnk" onClick={()=>clear(i)}>Retirer</button>}</div>)}
 <p className="note">Les photos de détail s’affichent seulement sur la fiche du produit. Les photos sont réduites automatiquement pour charger vite sur mobile.</p><Er m={e.images}/></fieldset>
 {field('name','Nom du produit')}<label>Catégorie<select value={f.cat} onChange={on('cat')}><option value="">Choisir…</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 {field('price','Prix de vente (FCFA)',{inputMode:'numeric'})}{field('old','Ancien prix, si promotion réelle (FCFA)',{inputMode:'numeric'})}
 {field('variants','Couleurs ou options, séparées par des virgules (ex. Noir, Blanc)')}{field('sizes','Tailles disponibles, séparées par des virgules (ex. S, M, L, XL ou 38, 39, 40)')}<p className="note">Si vous remplissez les tailles, le client doit en choisir une pour commander, et la taille apparaît dans la commande. Laissez vide pour un produit sans taille.</p><label>Description<textarea rows="3" value={f.desc} onChange={on('desc')}/></label>
 <label>Caractéristiques, une par ligne (Clé: valeur)<textarea rows="3" value={f.specs} onChange={on('specs')}/></label>
 {field('weight','Poids (kg)',{inputMode:'decimal'})}{field('lead','Délai estimé de livraison (jours)',{inputMode:'numeric'})}
 <label>Disponibilité<select value={f.stock} onChange={on('stock')}><option>Disponible</option><option>Sur commande</option><option>Indisponible</option></select></label>{field('ship','Mention d’expédition affichée sous le prix')}
 <fieldset className="opts"><legend>Informations internes (jamais visibles par les clients)</legend>{field('supUrl','Lien du produit chez le fournisseur')}{field('supCost','Prix d’achat fournisseur (FCFA)',{inputMode:'numeric'})}{f.supCost&&f.price&&<p className="note">Marge estimée : {formatXOF(+f.price-+f.supCost)} FCFA, hors transport.</p>}</fieldset>
 {[['active','Visible dans la boutique'],['isNew','Marquer comme nouveauté'],['qualified','Produit qualifié (vérifié par l’équipe)']].map(([k,l])=><label key={k} className="radio"><input type="checkbox" checked={f[k]} onChange={on(k)}/>{l}</label>)}
 {msg&&<p role="status" className={msg.startsWith('Erreur')?'err':'okmsg'}>{msg}</p>}
 <div style={{display:'flex',gap:8}}><button className="btn btn-primary" disabled={busy}>{busy?'Patientez…':f.id?'Enregistrer':'Ajouter le produit'}</button>{f.id&&<button type="button" className="btn btn-secondary" onClick={()=>setF(EMPTY)}>Annuler</button>}</div></form>
 <div className="tw" style={{marginTop:20}}><table><thead><tr><th>Produit</th><th>Catégorie</th><th>Prix FCFA</th><th>Disponibilité</th><th>Statut</th><th></th></tr></thead><tbody>{list.map(p=><tr key={p.id}><td>{p.name}{p.qualified&&' ✓'}</td><td>{cats.find(c=>c.id===p.cat)?.name||'—'}</td><td>{formatXOF(p.price)}</td><td>{p.stock}</td><td>{p.active?'Visible':'Masqué'}</td>
 <td><button className="lnk" onClick={()=>{setF(p);scrollTo(0,0)}}>Modifier</button><button className="lnk" onClick={()=>toggle(p)}>{p.active?'Masquer':'Afficher'}</button></td></tr>)}</tbody></table>{list.length===0&&<p className="note">Aucun produit pour l’instant.</p>}</div></>}
