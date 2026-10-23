import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { DEMO_ORDERS, DEMO_PRODUCTS, DEMO_CATS, STATUS } from '../data/demo.js'
import { formatXOF, supabase } from '../lib/supabase.js'
// Données d'exemple : le backend Supabase remplacera ces tableaux (temps réel via Supabase Realtime).
const LEVELS=['Aucun paiement','Acompte reçu','Soldé','À relancer']
const CLIENTS=[{id:1,name:'Client exemple',email:'client1@exemple.com',phone:'+229 00 00 00 00',since:'Exemple',orders:1,paid:8500,level:'Soldé',note:''},
 {id:2,name:'Cliente exemple',email:'client2@exemple.com',phone:'+229 00 00 00 01',since:'Exemple',orders:1,paid:0,level:'Aucun paiement',note:''}]
const PAYS=[{ref:'EXEMPLE-001',client:'Client exemple',amount:8500,op:'MTN MoMo',status:'approved'},{ref:'EXEMPLE-002',client:'Cliente exemple',amount:24000,op:'Moov Money',status:'pending'},{ref:'EXEMPLE-003',client:'Client exemple',amount:6000,op:'MTN MoMo',status:'declined'}]
const PAYST={approved:'Payé',pending:'En attente',declined:'Échoué'}
const TESTS=[{id:1,product:'Écouteurs sans fil (exemple)',author:'Client exemple',buyer:true,rating:4,text:'Témoignage d’exemple : à valider avant publication.',status:'pending'},
 {id:2,product:'Sac à dos (exemple)',author:'Visiteur exemple',buyer:false,rating:5,text:'Témoignage d’exemple d’un compte sans achat payé.',status:'pending'}]
const MSGS=[{id:1,from:'Client exemple',subject:'Où en est ma commande ?',body:'Message d’exemple d’un client.',status:'Nouveau',reply:''},{id:2,from:'Cliente exemple',subject:'Puis-je changer l’adresse ?',body:'Message d’exemple.',status:'En cours',reply:''}]
const TABS=[['/admin','Tableau de bord'],['/admin/commandes','Commandes'],['/admin/paiements','Paiements'],['/admin/produits','Produits'],['/admin/clients','Clients'],['/admin/temoignages','Témoignages'],['/admin/messages','Messages'],['/admin/annonces','Annonces']]

function AdminLogin(){const [f,setF]=useState({email:'',pw:''});const [err,setErr]=useState('');const [busy,setBusy]=useState(false)
 const go=async ev=>{ev.preventDefault();setBusy(true);setErr('');const {error}=await supabase.auth.signInWithPassword({email:f.email.trim(),password:f.pw});setBusy(false);if(error)setErr('Identifiants incorrects.')}
 return <form className="form narrow" onSubmit={go}><h1 className="ptitle">Connexion administrateur</h1><label>E-mail<input type="email" autoComplete="username" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></label>
 <label>Mot de passe<input type="password" autoComplete="current-password" value={f.pw} onChange={e=>setF({...f,pw:e.target.value})}/></label>{err&&<span className="err" role="alert">{err}</span>}<button className="btn btn-primary block" disabled={busy}>Se connecter</button></form>}
export function AdminLayout(){const [st,setSt]=useState(supabase?'loading':'demo')
 const check=async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session)return setSt('login');const {data}=await supabase.from('profiles').select('is_admin').eq('id',session.user.id).single();setSt(data?.is_admin?'ok':'denied')}
 useEffect(()=>{if(!supabase)return;check();const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{check()});return()=>subscription.unsubscribe()},[])
 if(!supabase&&import.meta.env.VITE_DEMO_ADMIN==='false')return <div className="empty"><h1 className="ptitle">Accès réservé</h1><p>Cette page est réservée aux administrateurs.</p></div>
 if(st==='loading')return <div className="skeleton" style={{height:120}}/>
 if(st==='login')return <AdminLogin/>
 if(st==='denied')return <div className="empty"><h1 className="ptitle">Accès refusé</h1><p>Ce compte n’est pas administrateur.</p><button className="btn btn-secondary" onClick={()=>supabase.auth.signOut()}>Se déconnecter</button></div>
 return <><h1 className="ptitle">Administration</h1><p className="note demo">{supabase?'Produits, catégories et photos : données réelles. Les autres rubriques affichent encore des exemples.':'Maquette avec données d’exemple : rien n’est enregistré.'}</p>
 <nav className="tabs" aria-label="Administration">{TABS.map(([t,n])=><NavLink key={t} to={t} end>{n}</NavLink>)}{supabase&&<button className="lnk" onClick={()=>supabase.auth.signOut()}>Déconnexion</button>}</nav><Outlet/></>}

