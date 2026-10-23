import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { formatXOF, WHATSAPP } from '../lib/supabase.js'
import { useStore, useProducts } from '../lib/store.jsx'
import { DEMO_CATS } from '../data/demo.js'

export const Price=({p})=>{const promo=p.old_price_xof>p.price_xof
 return <div className="price">{formatXOF(p.price_xof)} <small>FCFA</small>{promo&&<><span className="badge">−{Math.round((1-p.price_xof/p.old_price_xof)*100)} %</span> <span className="old">{formatXOF(p.old_price_xof)}</span></>}</div>}
export const Ph=({name})=><div className="ph" role="img" aria-label={'Photo de '+name}><span>{name[0]}</span></div>
export function Card({p}){return <Link className="card" to={'/produit/'+p.id}>{p.image_url?<img src={p.image_url} alt={p.name} loading="lazy"/>:<Ph name={p.name}/>}
 <div className="card-body"><div className="card-name">{p.name}</div><Price p={p}/><div className="note">{p.shipping_note||'Hors frais d’expédition'}</div></div></Link>}
function Grid({items,state}){
 if(state==='loading')return <div className="grid">{[1,2,3,4].map(i=><div key={i} className="skeleton"/>)}</div>
 if(state==='error')return <div className="empty"><p>Le catalogue ne s’est pas chargé. Vérifiez votre connexion.</p><button className="btn btn-secondary" onClick={()=>location.reload()}>Réessayer</button></div>
 if(!items.length)return <div className="empty"><p>Aucun produit ne correspond. Essayez un autre mot ou une autre catégorie.</p><Link className="btn btn-secondary" to="/catalogue">Tout le catalogue</Link></div>
 return <div className="grid">{items.map(p=><Card key={p.id} p={p}/>)}</div>}

export function Home(){const {items,state}=useProducts()
 return <>
 <nav className="cats" aria-label="Catégories">{DEMO_CATS.map(c=><Link key={c} className="cat" to={'/catalogue?cat='+c}><span aria-hidden="true">{c[0]}</span>{c}</Link>)}</nav>
 <section className="hero"><div><h1>Des produits de Chine, payés en Mobile Money.</h1><p>Vous choisissez, vous payez en FCFA, TAIPOC commande pour vous et vous suivez votre colis jusqu’à Cotonou.</p><Link className="btn btn-primary" to="/catalogue">Voir le catalogue</Link></div><img src="/img/hero.svg" alt="" width="400" height="240"/></section>
 <ul className="trust"><li>Paiement Mobile Money via FedaPay</li><li>Suivi de commande dans votre compte</li><li>Assistance en français sur WhatsApp</li></ul>
 <section className="section"><div className="section-head"><h2>Produits populaires</h2><Link to="/catalogue">Tout voir</Link></div><Grid items={items.slice(0,10)} state={state}/></section>
 {items.some(p=>p.is_new)&&<section className="section"><div className="section-head"><h2>Nouveautés</h2><Link to="/catalogue?sort=new">Tout voir</Link></div><Grid items={items.filter(p=>p.is_new).slice(0,10)} state="ready"/></section>}
 <section className="section"><h2 style={{marginBottom:12}}>Comment ça marche</h2><ol className="steps"><li><div><b>Je choisis</b>Je parcours le catalogue.</div></li><li><div><b>Je paie</b>Je règle en Mobile Money.</div></li><li><div><b>TAIPOC commande</b>L’équipe achète auprès du fournisseur.</div></li><li><div><b>Je reçois</b>À domicile ou retrait à l’entreprise.</div></li></ol></section>
 <section className="section deliv"><h2>Livraison à Cotonou</h2><p>Livraison à domicile ou retrait à l’entreprise. Les frais et délais sont affichés avant le paiement. <Link to="/livraison">En savoir plus</Link></p></section></>}

