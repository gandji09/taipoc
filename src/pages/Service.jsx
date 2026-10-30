import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { CSTATUS, readDeliveries, writeDeliveries, newCode } from '../lib/delivery.js'
import { formatXOF } from '../lib/supabase.js'
export function Deliveries(){const {user}=useStore();const [all,setAll]=useState(readDeliveries);const [f,setF]=useState({pickup:'',drop:'',phone:'',what:'',note:''});const [e,setE]=useState({});const [ok,setOk]=useState(false)
 const mine=all.filter(x=>x.kind==='service'&&x.owner===user.email);const on=k=>ev=>setF({...f,[k]:ev.target.value})
 const submit=ev=>{ev.preventDefault();const x={};if(f.pickup.trim().length<8)x.pickup='Indiquez l’adresse de ramassage (quartier et repère).';if(f.drop.trim().length<8)x.drop='Indiquez l’adresse de livraison (quartier et repère).'
  if(!/^\+?[0-9 ]{8,15}$/.test(f.phone.trim()))x.phone='Entrez un numéro valide, par exemple 01 23 45 67 89.';if(f.what.trim().length<3)x.what='Dites ce qu’il faut livrer.';setE(x);if(Object.keys(x).length)return
  const ref='LIV-'+String(Date.now()).slice(-6);const d={id:ref,kind:'service',orderId:ref,owner:user.email,customer:user.name,phone:f.phone.trim(),pickup:f.pickup.trim(),address:f.drop.trim(),items:f.what.trim(),note:f.note.trim(),driver:'',status:'to_assign',code:newCode(),fee:null}
  const n=[d,...all];setAll(n);writeDeliveries(n);setF({pickup:'',drop:'',phone:'',what:'',note:''});setOk(true)}
 const cancel=id=>{const n=all.map(x=>x.id===id?{...x,status:'cancelled'}:x);setAll(n);writeDeliveries(n)}
 const err=k=>e[k]&&<span className="err" role="alert">{e[k]}</span>
 return <><h2>Demander un livreur</h2><p>Inscrit sur TAIPOC, vous pouvez demander un livreur pour vos propres colis, même si vous n’avez rien acheté chez nous. L’équipe vous assigne un livreur et vous suivez la livraison ici.</p>
 <form className="form" noValidate onSubmit={submit}><label>Adresse de ramassage<textarea rows="2" value={f.pickup} onChange={on('pickup')} aria-invalid={!!e.pickup}/>{err('pickup')}</label>
 <label>Adresse de livraison<textarea rows="2" value={f.drop} onChange={on('drop')} aria-invalid={!!e.drop}/>{err('drop')}</label>
 <label>Téléphone de contact<input type="tel" inputMode="tel" value={f.phone} onChange={on('phone')} aria-invalid={!!e.phone}/>{err('phone')}</label>
 <label>Que faut-il livrer ?<input value={f.what} onChange={on('what')} aria-invalid={!!e.what}/>{err('what')}</label>
 <label>Remarques (facultatif)<textarea rows="2" value={f.note} onChange={on('note')}/></label>
 <p className="note">Les frais éventuels vous sont communiqués par TAIPOC avant la prise en charge.</p>
 <button className="btn btn-primary block" type="submit">Envoyer la demande</button>{ok&&<p className="okmsg" role="status">Demande reçue. Un livreur vous sera assigné.</p>}</form>
 <h2 style={{marginTop:24}}>Mes demandes</h2>{mine.length===0?<div className="empty"><p>Aucune demande pour l’instant.</p></div>:<ul className="list">{mine.map(x=><li key={x.id} className="line" style={{display:'block'}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:8}}><b>{x.orderId}</b><span className={'st'+(x.status==='delivered'?' st-paid':'')}>{CSTATUS[x.status]}</span></div>
  <p className="note">De : {x.pickup}</p><p className="note">À : {x.address}</p><p className="note">{x.items}</p>
  <p className="note">Tarif : {x.fee?formatXOF(x.fee)+' FCFA':'à confirmer par TAIPOC'}</p>
  {(x.status==='assigned'||x.status==='out')&&<p><b>Code de livraison : {x.code}</b><br/><span className="note">Donnez-le à la personne qui reçoit le colis : elle le dira au livreur à la remise.</span></p>}
  {x.status==='to_assign'&&<button className="lnk" onClick={()=>cancel(x.id)}>Annuler la demande</button>}</li>)}</ul>}</>}

export function DeliveryRequest(){const {user}=useStore();if(!user)return <Navigate to="/connexion" state={{from:'/demande-livraison'}}/>
 return <><h1 className="ptitle">Livraison à la demande</h1><Deliveries/></>}
