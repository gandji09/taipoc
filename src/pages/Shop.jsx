import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { formatXOF, WHATSAPP } from '../lib/supabase.js'
import { useStore, useProducts } from '../lib/store.jsx'
import { DEMO_CATS } from '../data/demo.js'
import { Ico, Parcel, catIcon } from '../lib/icons.jsx'

const catNames=items=>{const n=[...new Set(items.map(p=>p.cat).filter(Boolean))];return n.length?n:DEMO_CATS}
export const Price=({p})=>{const promo=p.old_price_xof>p.price_xof
 return <div className="price">{formatXOF(p.price_xof)} <small>FCFA</small>{promo&&<><span className="badge">−{Math.round((1-p.price_xof/p.old_price_xof)*100)} %</span> <span className="old">{formatXOF(p.old_price_xof)}</span></>}</div>}
export const Ph=({name})=><div className="ph" role="img" aria-label={'Photo de '+name}><span>{name[0]}</span></div>
export function Card({p}){return <Link className="card" to={'/produit/'+p.id}>{p.image_url?<img src={p.image_url} alt={p.name} loading="lazy"/>:<Ph name={p.name}/>}
 <div className="card-body"><div className="card-name">{p.name}</div><Price p={p}/>{p.stock_status&&<div className="note">{p.stock_status}</div>}<div className="note">{p.shipping_note||'Hors frais d’expédition'}</div></div></Link>}
function Grid({items,state}){
 if(state==='loading')return <div className="grid">{[1,2,3,4].map(i=><div key={i} className="skeleton"/>)}</div>
 if(state==='error')return <div className="empty"><p>Le catalogue ne s’est pas chargé. Vérifiez votre connexion.</p><button className="btn btn-secondary" onClick={()=>location.reload()}>Réessayer</button></div>
 if(!items.length)return <div className="empty"><p>Aucun produit ne correspond. Essayez un autre mot ou une autre catégorie.</p><Link className="btn btn-secondary" to="/catalogue">Tout le catalogue</Link></div>
 return <div className="grid">{items.map(p=><Card key={p.id} p={p}/>)}</div>}

export function Home(){const {items,state}=useProducts();const {recent}=useStore();const rv=recent.map(id=>items.find(p=>p.id===id)).filter(Boolean).slice(0,6)
 return <>
 <nav className="cats" aria-label="Catégories">{catNames(items).map(c=><Link key={c} className="cat" to={'/catalogue?cat='+encodeURIComponent(c)}><span aria-hidden="true"><Ico n={catIcon(c)} s={26}/></span>{c}</Link>)}</nav>
 <section className="hero"><div><h1>Achetez en Chine. Payez en FCFA.</h1><p>Commandez facilement, payez en FCFA et suivez vos achats jusqu’à la livraison.</p><Link className="btn btn-primary" to="/catalogue">Découvrir les produits</Link></div><Parcel className="art" size={72}/></section>
 <ul className="trust"><li><Ico n="phone"/>Paiement Mobile Money</li><li><Ico n="pkg"/>Suivi des commandes</li><li><Ico n="headset"/>Assistance client</li></ul>
 <section className="section"><div className="section-head"><h2>Produits populaires</h2><Link to="/catalogue">Tout voir</Link></div><Grid items={items.slice(0,10)} state={state}/></section>
 {catNames(items).slice(0,3).map(c=>{const L=items.filter(p=>p.cat===c).slice(0,6);return L.length?<section key={c} className="section"><div className="section-head"><h2>{c}</h2><Link to={'/catalogue?cat='+encodeURIComponent(c)}>Tout voir</Link></div><Grid items={L} state="ready"/></section>:null})}
 {rv.length>0&&<section className="section"><div className="section-head"><h2>Vus récemment</h2></div><Grid items={rv} state="ready"/></section>}
 {items.some(p=>p.is_new)&&<section className="section"><div className="section-head"><h2>Nouveautés</h2><Link to="/catalogue?sort=new">Tout voir</Link></div><Grid items={items.filter(p=>p.is_new).slice(0,10)} state="ready"/></section>}
 <section className="section"><h2 style={{marginBottom:12}}>Comment ça marche</h2><ol className="steps"><li><div><b>Je choisis</b>Je parcours le catalogue.</div></li><li><div><b>Je paie</b>Je règle en Mobile Money.</div></li><li><div><b>TAIPOC commande</b>L’équipe achète auprès du fournisseur.</div></li><li><div><b>Je reçois</b>À domicile ou retrait à l’entreprise.</div></li></ol></section></>}