export function Catalogue(){const {items,state}=useProducts();const [sp,setSp]=useSearchParams()
 const q=sp.get('q')||'',cat=sp.get('cat')||'',sort=sp.get('sort')||''
 const set=(k,v)=>{const n=new URLSearchParams(sp);v?n.set(k,v):n.delete(k);setSp(n)}
 let list=items.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())&&(!cat||p.cat===cat))
 if(sort==='asc')list=[...list].sort((a,b)=>a.price_xof-b.price_xof);if(sort==='desc')list=[...list].sort((a,b)=>b.price_xof-a.price_xof);if(sort==='new')list=list.filter(p=>p.is_new)
 return <><h1 className="ptitle">Catalogue</h1>
 <div className="filters"><label>Catégorie<select value={cat} onChange={e=>set('cat',e.target.value)}><option value="">Toutes</option>{DEMO_CATS.map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Trier par<select value={sort} onChange={e=>set('sort',e.target.value)}><option value="">Pertinence</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option><option value="new">Nouveautés</option></select></label></div>
 <p className="note">{state==='ready'?list.length+' produit(s)'+(q?' pour « '+q+' »':''):''}</p><Grid items={list} state={state}/></>}

export function Product(){const {id}=useParams();const {items,state}=useProducts();const {add}=useStore();const nav=useNavigate()
 const p=items.find(x=>x.id===id);const [v,setV]=useState('');const [q,setQ]=useState(1);const [ok,setOk]=useState(false)
 if(state==='loading')return <div className="skeleton" style={{height:320}}/>
 if(!p)return <div className="empty"><p>Ce produit n’existe pas ou n’est plus disponible.</p><Link className="btn btn-primary" to="/catalogue">Retour au catalogue</Link></div>
 const vs=p.variants||[];const variant=v||vs[0]||''
 return <div className="pdp"><div>{p.image_url?<img className="pimg" src={p.image_url} alt={p.name}/>:<Ph name={p.name}/>}</div>
 <div><h1 style={{fontSize:22}}>{p.name}</h1><Price p={p}/><p className="note">{p.shipping_note||'Hors frais d’expédition'}. Les frais exacts sont confirmés avant le paiement.</p>
 {vs.length>0&&<fieldset className="opts"><legend>Variante</legend>{vs.map(x=><button key={x} className={'chip'+(x===variant?' on':'')} aria-pressed={x===variant} onClick={()=>setV(x)}>{x}</button>)}</fieldset>}
 <div className="qty"><button aria-label="Moins" onClick={()=>setQ(Math.max(1,q-1))}>−</button><span>{q}</span><button aria-label="Plus" onClick={()=>setQ(q+1)}>+</button></div>
 <button className="btn btn-primary block" onClick={()=>{add(p.id,variant,q);setOk(true)}}>Ajouter au panier</button>
 {ok&&<p role="status" className="okmsg">Ajouté au panier. <Link to="/panier">Voir le panier</Link></p>}
 <div className="deliv" style={{marginTop:16}}><b>Livraison</b><p>Délai estimé : à confirmer par TAIPOC. Livraison à domicile ou retrait à l’entreprise à Cotonou. <Link to="/livraison">Détails</Link></p></div>
 <h2 style={{margin:'20px 0 8px',fontSize:16}}>Description</h2><p>{p.description}</p>
 <a className="btn btn-secondary block" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour, une question sur : '+p.name)}`}>Poser une question sur WhatsApp</a></div>
 <section className="section" style={{gridColumn:'1/-1'}}><h2 style={{marginBottom:12}}>Produits similaires</h2><Grid items={items.filter(x=>x.id!==p.id&&x.cat===p.cat).slice(0,5)} state="ready"/></section></div>}

