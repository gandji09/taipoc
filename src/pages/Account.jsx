import { useState } from 'react'
import { Link, NavLink, Outlet, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { formatXOF, WHATSAPP, supabase } from '../lib/supabase.js'
import { DEMO_ORDERS, STATUS, STEPS } from '../data/demo.js'
import { isDriver } from '../lib/delivery.js'

export function Auth({mode}){const {login}=useStore();const nav=useNavigate();const loc=useLocation();const [f,setF]=useState({name:'',email:'',pw:''});const [e,setE]=useState({});const [sent,setSent]=useState(false);const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false)
 const on=k=>ev=>setF({...f,[k]:ev.target.value})
 const go=async ev=>{ev.preventDefault();const x={};if(mode==='register'&&!f.name.trim())x.name='Entrez votre nom complet.';if(!/^\S+@\S+\.\S+$/.test(f.email))x.email='Entrez une adresse e-mail valide.'
  if(mode!=='forgot'&&f.pw.length<8)x.pw='Le mot de passe doit contenir au moins 8 caractères.';setE(x);if(Object.keys(x).length)return
  if(supabase){setBusy(true);try{
   if(mode==='forgot'){await supabase.auth.resetPasswordForEmail(f.email.trim(),{redirectTo:location.origin+'/connexion'});return setSent(true)}
   if(mode==='register'){const {data,error}=await supabase.auth.signUp({email:f.email.trim(),password:f.pw,options:{data:{full_name:f.name.trim()}}});if(error)return setE({email:/registered|already/i.test(error.message)?'Cette adresse a déjà un compte.':'Inscription impossible : '+error.message});if(!data.session)return setNotice('Compte créé. Vérifiez votre boîte e-mail pour confirmer votre adresse, puis connectez-vous.');return nav(loc.state?.from||'/compte')}
   const {error}=await supabase.auth.signInWithPassword({email:f.email.trim(),password:f.pw});if(error)return setE({pw:'E-mail ou mot de passe incorrect.'});return nav(loc.state?.from||'/compte')}finally{setBusy(false)}}
  if(mode==='forgot')return setSent(true);const drv=isDriver(f.email);login({name:f.name||f.email.split('@')[0],email:f.email,driver:drv});nav(loc.state?.from||(drv?'/livreur':'/compte'))}
 const T={login:'Connexion',register:'Créer un compte',forgot:'Mot de passe oublié'}[mode]
 return <form onSubmit={go} noValidate className="form narrow"><h1 className="ptitle">{T}</h1>{loc.state?.from&&<p className="okmsg" role="status">Connectez-vous ou créez un compte pour passer commande.</p>}{!supabase&&<p className="note">Version de démonstration : aucun compte réel n’est créé.</p>}{notice&&<p className="okmsg" role="status">{notice}</p>}
 {mode==='register'&&<label>Nom complet<input value={f.name} onChange={on('name')}/>{e.name&&<span className="err" role="alert">{e.name}</span>}</label>}
 <label>E-mail<input type="email" value={f.email} onChange={on('email')}/>{e.email&&<span className="err" role="alert">{e.email}</span>}</label>
 {mode!=='forgot'&&<label>Mot de passe<input type="password" value={f.pw} onChange={on('pw')}/>{e.pw&&<span className="err" role="alert">{e.pw}</span>}</label>}
 {mode==='register'&&<p className="note">En créant un compte, vous reconnaissez avoir pris connaissance de la <Link to="/confidentialite" className="lnk">politique de confidentialité</Link>.</p>}
 {sent&&<p className="okmsg" role="status">Si cette adresse existe, un lien de réinitialisation sera envoyé.</p>}
 <button className="btn btn-primary block" type="submit">{mode==='forgot'?'Envoyer le lien':T}</button>
 {mode==='login'&&<p><Link to="/mot-de-passe-oublie" className="lnk">Mot de passe oublié ?</Link> · <Link to="/inscription" state={loc.state} className="lnk">Créer un compte</Link></p>}
 {mode==='register'&&<p>Déjà inscrit ? <Link to="/connexion" state={loc.state} className="lnk">Se connecter</Link></p>}</form>}

