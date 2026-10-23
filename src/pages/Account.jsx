import { useState } from 'react'
import { Link, NavLink, Outlet, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { formatXOF, WHATSAPP } from '../lib/supabase.js'
import { DEMO_ORDERS, STATUS, STEPS } from '../data/demo.js'

export function Auth({mode}){const {login}=useStore();const nav=useNavigate();const [f,setF]=useState({name:'',email:'',pw:''});const [e,setE]=useState({});const [sent,setSent]=useState(false)
 const on=k=>ev=>setF({...f,[k]:ev.target.value})
 const go=ev=>{ev.preventDefault();const x={};if(mode==='register'&&!f.name.trim())x.name='Entrez votre nom complet.';if(!/^\S+@\S+\.\S+$/.test(f.email))x.email='Entrez une adresse e-mail valide.'
  if(mode!=='forgot'&&f.pw.length<8)x.pw='Le mot de passe doit contenir au moins 8 caractères.';setE(x);if(Object.keys(x).length)return
  if(mode==='forgot')return setSent(true);login({name:f.name||f.email.split('@')[0],email:f.email});nav('/compte')}
 const T={login:'Connexion',register:'Créer un compte',forgot:'Mot de passe oublié'}[mode]
 return <form onSubmit={go} noValidate className="form narrow"><h1 className="ptitle">{T}</h1><p className="note">Version de démonstration : aucun compte réel n’est créé.</p>
 {mode==='register'&&<label>Nom complet<input value={f.name} onChange={on('name')}/>{e.name&&<span className="err" role="alert">{e.name}</span>}</label>}
 <label>E-mail<input type="email" value={f.email} onChange={on('email')}/>{e.email&&<span className="err" role="alert">{e.email}</span>}</label>
 {mode!=='forgot'&&<label>Mot de passe<input type="password" value={f.pw} onChange={on('pw')}/>{e.pw&&<span className="err" role="alert">{e.pw}</span>}</label>}
 {sent&&<p className="okmsg" role="status">Si cette adresse existe, un lien de réinitialisation sera envoyé.</p>}
 <button className="btn btn-primary block" type="submit">{mode==='forgot'?'Envoyer le lien':T}</button>
 {mode==='login'&&<p><Link to="/mot-de-passe-oublie" className="lnk">Mot de passe oublié ?</Link> · <Link to="/inscription" className="lnk">Créer un compte</Link></p>}
 {mode==='register'&&<p>Déjà inscrit ? <Link to="/connexion" className="lnk">Se connecter</Link></p>}</form>}

export function AccountLayout(){const {user,logout}=useStore();if(!user)return <Navigate to="/connexion"/>
 return <><h1 className="ptitle">Bonjour {user.name}</h1><nav className="tabs" aria-label="Espace client">{[['/compte','Accueil'],['/commandes','Commandes'],['/adresses','Adresses'],['/profil','Profil'],['/assistance','Assistance']].map(([t,n])=><NavLink key={t} to={t} end>{n}</NavLink>)}<button className="lnk" onClick={logout}>Déconnexion</button></nav><Outlet/></>}
const Badge=({s})=><span className={'st st-'+s}>{STATUS[s]}</span>
export function Dashboard(){return <><div className="note demo">Commandes d’exemple : l’historique réel viendra de Supabase.</div><h2>Commandes en cours</h2><OrderList/></>}
export function OrderList(){return <ul className="list">{DEMO_ORDERS.map(o=><li key={o.id} className="line"><div style={{flex:1}}><Link to={'/commandes/'+o.id}><b>{o.id}</b></Link><div className="note">{o.items.join(', ')}</div></div><div style={{textAlign:'right'}}><b>{formatXOF(o.total)} FCFA</b><br/><Badge s={o.status}/></div></li>)}</ul>}
export const Orders=()=><><h2>Historique des commandes</h2><OrderList/></>
export function OrderDetail(){const {id}=useParams();const o=DEMO_ORDERS.find(x=>x.id===id);if(!o)return <div className="empty">Commande introuvable.</div>
 const idx=STEPS.indexOf(o.status)
 return <><h2>Commande {o.id}</h2><Badge s={o.status}/><p className="note demo">Suivi d’exemple. Une étape n’apparaîtra comme terminée que si l’équipe TAIPOC l’a confirmée.</p>
 <ol className="timeline">{STEPS.map((s,k)=><li key={s} className={k<=idx?'done':''}><b>{STATUS[s]}</b><span className="note">{k<=idx?'Confirmé':'À venir'}</span></li>)}</ol>
 <div className="sum"><div><span>Articles</span><span>{o.items.join(', ')}</span></div><div><span>Total</span><b>{formatXOF(o.total)} FCFA</b></div>
 <a className="btn btn-secondary block" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour, question sur la commande '+o.id)}`}>Contacter l’assistance</a></div></>}
export const Addresses=()=><><h2>Mes adresses</h2><div className="empty"><p>Aucune adresse enregistrée.</p><button className="btn btn-secondary">Ajouter une adresse</button></div></>
export function Profile(){const {user}=useStore();return <form className="form narrow" onSubmit={e=>e.preventDefault()}><h2>Mes informations</h2><label>Nom<input defaultValue={user.name}/></label><label>E-mail<input defaultValue={user.email} type="email"/></label><label>Téléphone<input type="tel"/></label><button className="btn btn-primary block">Enregistrer</button></form>}
export const Support=()=><><h2>Assistance</h2><p>Une question sur une commande ? Écrivez-nous en français.</p><a className="btn btn-primary" href={`https://wa.me/${WHATSAPP}`}>WhatsApp : +229 40 31 91 81</a><p><Link className="lnk" to="/faq">Consulter la FAQ</Link></p></>