export function AdminHome(){
 const k=[['Commandes à traiter',DEMO_ORDERS.filter(o=>o.status!=='delivered').length],['Paiements en attente',PAYS.filter(p=>p.status==='pending').length],['Messages non lus',MSGS.filter(m=>m.status==='Nouveau').length],['Témoignages à valider',TESTS.length],['Clients inscrits',CLIENTS.length],['Produits',DEMO_PRODUCTS.length]]
 return <><div className="kpis">{k.map(([n,v])=><div key={n} className="kpi"><b>{v}</b><span>{n}</span></div>)}</div>
 <h2 style={{margin:'20px 0 8px'}}>Activité récente (exemple)</h2><ul className="list">{['Nouvelle commande TP-EXEMPLE-2','Paiement MTN MoMo reçu (EXEMPLE-001)','Nouveau message : « Où en est ma commande ? »','Nouveau témoignage à valider'].map(a=><li key={a} className="line">{a}</li>)}</ul>
 <p className="note">En production, cette liste se met à jour toute seule dès qu’une commande, un paiement ou un message arrive.</p></>}

export function AdminOrders(){const [o,setO]=useState(DEMO_ORDERS)
 return <div className="tw"><table><thead><tr><th>N°</th><th>Client</th><th>Articles</th><th>Total</th><th>Statut logistique</th></tr></thead><tbody>{o.map((r,i)=><tr key={r.id}><td>{r.id}</td><td>{r.client}</td><td>{r.items.join(', ')}</td><td>{formatXOF(r.total)}</td>
 <td><select aria-label={'Statut '+r.id} value={r.status} onChange={e=>setO(o.map((x,k)=>k===i?{...x,status:e.target.value}:x))}>{Object.entries(STATUS).filter(([k])=>k!=='paid'&&k!=='pending_payment'||k===r.status).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></td></tr>)}</tbody></table>
 <p className="note">Les statuts « Paiement reçu » et « En attente » sont posés uniquement par la confirmation du paiement, jamais à la main.</p></div>}

export function AdminPayments(){const [f,setF]=useState('')
 const L=PAYS.filter(p=>!f||p.status===f);const total=PAYS.filter(p=>p.status==='approved').reduce((s,p)=>s+p.amount,0)
 return <><div className="filters"><label>Filtrer<select value={f} onChange={e=>setF(e.target.value)}><option value="">Tous</option>{Object.entries(PAYST).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
 <p><b>Total payé : {formatXOF(total)} FCFA</b></p><div className="tw"><table><thead><tr><th>Référence</th><th>Client</th><th>Montant</th><th>Opérateur</th><th>Statut</th></tr></thead><tbody>{L.map(p=><tr key={p.ref}><td>{p.ref}</td><td>{p.client}</td><td>{formatXOF(p.amount)}</td><td>{p.op}</td><td><span className={'st st-'+(p.status==='approved'?'paid':'')}>{PAYST[p.status]}</span></td></tr>)}</tbody></table></div></>}

const EMPTY={name:'',cat:'',price:'',old:'',variants:'',desc:'',specs:'',images:[],supUrl:'',supCost:'',weight:'',lead:'',stock:'Disponible',ship:'Hors frais d’expédition',active:true,isNew:false,qualified:false}
const IMG_OK=['image/jpeg','image/png','image/webp']
const toForm=(r,pv)=>({...EMPTY,id:r.id,name:r.name,cat:r.category_id||'',price:r.price_xof,old:r.old_price_xof||'',variants:(r.variants||[]).join(', '),desc:r.description||'',specs:(r.specs||[]).map(([k,v])=>k+': '+v).join('\n'),
 images:r.images?.length?r.images:(r.image_url?[r.image_url]:[]),supUrl:pv?.supplier_url||'',supCost:pv?.supplier_cost_xof||'',weight:r.weight_kg||'',lead:r.lead_time_days||'',stock:r.stock_status||'Disponible',ship:r.shipping_note||'',active:r.is_active,isNew:r.is_new,qualified:r.is_qualified})
const toData=b=>new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)})
async function shrink(file,max=1200,q=.85){const b=await createImageBitmap(file);const r=Math.min(1,max/Math.max(b.width,b.height));const c=document.createElement('canvas');c.width=Math.round(b.width*r);c.height=Math.round(b.height*r);c.getContext('2d').drawImage(b,0,0,c.width,c.height);return new Promise(res=>c.toBlob(res,'image/webp',q))}
async function uploadImages(files){const out=[];for(const file of files){
 if(!IMG_OK.includes(file.type))throw new Error('Format non accepté : utilisez JPG, PNG ou WebP.')
 if(file.size>15*1024*1024)throw new Error('Photo trop lourde (15 Mo maximum).')
 if(!supabase){out.push(await toData(await shrink(file,800,.8)));continue}
 const blob=await shrink(file);const path=crypto.randomUUID()+'.webp'
 const {error}=await supabase.storage.from('product-images').upload(path,blob,{contentType:'image/webp',cacheControl:'31536000'});if(error)throw error
 out.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)}return out}

