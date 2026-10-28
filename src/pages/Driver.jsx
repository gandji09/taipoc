import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { DSTATUS, readDeliveries, writeDeliveries } from '../lib/delivery.js'
export function DriverApp(){const {user}=useStore();const [d,setD]=useState(readDeliveries);const [code,setCode]=useState({});const [msg,setMsg]=useState({})
 if(!user)return <Navigate to="/connexion" state={{from:'/livreur'}}/>
 if(!user.driver)return <div className="empty"><h1 className="ptitle">Espace livreur</h1><p>Cet espace est réservé aux livreurs enregistrés par TAIPOC.</p></div>
 const up=(id,patch)=>{const n=d.map(x=>x.id===id?{...x,...patch}:x);setD(n);writeDeliveries(n)}
 const confirm=x=>{if((code[x.id]||'').trim()!==x.code)return setMsg({...msg,[x.id]:'Code incorrect. Demandez le code de livraison au client.'});up(x.id,{status:'delivered'})}
 const mine=d.filter(x=>x.driver&&x.driver.toLowerCase()===user.email.toLowerCase());const todo=mine.filter(x=>x.status==='assigned'||x.status==='out');const done=mine.filter(x=>x.status==='delivered'||x.status==='failed')
 const Card=({x})=><li className="line" style={{display:'block'}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><b>{x.orderId}</b><span className={'st'+(x.status==='delivered'?' st-paid':'')}>{DSTATUS[x.status]}</span></div>
  <p style={{margin:'6px 0'}}>{x.customer}</p><p className="note">{x.address}</p><p className="note">{x.items}</p>
  <a className="btn btn-secondary" href={'tel:'+x.phone.replace(/\s/g,'')}>Appeler {x.phone}</a>
  {x.status==='assigned'&&<button className="btn btn-primary block" onClick={()=>up(x.id,{status:'out'})}>Je pars livrer</button>}
  {x.status==='out'&&<><label style={{marginTop:12}}>Code de livraison donné par le client<input inputMode="numeric" maxLength={4} value={code[x.id]||''} onChange={e=>setCode({...code,[x.id]:e.target.value})}/></label>{msg[x.id]&&<span className="err" role="alert">{msg[x.id]}</span>}
   <button className="btn btn-primary block" onClick={()=>confirm(x)}>Confirmer la livraison</button><button className="lnk" onClick={()=>up(x.id,{status:'failed',note:'Client injoignable ou adresse introuvable'})}>Livraison impossible</button></>}</li>
 return <><h1 className="ptitle">Espace livreur</h1><p className="note demo">Démonstration : vous ne voyez que les livraisons qui vous sont confiées. En production, le code est vérifié par le serveur et n’est jamais visible du livreur.</p>
 <h2>À livrer ({todo.length})</h2>{todo.length?<ul className="list">{todo.map(x=><Card key={x.id} x={x}/>)}</ul>:<div className="empty"><p>Aucune livraison à effectuer pour le moment.</p></div>}
 {done.length>0&&<><h2 style={{marginTop:20}}>Terminées</h2><ul className="list">{done.map(x=><Card key={x.id} x={x}/>)}</ul></>}</>}
