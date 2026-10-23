import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { DEMO_ORDERS, DEMO_PRODUCTS, DEMO_CATS, STATUS } from '../data/demo.js'
import { formatXOF } from '../lib/supabase.js'
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

export function AdminLayout(){if(import.meta.env.VITE_DEMO_ADMIN==='false')return <div className="empty"><h1 className="ptitle">Accès réservé</h1><p>L’administration sera réservée aux comptes administrateurs vérifiés par le serveur.</p></div>
 return <><h1 className="ptitle">Administration</h1><p className="note demo">Maquette avec données d’exemple. Les actions ne sont pas enregistrées avant le branchement de Supabase.</p>
 <nav className="tabs" aria-label="Administration">{TABS.map(([t,n])=><NavLink key={t} to={t} end>{n}</NavLink>)}</nav><Outlet/></>}

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

const EMPTY={name:'',cat:'',price:'',old:'',variants:'',desc:'',specs:'',images:'',supUrl:'',supCost:'',weight:'',lead:'',stock:'Disponible',ship:'Hors frais d’expédition',active:true,isNew:false,qualified:false}
export function AdminProducts(){const [list,setL]=useState(DEMO_PRODUCTS.map(p=>({...EMPTY,id:p.id,name:p.name,cat:p.cat,price:p.price_xof,active:true,isNew:p.is_new})));const [f,setF]=useState(EMPTY);const [e,setE]=useState({})
 const on=k=>ev=>setF({...f,[k]:ev.target.type==='checkbox'?ev.target.checked:ev.target.value})
 const save=ev=>{ev.preventDefault();const x={};if(!f.name.trim())x.name='Indiquez le nom du produit.';if(!(+f.price>0))x.price='Indiquez un prix en FCFA supérieur à 0.';if(f.old&&+f.old<=+f.price)x.old='L’ancien prix doit être supérieur au prix actuel (promotion réelle seulement).';setE(x);if(Object.keys(x).length)return
  setL(f.id?list.map(p=>p.id===f.id?f:p):[{...f,id:'n'+Date.now()},...list]);setF(EMPTY)}
 const field=(k,l,p={})=><label>{l}<input value={f[k]} onChange={on(k)} {...p}/>{e[k]&&<span className="err" role="alert">{e[k]}</span>}</label>
 return <><form className="form" noValidate onSubmit={save} style={{maxWidth:720}}><h2>{f.id?'Modifier le produit':'Nouveau produit'}</h2>
 {field('name','Nom du produit')}<label>Catégorie<select value={f.cat} onChange={on('cat')}><option value="">Choisir…</option>{DEMO_CATS.map(c=><option key={c}>{c}</option>)}</select></label>
 {field('price','Prix de vente (FCFA)',{inputMode:'numeric'})}{field('old','Ancien prix, si promotion réelle (FCFA)',{inputMode:'numeric'})}
 {field('variants','Variantes, séparées par des virgules (ex. Noir, Blanc)')}<label>Description<textarea rows="3" value={f.desc} onChange={on('desc')}/></label>
 <label>Caractéristiques, une par ligne (Clé: valeur)<textarea rows="3" value={f.specs} onChange={on('specs')}/></label>{field('images','Photos : adresses des images, séparées par des virgules')}
 {field('weight','Poids (kg)',{inputMode:'decimal'})}{field('lead','Délai estimé de livraison (jours)',{inputMode:'numeric'})}
 <label>Disponibilité<select value={f.stock} onChange={on('stock')}><option>Disponible</option><option>Sur commande</option><option>Indisponible</option></select></label>{field('ship','Mention d’expédition affichée sous le prix')}
 <fieldset className="opts"><legend>Informations internes (jamais visibles par les clients)</legend>{field('supUrl','Lien du produit chez le fournisseur')}{field('supCost','Prix d’achat fournisseur (FCFA)',{inputMode:'numeric'})}{f.supCost&&f.price&&<p className="note">Marge estimée : {formatXOF(+f.price-+f.supCost)} FCFA, hors transport.</p>}</fieldset>
 {[['active','Visible dans la boutique'],['isNew','Marquer comme nouveauté'],['qualified','Produit qualifié (vérifié par l’équipe)']].map(([k,l])=><label key={k} className="radio"><input type="checkbox" checked={f[k]} onChange={on(k)}/>{l}</label>)}
 <div style={{display:'flex',gap:8}}><button className="btn btn-primary">{f.id?'Enregistrer':'Ajouter le produit'}</button>{f.id&&<button type="button" className="btn btn-secondary" onClick={()=>setF(EMPTY)}>Annuler</button>}</div></form>
 <div className="tw" style={{marginTop:20}}><table><thead><tr><th>Produit</th><th>Prix FCFA</th><th>Disponibilité</th><th>Statut</th><th></th></tr></thead><tbody>{list.map(p=><tr key={p.id}><td>{p.name}{p.qualified&&' ✓'}</td><td>{formatXOF(p.price)}</td><td>{p.stock}</td><td>{p.active?'Visible':'Masqué'}</td>
 <td><button className="lnk" onClick={()=>setF(p)}>Modifier</button><button className="lnk" onClick={()=>setL(list.map(x=>x.id===p.id?{...x,active:!x.active}:x))}>{p.active?'Masquer':'Afficher'}</button></td></tr>)}</tbody></table></div></>}

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