export function AdminProducts(){
 const [list,setL]=useState(()=>{if(supabase)return [];try{const a=JSON.parse(localStorage.getItem('tp_admin_products'));if(Array.isArray(a))return a}catch{}
  return DEMO_PRODUCTS.map(p=>({...EMPTY,id:p.id,name:p.name,cat:p.cat,price:p.price_xof,images:p.images||[],isNew:p.is_new,desc:p.description,variants:(p.variants||[]).join(', '),specs:(p.specs||[]).map(([k,v])=>k+': '+v).join('\n')}))})
 const [cats,setCats]=useState(supabase?[]:DEMO_CATS.map(c=>({id:c,name:c})))
 const [f,setF]=useState(EMPTY);const [e,setE]=useState({});const [msg,setMsg]=useState('');const setLP=l=>{setL(l);if(!supabase)try{localStorage.setItem('tp_admin_products',JSON.stringify(l));setMsg('Produit enregistré. Il est visible sur le site.')}catch{setMsg('Mémoire du navigateur pleine : retirez quelques photos.')}};const [busy,setBusy]=useState(false);const [nc,setNc]=useState('')
 const load=async()=>{if(!supabase)return;const [p,c,pr]=await Promise.all([supabase.from('products').select('*').order('created_at',{ascending:false}),supabase.from('categories').select('id,name').order('position'),supabase.from('product_private').select('*')])
  if(p.error)return setMsg('Chargement impossible : '+p.error.message);const pv=Object.fromEntries((pr.data||[]).map(x=>[x.product_id,x]));setL(p.data.map(r=>toForm(r,pv[r.id])));setCats(c.data||[])}
 useEffect(()=>{load()},[])
 const on=k=>ev=>setF({...f,[k]:ev.target.type==='checkbox'?ev.target.checked:ev.target.value})
 const pick=async ev=>{const files=[...ev.target.files];ev.target.value='';if(!files.length)return;setBusy(true);setMsg('')
  try{const urls=await uploadImages(files);setF(g=>({...g,images:[...g.images,...urls].slice(0,8)}))}catch(er){setMsg(er.message||'Envoi impossible.')}setBusy(false)}
 const main=i=>setF({...f,images:[f.images[i],...f.images.filter((_,k)=>k!==i)]})
 const save=async ev=>{ev.preventDefault();const x={};if(!f.name.trim())x.name='Indiquez le nom du produit.';if(!(+f.price>0))x.price='Indiquez un prix en FCFA supérieur à 0.';if(f.old&&+f.old<=+f.price)x.old='L’ancien prix doit être supérieur au prix actuel (promotion réelle seulement).';setE(x);if(Object.keys(x).length)return
  if(!supabase){setLP(f.id?list.map(p=>p.id===f.id?f:p):[{...f,id:'n'+Date.now()},...list]);return setF(EMPTY)}
  setBusy(true);setMsg('')
  const specs=f.specs.split('\n').map(l=>l.split(':')).filter(a=>a[0].trim()&&a[1]).map(a=>[a[0].trim(),a.slice(1).join(':').trim()])
  const row={name:f.name.trim(),category_id:f.cat||null,description:f.desc||null,price_xof:+f.price,old_price_xof:f.old?+f.old:null,shipping_note:f.ship||null,image_url:f.images[0]||null,images:f.images,specs,
   is_active:f.active,is_new:f.isNew,is_qualified:f.qualified,weight_kg:f.weight?+f.weight:null,lead_time_days:f.lead?+f.lead:null,variants:f.variants.split(',').map(v=>v.trim()).filter(Boolean),stock_status:f.stock}
  const r=f.id?await supabase.from('products').update(row).eq('id',f.id).select('id').single():await supabase.from('products').insert(row).select('id').single()
  if(r.error){setBusy(false);return setMsg('Enregistrement refusé : '+r.error.message)}
  await supabase.from('product_private').upsert({product_id:r.data.id,supplier_url:f.supUrl||null,supplier_cost_xof:f.supCost?+f.supCost:null})
  setBusy(false);setF(EMPTY);setMsg('Produit enregistré. Il est visible sur le site.');load()}
 const toggle=async p=>{if(!supabase)return setLP(list.map(x=>x.id===p.id?{...x,active:!x.active}:x));const {error}=await supabase.from('products').update({is_active:!p.active}).eq('id',p.id);if(error)return setMsg('Action refusée : '+error.message);load()}
 const addCat=async()=>{const name=nc.trim();if(name.length<2)return;if(!supabase){setCats([...cats,{id:name,name}]);return setNc('')}
  const slug=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const {error}=await supabase.from('categories').insert({name,slug});if(error)return setMsg('Catégorie refusée : '+error.message);setNc('');load()}
 const field=(k,l,p={})=><label>{l}<input value={f[k]} onChange={on(k)} {...p}/>{e[k]&&<span className="err" role="alert">{e[k]}</span>}</label>
 return <><div className="form inline" style={{maxWidth:720}}><label>Nouvelle catégorie<input value={nc} onChange={ev=>setNc(ev.target.value)} placeholder="Ex. Électroménager"/></label><button type="button" className="btn btn-secondary" onClick={addCat}>Ajouter</button></div>
 {!supabase&&<p className="note demo">Mode démonstration : vos produits et photos sont gardés dans ce navigateur et s’affichent sur le site. <button type="button" className="lnk" onClick={()=>{try{localStorage.removeItem('tp_admin_products')}catch{};location.reload()}}>Rétablir les exemples</button></p>}
 <form className="form" noValidate onSubmit={save} style={{maxWidth:720,marginTop:16}}><h2>{f.id?'Modifier le produit':'Nouveau produit'}</h2>
 <fieldset className="opts"><legend>Photos (8 maximum, la première est la photo principale)</legend><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pick} disabled={busy||f.images.length>=8}/>
 <p className="note">JPG, PNG ou WebP. Les photos sont réduites automatiquement pour charger vite sur mobile.{!supabase&&' Dans cette démonstration, les photos restent dans ce navigateur.'}</p>
 <div className="thumbs" style={{flexWrap:'wrap'}}>{f.images.map((s,i)=><div key={s} style={{textAlign:'center'}}><img src={s} alt={'Photo '+(i+1)} width="72" height="72" style={{objectFit:'cover',borderRadius:8,border:i===0?'2px solid var(--orange)':'1px solid var(--line)'}}/><br/>{i>0&&<button type="button" className="lnk" onClick={()=>main(i)}>Principale</button>}<button type="button" className="lnk" onClick={()=>setF({...f,images:f.images.filter((_,k)=>k!==i)})}>Retirer</button></div>)}</div></fieldset>
 {field('name','Nom du produit')}<label>Catégorie<select value={f.cat} onChange={on('cat')}><option value="">Choisir…</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 {field('price','Prix de vente (FCFA)',{inputMode:'numeric'})}{field('old','Ancien prix, si promotion réelle (FCFA)',{inputMode:'numeric'})}
 {field('variants','Variantes, séparées par des virgules (ex. Noir, Blanc)')}<label>Description<textarea rows="3" value={f.desc} onChange={on('desc')}/></label>
 <label>Caractéristiques, une par ligne (Clé: valeur)<textarea rows="3" value={f.specs} onChange={on('specs')}/></label>
 {field('weight','Poids (kg)',{inputMode:'decimal'})}{field('lead','Délai estimé de livraison (jours)',{inputMode:'numeric'})}
 <label>Disponibilité<select value={f.stock} onChange={on('stock')}><option>Disponible</option><option>Sur commande</option><option>Indisponible</option></select></label>{field('ship','Mention d’expédition affichée sous le prix')}
 <fieldset className="opts"><legend>Informations internes (jamais visibles par les clients)</legend>{field('supUrl','Lien du produit chez le fournisseur')}{field('supCost','Prix d’achat fournisseur (FCFA)',{inputMode:'numeric'})}{f.supCost&&f.price&&<p className="note">Marge estimée : {formatXOF(+f.price-+f.supCost)} FCFA, hors transport.</p>}</fieldset>
 {[['active','Visible dans la boutique'],['isNew','Marquer comme nouveauté'],['qualified','Produit qualifié (vérifié par l’équipe)']].map(([k,l])=><label key={k} className="radio"><input type="checkbox" checked={f[k]} onChange={on(k)}/>{l}</label>)}
 {msg&&<p role="status" className={msg.includes('refusé')||msg.includes('impossible')||msg.includes('Format')||msg.includes('lourde')?'err':'okmsg'}>{msg}</p>}
 <div style={{display:'flex',gap:8}}><button className="btn btn-primary" disabled={busy}>{busy?'Patientez…':f.id?'Enregistrer':'Ajouter le produit'}</button>{f.id&&<button type="button" className="btn btn-secondary" onClick={()=>setF(EMPTY)}>Annuler</button>}</div></form>
 <div className="tw" style={{marginTop:20}}><table><thead><tr><th>Produit</th><th>Catégorie</th><th>Prix FCFA</th><th>Disponibilité</th><th>Statut</th><th></th></tr></thead><tbody>{list.map(p=><tr key={p.id}><td>{p.name}{p.qualified&&' ✓'}</td><td>{cats.find(c=>c.id===p.cat)?.name||'—'}</td><td>{formatXOF(p.price)}</td><td>{p.stock}</td><td>{p.active?'Visible':'Masqué'}</td>
 <td><button className="lnk" onClick={()=>{setF(p);scrollTo(0,0)}}>Modifier</button><button className="lnk" onClick={()=>toggle(p)}>{p.active?'Masquer':'Afficher'}</button></td></tr>)}</tbody></table></div></>}