export function AccountLayout(){const {user,logout}=useStore();if(!user)return <Navigate to="/connexion"/>
 return <><h1 className="ptitle">Bonjour {user.name}</h1><nav className="tabs" aria-label="Espace client">{[['/compte','Accueil'],['/commandes','Commandes'],['/demande-livraison','Livreur'],['/adresses','Adresses'],['/favoris','Favoris'],['/profil','Profil'],['/assistance','Assistance']].map(([t,n])=><NavLink key={t} to={t} end>{n}</NavLink>)}<button className="lnk" onClick={logout}>Déconnexion</button></nav><Outlet/></>}
const Badge=({s})=><span className={'st st-'+s}>{STATUS[s]}</span>
export function Dashboard(){return <><div className="note demo">Commandes d’exemple : l’historique réel viendra de Supabase.</div><h2>Commandes en cours</h2><OrderList/></>}
export function OrderList(){return <ul className="list">{DEMO_ORDERS.map(o=><li key={o.id} className="line"><div style={{flex:1}}><Link to={'/commandes/'+o.id}><b>{o.id}</b></Link><div className="note">{o.items.join(', ')}</div></div><div style={{textAlign:'right'}}><b>{formatXOF(o.total)} FCFA</b><br/><Badge s={o.status}/></div></li>)}</ul>}
export const Orders=()=><><h2>Historique des commandes</h2><OrderList/></>
export function OrderDetail(){const {id}=useParams();const o=DEMO_ORDERS.find(x=>x.id===id);if(!o)return <div className="empty">Commande introuvable.</div>
 const idx=STEPS.indexOf(o.status)
 return <><h2>Commande {o.id}</h2><Badge s={o.status}/><p className="note demo">Suivi d’exemple. Une étape n’apparaîtra comme terminée que si l’équipe TAIPOC l’a confirmée.</p>
 <div className="sum"><div><span>Mode de livraison</span><span>À domicile</span></div><div><span>Code de livraison</span><b>4821 (exemple)</b></div><p className="note">Donnez ce code au livreur uniquement à la remise du colis.</p></div>
 <ol className="timeline">{STEPS.map((s,k)=><li key={s} className={k<=idx?'done':''}><b>{STATUS[s]}</b><span className="note">{k<=idx?'Confirmé':'À venir'}</span></li>)}</ol>
 <div className="sum"><div><span>Articles</span><span>{o.items.join(', ')}</span></div><div><span>Total</span><b>{formatXOF(o.total)} FCFA</b></div>
 <a className="btn btn-secondary block" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour, question sur la commande '+o.id)}`}>Contacter l’assistance</a></div></>}
export function Addresses(){const {addresses,addAddress,removeAddress}=useStore();const [a,setA]=useState('');const [e,setE]=useState('')
 return <><h2>Mes adresses</h2>{addresses.length===0&&<div className="empty"><p>Aucune adresse enregistrée.</p></div>}<ul className="list">{addresses.map((x,i)=><li key={x} className="line"><span style={{flex:1}}>{x}</span><button className="lnk" onClick={()=>removeAddress(i)}>Supprimer</button></li>)}</ul>
 <form className="form" noValidate onSubmit={ev=>{ev.preventDefault();if(a.trim().length<8)return setE('Indiquez le quartier et un repère (8 caractères minimum).');addAddress(a.trim());setA('');setE('')}}><label>Nouvelle adresse<textarea rows="2" value={a} onChange={ev=>setA(ev.target.value)}/>{e&&<span className="err" role="alert">{e}</span>}</label><button className="btn btn-secondary">Ajouter l’adresse</button></form></>}
export function Profile(){const {user}=useStore();return <form className="form narrow" onSubmit={e=>e.preventDefault()}><h2>Mes informations</h2><label>Nom<input defaultValue={user.name}/></label><label>E-mail<input defaultValue={user.email} type="email"/></label><label>Téléphone<input type="tel"/></label>
 <fieldset className="opts"><legend>Me prévenir à chaque changement de statut</legend>{['WhatsApp','SMS','E-mail'].map(n=><label key={n} className="radio"><input type="checkbox" defaultChecked={n==='WhatsApp'}/>{n}</label>)}</fieldset><p className="note">Les notifications seront activées avec le backend.</p><button className="btn btn-primary block">Enregistrer</button></form>}
export const Support=()=><><h2>Assistance</h2><p>Une question sur une commande ? Écrivez-nous en français.</p><a className="btn btn-primary" href={`https://wa.me/${WHATSAPP}`}>WhatsApp : +229 40 31 91 81</a><p><Link className="lnk" to="/faq">Consulter la FAQ</Link></p></>