export function Catalogue(){const {items,state}=useProducts();const [sp,setSp]=useSearchParams()
 const q=sp.get('q')||'',cat=sp.get('cat')||'',sort=sp.get('sort')||''
 const set=(k,v)=>{const n=new URLSearchParams(sp);v?n.set(k,v):n.delete(k);setSp(n)}
 let list=items.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())&&(!cat||p.cat===cat))
 if(sort==='asc')list=[...list].sort((a,b)=>a.price_xof-b.price_xof);if(sort==='desc')list=[...list].sort((a,b)=>b.price_xof-a.price_xof);if(sort==='new')list=list.filter(p=>p.is_new)
 return <><h1 className="ptitle">Catalogue</h1>
 <div className="filters"><label>Catégorie<select value={cat} onChange={e=>set('cat',e.target.value)}><option value="">Toutes</option>{catNames(items).map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Trier par<select value={sort} onChange={e=>set('sort',e.target.value)}><option value="">Pertinence</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option><option value="new">Nouveautés</option></select></label></div>
 <p className="note">{state==='ready'?list.length+' produit(s)'+(q?' pour « '+q+' »':''):''}</p><Grid items={list} state={state}/></>}

function Gallery({p}){const imgs=p.images?.length?p.images:p.image_url?[p.image_url]:[];const [i,setI]=useState(0)
 return <div>{imgs.length?<img className="pimg" src={imgs[i]} alt={p.name+', photo '+(i+1)}/>:<Ph name={p.name}/>}{imgs.length>1&&<div className="thumbs">{imgs.map((s,k)=><button key={k} aria-label={'Photo '+(k+1)} className={k===i?'on':''} onClick={()=>setI(k)}><img src={s} alt=""/></button>)}</div>}</div>}
export function Favorites(){const {fav}=useStore();const {items,state}=useProducts();const L=items.filter(p=>fav.includes(p.id))
 return <><h1 className="ptitle">Mes favoris</h1>{L.length?<Grid items={L} state={state}/>:<div className="empty"><p>Aucun favori pour l’instant. Touchez le cœur sur un produit pour le retrouver ici.</p><Link className="btn btn-primary" to="/catalogue">Voir le catalogue</Link></div>}</>}
