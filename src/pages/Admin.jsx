import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { DEMO_ORDERS, DEMO_PRODUCTS, DEMO_CLIENTS, STATUS } from '../data/demo.js'
import { formatXOF } from '../lib/supabase.js'
export const AdminLayout=()=><><h1 className="ptitle">Administration</h1><p className="note demo">Maquette : l’accès sera protégé par Supabase (is_admin) et les données seront réelles.</p>
 <nav className="tabs" aria-label="Admin">{[['/admin','Tableau de bord'],['/admin/commandes','Commandes'],['/admin/produits','Produits et prix'],['/admin/clients','Clients']].map(([t,n])=><NavLink key={t} to={t} end>{n}</NavLink>)}</nav><Outlet/></>
export const AdminHome=()=><div className="kpis">{[['Commandes à traiter',DEMO_ORDERS.length],['Produits',DEMO_PRODUCTS.length],['Clients',DEMO_CLIENTS.length]].map(([k,v])=><div key={k} className="kpi"><b>{v}</b><span>{k}</span></div>)}</div>
export function AdminOrders(){const [o,setO]=useState(DEMO_ORDERS)
 return <div className="tw"><table><thead><tr><th>N°</th><th>Client</th><th>Total</th><th>Statut logistique</th></tr></thead><tbody>{o.map((r,i)=><tr key={r.id}><td>{r.id}</td><td>{r.client}</td><td>{formatXOF(r.total)}</td>
 <td><select aria-label={'Statut '+r.id} value={r.status} onChange={e=>setO(o.map((x,k)=>k===i?{...x,status:e.target.value}:x))}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></td></tr>)}</tbody></table></div>}
export function AdminProducts(){const [p,setP]=useState(DEMO_PRODUCTS);const [n,setN]=useState({name:'',price:''})
 return <><form className="form inline" onSubmit={e=>{e.preventDefault();if(n.name&&n.price){setP([{...DEMO_PRODUCTS[0],id:'n'+p.length,name:n.name,price_xof:+n.price},...p]);setN({name:'',price:''})}}}>
 <label>Nom<input value={n.name} onChange={e=>setN({...n,name:e.target.value})}/></label><label>Prix (FCFA)<input inputMode="numeric" value={n.price} onChange={e=>setN({...n,price:e.target.value})}/></label><button className="btn btn-primary">Ajouter</button></form>
 <div className="tw"><table><thead><tr><th>Produit</th><th>Catégorie</th><th>Prix FCFA</th></tr></thead><tbody>{p.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.cat}</td><td>{formatXOF(r.price_xof)}</td></tr>)}</tbody></table></div></>}
export const AdminClients=()=><div className="tw"><table><thead><tr><th>Nom</th><th>Téléphone</th><th>Commandes</th></tr></thead><tbody>{DEMO_CLIENTS.map(c=><tr key={c.name}><td>{c.name}</td><td>{c.phone}</td><td>{c.orders}</td></tr>)}</tbody></table></div>