export function AdminClients(){const [c,setC]=useState(CLIENTS);const up=(id,k,v)=>setC(c.map(x=>x.id===id?{...x,[k]:v}:x))
 return <><p className="note">Le niveau de paiement et la note sont enregistrés dans le compte du client et visibles par lui.</p><div className="tw"><table><thead><tr><th>Client</th><th>Contact</th><th>Commandes</th><th>Total payé</th><th>Niveau de paiement</th><th>Note pour le client</th></tr></thead><tbody>{c.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.email}<br/>{x.phone}</td><td>{x.orders}</td><td>{formatXOF(x.paid)}</td>
 <td><select aria-label={'Niveau '+x.name} value={x.level} onChange={e=>up(x.id,'level',e.target.value)}>{LEVELS.map(l=><option key={l}>{l}</option>)}</select></td><td><input aria-label={'Note '+x.name} value={x.note} maxLength={300} onChange={e=>up(x.id,'note',e.target.value)} placeholder="Ex. solde de 5 000 FCFA attendu"/></td></tr>)}</tbody></table></div></>}

export function AdminTestimonials(){const [t,setT]=useState(TESTS)
 return <><p className="note">Règle : seuls les clients ayant un achat payé du produit peuvent laisser un témoignage. Rien n’est publié sans votre validation.</p><ul className="list">{t.map(x=><li key={x.id} className="line"><div style={{flex:1}}><b>{x.product}</b> <span className="note">par {x.author} · {'★'.repeat(x.rating)}</span>{x.buyer?<span className="badge">Achat vérifié</span>:<span className="st">Sans achat payé</span>}<p style={{margin:'4px 0'}}>{x.text}</p><span className={'st'+(x.status==='approved'?' st-paid':'')}>{{pending:'À valider',approved:'Publié',rejected:'Refusé'}[x.status]}</span></div>
 <div><button className="lnk" disabled={!x.buyer} onClick={()=>setT(t.map(y=>y.id===x.id?{...y,status:'approved'}:y))}>Publier</button><button className="lnk" onClick={()=>setT(t.map(y=>y.id===x.id?{...y,status:'rejected'}:y))}>Refuser</button></div></li>)}</ul></>}

