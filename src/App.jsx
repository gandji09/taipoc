import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { WHATSAPP, supabase } from './lib/supabase.js'
import { LiveDashboard, LiveOrders, LiveOrderDetail, LiveSupport, DeliveryRequest, DriverLive, AdminHomeLive, AdminOrdersLive, AdminPaymentsLive, AdminClientsLive, AdminTestimonialsLive, AdminMessagesLive, AdminAnnouncementsLive, AdminDeliveriesLive } from './pages/Live.jsx'
import { useStore, useProducts } from './lib/store.jsx'
import { Ico, Parcel } from './lib/icons.jsx'
import { Home, Catalogue, Product, Cart, Checkout, Confirmation, Favorites } from './pages/Shop.jsx'
import { Auth, AccountLayout, Addresses, Profile } from './pages/Account.jsx'
import { Info } from './pages/Info.jsx'
import { Diag } from './pages/Diag.jsx'
import { AdminLayout, AdminProducts, AdminSecurity } from './pages/Admin.jsx'
const wa=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour TAIPOC, j’ai une question.')}`
const Logo=()=><Link to="/" className="logo" aria-label="TAIPOC, accueil"><Parcel size={30}/>TAIPOC</Link>
function Announce(){const [a,setA]=useState(null)
 useEffect(()=>{const g=async()=>{const {data}=await supabase.from('announcements').select('text').eq('is_active',true).order('created_at',{ascending:false}).limit(1);setA(data?.[0]||null)};g();const t=setInterval(()=>{if(!document.hidden)g()},30000);return()=>clearInterval(t)},[])
 return a?<div className="announce" role="status">{a.text}</div>:null}
export default function App(){const {count,user}=useStore();const {items}=useProducts();const nav=useNavigate();const [hide,setHide]=useState(false)
 useEffect(()=>{let y=scrollY;const f=()=>{const n=scrollY;setHide(n>y&&n>120);y=n};addEventListener('scroll',f,{passive:true});return()=>removeEventListener('scroll',f)},[])
 return <><Announce/>
 <header className="header"><div className="wrap"><Logo/>
  <div className="hactions"><nav className="hlinks" aria-label="Liens rapides"><Link to="/aide">Aide</Link><Link to="/favoris">Favoris</Link></nav>
   <Link className="iconbtn" to={user?'/compte':'/connexion'} aria-label="Mon compte"><Ico n="user"/></Link>
   <Link className="iconbtn" to="/panier" aria-label={'Panier, '+count+' article(s)'}><Ico n="cart"/>{count>0&&<span className="dot">{count}</span>}</Link></div>
  <form className="search" role="search" onSubmit={e=>{e.preventDefault();nav('/catalogue?q='+encodeURIComponent(e.target.q.value))}}><Ico n="search" s={20}/>
   <label htmlFor="q" className="sr">Rechercher un produit</label><input id="q" name="q" type="search" list="sugg" autoComplete="off" placeholder="Rechercher un produit…"/><datalist id="sugg">{items.map(p=><option key={p.id} value={p.name}/>)}</datalist>
   <button aria-label="Lancer la recherche"><Ico n="arrow" s={20}/></button></form></div></header>
 <main className="wrap"><Routes>
  <Route path="/" element={<Home/>}/><Route path="/catalogue" element={<Catalogue/>}/><Route path="/produit/:id" element={<Product/>}/>
  <Route path="/favoris" element={<Favorites/>}/><Route path="/panier" element={<Cart/>}/><Route path="/commande" element={<Checkout/>}/><Route path="/commande/confirmation" element={<Confirmation/>}/>
  <Route path="/connexion" element={<Auth mode="login"/>}/><Route path="/inscription" element={<Auth mode="register"/>}/><Route path="/mot-de-passe-oublie" element={<Auth mode="forgot"/>}/>
  <Route element={<AccountLayout/>}><Route path="/compte" element={<LiveDashboard/>}/><Route path="/commandes" element={<LiveOrders/>}/><Route path="/commandes/:id" element={<LiveOrderDetail/>}/><Route path="/adresses" element={<Addresses/>}/><Route path="/profil" element={<Profile/>}/><Route path="/assistance" element={<LiveSupport/>}/></Route>
  <Route path="/diagnostic" element={<Diag/>}/><Route path="/livreur" element={<DriverLive/>}/><Route path="/demande-livraison" element={<DeliveryRequest/>}/><Route path="/aide" element={<Info slug="comment-ca-marche"/>}/><Route path="/contact" element={<Info slug="contact"/>}/><Route path="/:slug" element={<Info/>}/>
  <Route path="/admin" element={<AdminLayout/>}><Route index element={<AdminHomeLive/>}/><Route path="commandes" element={<AdminOrdersLive/>}/><Route path="paiements" element={<AdminPaymentsLive/>}/><Route path="produits" element={<AdminProducts/>}/><Route path="clients" element={<AdminClientsLive/>}/><Route path="livreurs" element={<AdminDeliveriesLive/>}/><Route path="messages" element={<AdminMessagesLive/>}/><Route path="temoignages" element={<AdminTestimonialsLive/>}/><Route path="annonces" element={<AdminAnnouncementsLive/>}/><Route path="securite" element={<AdminSecurity/>}/></Route>
 </Routes></main>
 <footer className="footer"><div className="wrap"><div><Logo/><p>Marketplace de produits de Chine pour l’Afrique de l’Ouest. Lancement à Cotonou, Bénin.</p></div>
 <div><Link to="/comment-ca-marche">Comment ça marche</Link><Link to="/livraison">Livraison</Link><Link to="/retours">Retours</Link><Link to="/livreur">Espace livreur</Link><Link to="/demande-livraison">Demander un livreur</Link></div>
 <div><Link to="/faq">FAQ</Link><Link to="/contact">Contact</Link><a href={wa}>WhatsApp : +229 40 31 91 81</a></div>
 <div><Link to="/cgv">Conditions générales</Link><Link to="/confidentialite">Confidentialité</Link><Link to="/mentions-legales">Mentions légales</Link></div></div></footer>
 <a className={'wa'+(hide?' hide':'')} href={wa} target="_blank" rel="noopener" aria-label="Écrire à TAIPOC sur WhatsApp"><Ico n="chat" s={22}/></a>
 <nav className="bottom" aria-label="Navigation principale"><NavLink to="/" end><Ico n="home"/>Accueil</NavLink><NavLink to="/catalogue"><Ico n="grid"/>Catégories</NavLink>
  <NavLink to="/panier"><span className="ibox"><Ico n="cart"/>{count>0&&<span className="dot">{count}</span>}</span>Panier</NavLink><NavLink to="/commandes"><Ico n="box"/>Commandes</NavLink><NavLink to={user?'/compte':'/connexion'}><Ico n="user"/>Compte</NavLink></nav></>}
