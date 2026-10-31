import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { supabase } from '../lib/supabase.js'
const Er=({m})=>m?<span className="err" role="alert">{m}</span>:null
export function Auth({mode}){const {user}=useStore();const nav=useNavigate();const loc=useLocation();const [f,setF]=useState({name:'',email:'',pw:''});const [e,setE]=useState({});const [sent,setSent]=useState(false);const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false)
 useEffect(()=>{if(user)nav(loc.state?.from||'/compte',{replace:true})},[user])
 const on=k=>ev=>setF({...f,[k]:ev.target.value})
 const go=async ev=>{ev.preventDefault();const x={};if(mode==='register'&&!f.name.trim())x.name='Entrez votre nom complet.';if(!/^\S+@\S+\.\S+$/.test(f.email))x.email='Entrez une adresse e-mail valide.'
  if(mode!=='forgot'&&f.pw.length<(mode==='register'?10:8))x.pw='Le mot de passe doit contenir au moins '+(mode==='register'?10:8)+' caractères.';setE(x);if(Object.keys(x).length)return
  setBusy(true);try{
   if(mode==='forgot'){await supabase.auth.resetPasswordForEmail(f.email.trim(),{redirectTo:location.origin+'/connexion'});return setSent(true)}
   if(mode==='register'){const {data,error}=await supabase.auth.signUp({email:f.email.trim(),password:f.pw,options:{data:{full_name:f.name.trim()}}});if(error)return setE({email:/registered|already/i.test(error.message)?'Cette adresse a déjà un compte.':'Inscription impossible : '+error.message});if(!data.session)return setNotice('Compte créé. Vérifiez votre boîte e-mail pour confirmer votre adresse, puis connectez-vous.');return}
   const {error}=await supabase.auth.signInWithPassword({email:f.email.trim(),password:f.pw});if(error)return setE({pw:'E-mail ou mot de passe incorrect.'})}finally{setBusy(false)}}
 const T={login:'Connexion',register:'Créer un compte',forgot:'Mot de passe oublié'}[mode]
 return <form onSubmit={go} noValidate className="form narrow"><h1 className="ptitle">{T}</h1>{loc.state?.from&&<p className="okmsg" role="status">Connectez-vous ou créez un compte pour continuer.</p>}
 {mode==='register'&&<label>Nom complet<input value={f.name} onChange={on('name')} autoComplete="name"/><Er m={e.name}/></label>}
 <label>E-mail<input type="email" value={f.email} onChange={on('email')} autoComplete="email"/><Er m={e.email}/></label>
 {mode!=='forgot'&&<label>Mot de passe<input type="password" value={f.pw} onChange={on('pw')} autoComplete={mode==='register'?'new-password':'current-password'}/><Er m={e.pw}/></label>}
 {sent&&<p className="okmsg" role="status">Si cette adresse existe, un lien de réinitialisation sera envoyé.</p>}{notice&&<p className="okmsg" role="status">{notice}</p>}
 <button className="btn btn-primary block" type="submit" disabled={busy}>{busy?'Patientez…':mode==='forgot'?'Envoyer le lien':T}</button>
 {mode==='login'&&<p><Link to="/mot-de-passe-oublie" className="lnk">Mot de passe oublié ?</Link> · <Link to="/inscription" state={loc.state} className="lnk">Créer un compte</Link></p>}
 {mode==='register'&&<p>Déjà inscrit ? <Link to="/connexion" state={loc.state} className="lnk">Se connecter</Link></p>}</form>}
export function AccountLayout(){const {user,logout}=useStore();if(!user)return <Navigate to="/connexion"/>
 const tabs=[['/compte','Accueil'],['/commandes','Commandes'],['/demande-livraison','Livraison'],['/adresses','Adresses'],['/favoris','Favoris'],['/profil','Profil'],['/assistance','Assistance']]
 if(user.driver)tabs.push(['/livreur','Espace livreur']);if(user.admin)tabs.push(['/admin','Administration'])
 return <><h1 className="ptitle">Bonjour {user.name}</h1><nav className="tabs" aria-label="Espace client">{tabs.map(([t,n])=><NavLink key={t} to={t} end>{n}</NavLink>)}<button className="lnk" onClick={logout}>Déconnexion</button></nav><Outlet/></>}
export function Addresses(){const {addresses,addAddress,removeAddress}=useStore();const [a,setA]=useState('');const [e,setE]=useState('')
 return <><h2>Mes adresses</h2>{addresses.length===0&&<div className="empty"><p>Aucune adresse enregistrée.</p></div>}<ul className="list">{addresses.map((x,i)=><li key={x} className="line"><span style={{flex:1}}>{x}</span><button className="lnk" onClick={()=>removeAddress(i)}>Supprimer</button></li>)}</ul>
 <form className="form" noValidate onSubmit={ev=>{ev.preventDefault();if(a.trim().length<8)return setE('Indiquez le quartier et un repère (8 caractères minimum).');addAddress(a.trim());setA('');setE('')}}><label>Nouvelle adresse<textarea rows="2" value={a} onChange={ev=>setA(ev.target.value)}/><Er m={e}/></label><button className="btn btn-secondary">Ajouter l’adresse</button></form></>}
export function Profile(){const {user,refresh}=useStore();const [f,setF]=useState({name:user.name||'',phone:user.phone||''});const [pw,setPw]=useState('');const [m,setM]=useState('');const [m2,setM2]=useState('')
 const save=async ev=>{ev.preventDefault();const {error}=await supabase.from('profiles').update({full_name:f.name.trim(),phone:f.phone.trim()}).eq('id',user.id);setM(error?'Enregistrement impossible : '+error.message:'Informations enregistrées.');if(!error)refresh()}
 const chg=async ev=>{ev.preventDefault();if(pw.length<10)return setM2('Le mot de passe doit contenir au moins 10 caractères.');const {error}=await supabase.auth.updateUser({password:pw});setM2(error?'Changement impossible : '+error.message:'Mot de passe modifié.');if(!error)setPw('')}
 return <><form className="form narrow" onSubmit={save}><h2>Mes informations</h2><label>Nom<input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label><label>E-mail<input value={user.email} disabled/></label><label>Téléphone<input type="tel" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></label><button className="btn btn-primary block">Enregistrer</button>{m&&<p role="status" className={m.startsWith('Info')?'okmsg':'err'}>{m}</p>}</form>
 <form className="form narrow" style={{marginTop:24}} onSubmit={chg}><h2>Changer mon mot de passe</h2><label>Nouveau mot de passe<input type="password" autoComplete="new-password" value={pw} onChange={e=>setPw(e.target.value)}/></label><button className="btn btn-secondary block">Changer</button>{m2&&<p role="status" className={m2.startsWith('Mot')?'okmsg':'err'}>{m2}</p>}</form></>}