export function AdminMessages(){const [m,setM]=useState(MSGS);const up=(id,k,v)=>setM(m.map(x=>x.id===id?{...x,[k]:v}:x))
 return <ul className="list">{m.map(x=><li key={x.id} className="line" style={{display:'block'}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><b>{x.subject}</b><select aria-label={'Statut '+x.subject} value={x.status} onChange={e=>up(x.id,'status',e.target.value)}>{['Nouveau','En cours','Résolu'].map(s=><option key={s}>{s}</option>)}</select></div>
 <p className="note">{x.from}</p><p style={{margin:'4px 0'}}>{x.body}</p><label>Votre réponse<textarea rows="2" value={x.reply} onChange={e=>up(x.id,'reply',e.target.value)}/></label><button className="btn btn-secondary" onClick={()=>up(x.id,'status','Résolu')}>Envoyer et marquer résolu</button></li>)}</ul>}

export function AdminAnnouncements(){const [a,setA]=useState(()=>{try{return JSON.parse(localStorage.getItem('tp_announce'))||{text:'',active:false}}catch{return{text:'',active:false}}});const [ok,setOk]=useState(false)
 const pub=ev=>{ev.preventDefault();try{localStorage.setItem('tp_announce',JSON.stringify(a))}catch{};setOk(true)}
 return <form className="form" onSubmit={pub}><h2>Bandeau d’annonce</h2><p className="note">S’affiche en haut du site. Dans cette maquette, il apparaît en direct dans un autre onglet ouvert du même navigateur ; en production, chez tous les visiteurs.</p>
 <label>Message (140 caractères max)<input maxLength={140} value={a.text} onChange={e=>setA({...a,text:e.target.value})}/></label><label className="radio"><input type="checkbox" checked={a.active} onChange={e=>setA({...a,active:e.target.checked})}/>Afficher le bandeau</label>
 <button className="btn btn-primary">Publier</button>{ok&&<p className="okmsg" role="status">Publié.</p>}</form>}