export function Product(){const {id}=useParams();const {items,state}=useProducts();const {add}=useStore();const nav=useNavigate()
 const p=items.find(x=>x.id===id);const [v,setV]=useState('');const [q,setQ]=useState(1);const [ok,setOk]=useState(false);const {fav,toggleFav,seen}=useStore();useEffect(()=>{if(p)seen(p.id)},[p?.id])
 if(state==='loading')return <div className="skeleton" style={{height:320}}/>
 if(!p)return <div className="empty"><p>Ce produit n’existe pas ou n’est plus disponible.</p><Link className="btn btn-primary" to="/catalogue">Retour au catalogue</Link></div>
 const isFav=fav.includes(p.id);const vs=p.variants||[];const variant=v||vs[0]||''
 return <div className="pdp"><Gallery p={p}/>
 <div><h1 style={{fontSize:22}}>{p.name}</h1><Price p={p}/><button className="fav" aria-pressed={isFav} onClick={()=>toggleFav(p.id)}>{isFav?'♥ Dans mes favoris':'♡ Ajouter aux favoris'}</button><div className="pricebox"><div><span>Produit × {q}</span><b>{formatXOF(p.price_xof*q)} FCFA</b></div><div><span>Expédition</span><span>À confirmer avant paiement</span></div><div><span>Délai estimé</span><span>{p.lead_time_days?p.lead_time_days+' jours (estimation)':'À confirmer'}</span></div></div>
 {vs.length>0&&<fieldset className="opts"><legend>Variante</legend>{vs.map(x=><button key={x} className={'chip'+(x===variant?' on':'')} aria-pressed={x===variant} onClick={()=>setV(x)}>{x}</button>)}</fieldset>}
 <div className="qty"><button aria-label="Moins" onClick={()=>setQ(Math.max(1,q-1))}>−</button><span>{q}</span><button aria-label="Plus" onClick={()=>setQ(q+1)}>+</button></div>
 <button className="btn btn-primary block" disabled={p.stock_status==='Indisponible'} onClick={()=>{add(p.id,variant,q);setOk(true)}}>{p.stock_status==='Indisponible'?'Indisponible pour le moment':'Ajouter au panier'}</button>
 {ok&&<p role="status" className="okmsg">Ajouté au panier. <Link to="/panier">Voir le panier</Link></p>}
 <div className="deliv" style={{marginTop:16}}><b>Livraison</b><p>Délai estimé : à confirmer par TAIPOC. Livraison à domicile ou retrait à l’entreprise à Cotonou. <Link to="/livraison">Détails</Link></p></div>
 <h2 style={{margin:'20px 0 8px',fontSize:16}}>Description</h2><p>{p.description}</p>{p.specs?.length>0&&<><h2 style={{margin:'20px 0 8px',fontSize:16}}>Caractéristiques</h2><table className="specs"><tbody>{p.specs.map(([k,val])=><tr key={k}><th>{k}</th><td>{val}</td></tr>)}</tbody></table></>}
 <a className="btn btn-secondary block" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour, une question sur : '+p.name)}`}>Poser une question sur WhatsApp</a></div>
 <section className="section" style={{gridColumn:'1/-1'}}><h2 style={{marginBottom:12}}>Produits similaires</h2><Grid items={items.filter(x=>x.id!==p.id&&x.cat===p.cat).slice(0,5)} state="ready"/></section></div>}

export function lines(cart,items){return cart.map((l,i)=>({...l,i,p:items.find(x=>x.id===l.id)})).filter(l=>l.p)}
export function Cart(){const {cart,setQty,user}=useStore();const {items}=useProducts();const L=lines(cart,items);const sub=L.reduce((s,l)=>s+l.p.price_xof*l.qty,0)
 if(!L.length)return <div className="empty"><h1 className="ptitle">Panier</h1><p>Votre panier est vide.</p><Link className="btn btn-primary" to="/catalogue">Découvrir le catalogue</Link></div>
 return <><h1 className="ptitle">Panier</h1><ul className="list">{L.map(l=><li key={l.i} className="line"><div className="thumb">{l.p.image_url?<img src={l.p.image_url} alt=""/>:<Ph name={l.p.name}/>}</div>
 <div style={{flex:1}}><b>{l.p.name}</b><div className="note">{l.variant}</div><div>{formatXOF(l.p.price_xof)} FCFA</div>
 <div className="qty"><button aria-label="Moins" onClick={()=>setQty(l.i,l.qty-1)}>−</button><span>{l.qty}</span><button aria-label="Plus" onClick={()=>setQty(l.i,l.qty+1)}>+</button><button className="lnk" onClick={()=>setQty(l.i,0)}>Retirer</button></div></div>
 <b>{formatXOF(l.p.price_xof*l.qty)}</b></li>)}</ul>
 <div className="sum"><div><span>Sous-total</span><b>{formatXOF(sub)} FCFA</b></div><div><span>Frais d’expédition</span><span>À confirmer avant paiement</span></div>{user?<Link className="btn btn-primary block" to="/commande">Passer la commande</Link>:<><Link className="btn btn-primary block" to="/connexion" state={{from:'/commande'}}>Se connecter pour commander</Link><p className="note">Un compte est nécessaire pour commander et suivre vos colis.</p></>}</div></>}