export function lines(cart,items){return cart.map((l,i)=>({...l,i,p:items.find(x=>x.id===l.id)})).filter(l=>l.p)}
export function Cart(){const {cart,setQty}=useStore();const {items}=useProducts();const L=lines(cart,items);const sub=L.reduce((s,l)=>s+l.p.price_xof*l.qty,0)
 if(!L.length)return <div className="empty"><h1 className="ptitle">Panier</h1><p>Votre panier est vide.</p><Link className="btn btn-primary" to="/catalogue">Découvrir le catalogue</Link></div>
 return <><h1 className="ptitle">Panier</h1><ul className="list">{L.map(l=><li key={l.i} className="line"><div className="thumb">{l.p.image_url?<img src={l.p.image_url} alt=""/>:<Ph name={l.p.name}/>}</div>
 <div style={{flex:1}}><b>{l.p.name}</b><div className="note">{l.variant}</div><div>{formatXOF(l.p.price_xof)} FCFA</div>
 <div className="qty"><button aria-label="Moins" onClick={()=>setQty(l.i,l.qty-1)}>−</button><span>{l.qty}</span><button aria-label="Plus" onClick={()=>setQty(l.i,l.qty+1)}>+</button><button className="lnk" onClick={()=>setQty(l.i,0)}>Retirer</button></div></div>
 <b>{formatXOF(l.p.price_xof*l.qty)}</b></li>)}</ul>
 <div className="sum"><div><span>Sous-total</span><b>{formatXOF(sub)} FCFA</b></div><div><span>Frais d’expédition</span><span>À confirmer avant paiement</span></div><Link className="btn btn-primary block" to="/commande">Passer la commande</Link></div></>}

const err=(f)=>f?<span className="err" role="alert">{f}</span>:null
export function Checkout(){const {cart,clear,user}=useStore();const {items}=useProducts();const nav=useNavigate();const L=lines(cart,items)
 const sub=L.reduce((s,l)=>s+l.p.price_xof*l.qty,0);const [f,setF]=useState({name:user?.name||'',phone:'',mode:'home',addr:'',pay:'mtn'});const [e,setE]=useState({})
 const on=k=>ev=>setF({...f,[k]:ev.target.value})
 const go=ev=>{ev.preventDefault();const x={};if(!f.name.trim())x.name='Entrez votre nom complet.';if(!/^\+?[0-9 ]{8,15}$/.test(f.phone.trim()))x.phone='Entrez un numéro valide, par exemple 01 23 45 67 89.';if(f.mode==='home'&&!f.addr.trim())x.addr='Indiquez votre quartier et un repère pour la livraison.';setE(x)
  if(!Object.keys(x).length){clear();nav('/commande/confirmation',{state:{total:sub}})}}
 if(!L.length)return <div className="empty"><p>Votre panier est vide.</p><Link className="btn btn-primary" to="/catalogue">Voir le catalogue</Link></div>
 return <form onSubmit={go} noValidate className="form"><h1 className="ptitle">Validation de commande</h1>
 <h2>1. Vos coordonnées</h2><label>Nom complet<input value={f.name} onChange={on('name')} aria-invalid={!!e.name}/>{err(e.name)}</label>
 <label>Téléphone (Mobile Money)<input type="tel" inputMode="tel" value={f.phone} onChange={on('phone')} aria-invalid={!!e.phone}/>{err(e.phone)}</label>
 <h2>2. Livraison à Cotonou</h2><label className="radio"><input type="radio" checked={f.mode==='home'} onChange={()=>setF({...f,mode:'home'})}/>Livraison à domicile</label>
 <label className="radio"><input type="radio" checked={f.mode==='pickup'} onChange={()=>setF({...f,mode:'pickup'})}/>Retrait à l’entreprise</label>
 {f.mode==='home'&&<label>Adresse et repère<textarea rows="3" value={f.addr} onChange={on('addr')} aria-invalid={!!e.addr}/>{err(e.addr)}</label>}
 <h2>3. Paiement</h2>{[['mtn','MTN Mobile Money'],['moov','Moov Money']].map(([k,n])=><label key={k} className="radio"><input type="radio" checked={f.pay===k} onChange={()=>setF({...f,pay:k})}/>{n}</label>)}
 <p className="note">Opérateurs configurables. Paiement via FedaPay non activé dans cette version de démonstration.</p>
 <div className="sum"><div><span>Sous-total</span><b>{formatXOF(sub)} FCFA</b></div><div><span>Frais d’expédition</span><span>À confirmer avant paiement</span></div>
 <button className="btn btn-primary block" type="submit">Confirmer la commande</button></div></form>}
export function Confirmation(){return <div className="empty"><h1 className="ptitle">Commande reçue (démonstration)</h1><p>Aucun paiement n’a été effectué et aucune commande réelle n’a été créée. Avec Supabase et FedaPay, cet écran affichera le numéro de commande et le statut de paiement.</p><Link className="btn btn-primary" to="/commandes">Voir mes commandes</Link></div>}