const err=(f)=>f?<span className="err" role="alert">{f}</span>:null
export function Checkout(){const {cart,clear,user,addresses}=useStore();const {items}=useProducts();const nav=useNavigate();const L=lines(cart,items)
 const sub=L.reduce((s,l)=>s+l.p.price_xof*l.qty,0);const [f,setF]=useState({name:user?.name||'',phone:'',mode:'home',addr:'',pay:'mtn'});const [e,setE]=useState({})
 const on=k=>ev=>setF({...f,[k]:ev.target.value})
 const go=ev=>{ev.preventDefault();const x={};if(!f.name.trim())x.name='Entrez votre nom complet.';if(!/^\+?[0-9 ]{8,15}$/.test(f.phone.trim()))x.phone='Entrez un numéro valide, par exemple 01 23 45 67 89.';if(f.mode==='home'&&!f.addr.trim())x.addr='Indiquez votre quartier et un repère pour la livraison.';setE(x)
  if(!Object.keys(x).length){clear();nav('/commande/confirmation',{state:{total:sub}})}}
 if(!L.length)return <div className="empty"><p>Votre panier est vide.</p><Link className="btn btn-primary" to="/catalogue">Voir le catalogue</Link></div>
 if(!user)return <Navigate to="/connexion" state={{from:'/commande'}}/>
 return <form onSubmit={go} noValidate className="form"><h1 className="ptitle">Validation de commande</h1>
 <h2>1. Vos coordonnées</h2><label>Nom complet<input value={f.name} onChange={on('name')} aria-invalid={!!e.name}/>{err(e.name)}</label>
 <label>Téléphone (Mobile Money)<input type="tel" inputMode="tel" value={f.phone} onChange={on('phone')} aria-invalid={!!e.phone}/>{err(e.phone)}</label>
 <h2>2. Livraison à Cotonou</h2><label className="radio"><input type="radio" checked={f.mode==='home'} onChange={()=>setF({...f,mode:'home'})}/>Livraison à domicile</label>
 <label className="radio"><input type="radio" checked={f.mode==='pickup'} onChange={()=>setF({...f,mode:'pickup'})}/>Retrait à l’entreprise</label>
 {f.mode==='home'&&<p className="note">À la remise, le livreur vous demandera un code de livraison, visible dans votre commande.</p>}
 {addresses.length>0&&f.mode==='home'&&<label>Adresses enregistrées<select onChange={ev=>setF({...f,addr:ev.target.value})}><option value="">Choisir…</option>{addresses.map(x=><option key={x}>{x}</option>)}</select></label>}
 {f.mode==='home'&&<label>Adresse et repère<textarea rows="3" value={f.addr} onChange={on('addr')} aria-invalid={!!e.addr}/>{err(e.addr)}</label>}
 <h2>3. Paiement</h2>{[['mtn','MTN Mobile Money'],['moov','Moov Money']].map(([k,n])=><label key={k} className="radio"><input type="radio" checked={f.pay===k} onChange={()=>setF({...f,pay:k})}/>{n}</label>)}
 <p className="note">Opérateurs configurables. Paiement via FedaPay non activé dans cette version de démonstration.</p>
 <div className="sum"><div><span>Sous-total</span><b>{formatXOF(sub)} FCFA</b></div><div><span>Frais d’expédition</span><span>À confirmer avant paiement</span></div>
 <button className="btn btn-primary block" type="submit">Confirmer la commande</button></div></form>}
export function Confirmation(){return <div className="empty"><h1 className="ptitle">Commande reçue (démonstration)</h1><p>Aucun paiement n’a été effectué et aucune commande réelle n’a été créée. Avec Supabase et FedaPay, cet écran affichera le numéro de commande et le statut de paiement.</p><Link className="btn btn-primary" to="/commandes">Voir mes commandes</Link></div>}
