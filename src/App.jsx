import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { WHATSAPP } from './lib/supabase.js'
import { useStore } from './lib/store.jsx'
import { Home, Catalogue, Product, Cart, Checkout, Confirmation } from './pages/Shop.jsx'
import { Auth, AccountLayout, Dashboard, Orders, OrderDetail, Addresses, Profile, Support } from './pages/Account.jsx'
import { Info } from './pages/Info.jsx'
import { AdminLayout, AdminHome, AdminOrders, AdminProducts, AdminClients } from './pages/Admin.jsx'
const wa=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour TAIPOC, j’ai une question.')}`
const Logo=()=><Link to="/" className="logo" aria-label="TAIPOC, accueil"><svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#F97316"/><path d="M9 17a7 7 0 0 1 12-4.5M23 15a7 7 0 0 1-12 4.5" fill="none" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round"/></svg>TAIPOC</Link>
export default function App(){const {count,user}=useStore();const nav=useNavigate()
 return <><div className="demobar">Version de démonstration : produits, prix et commandes d’exemple, aucun paiement réel.</div>
 <header className="header"><div className="wrap"><Logo/><nav className="hlinks" aria-label="Liens rapides"><Link to="/aide">Aide</Link><Link to={user?'/compte':'/connexion'}>Compte</Link><Link to="/panier">Panier ({count})</Link></nav>
 <form className="search" role="search" onSubmit={e=>{e.preventDefault();nav('/catalogue?q='+encodeURIComponent(e.target.q.value))}}><label htmlFor="q" className="sr">Rechercher un produit</label><input id="q" name="q" type="search" placeholder="Rechercher un produit"/><button aria-label="Lancer la recherche">OK</button></form></div></header>
 <main className="wrap"><Routes>
  <Route path="/" element={<Home/>}/><Route path="/catalogue" element={<Catalogue/>}/><Route path="/produit/:id" element={<Product/>}/>
  <Route path="/panier" element={<Cart/>}/><Route path="/commande" element={<Checkout/>}/><Route path="/commande/confirmation" element={<Confirmation/>}/>
  <Route path="/connexion" element={<Auth mode="login"/>}/><Route path="/inscription" element={<Auth mode="register"/>}/><Route path="/mot-de-passe-oublie" element={<Auth mode="forgot"/>}/>
  <Route element={<AccountLayout/>}><Route path="/compte" element={<Dashboard/>}/><Route path="/commandes" element={<Orders/>}/><Route path="/commandes/:id" element={<OrderDetail/>}/><Route path="/adresses" element={<Addresses/>}/><Route path="/profil" element={<Profile/>}/><Route path="/assistance" element={<Support/>}/></Route>
  <Route path="/aide" element={<Info slug="comment-ca-marche"/>}/><Route path="/contact" element={<Info slug="contact"/>}/><Route path="/:slug" element={<Info/>}/>
  <Route path="/admin" element={<AdminLayout/>}><Route index element={<AdminHome/>}/><Route path="commandes" element={<AdminOrders/>}/><Route path="produits" element={<AdminProducts/>}/><Route path="clients" element={<AdminClients/>}/></Route>
 </Routes></main>
 <footer className="footer"><div className="wrap"><div><Logo/><p>Marketplace de produits de Chine pour l’Afrique de l’Ouest. Lancement à Cotonou, Bénin.</p></div>
 <div><Link to="/comment-ca-marche">Comment ça marche</Link><Link to="/livraison">Livraison</Link><Link to="/retours">Retours</Link></div>
 <div><Link to="/faq">FAQ</Link><Link to="/contact">Contact</Link><a href={wa}>WhatsApp : +229 40 31 91 81</a></div>
 <div><Link to="/cgv">Conditions générales</Link><Link to="/confidentialite">Confidentialité</Link><Link to="/mentions-legales">Mentions légales</Link></div></div></footer>
 <a className="btn btn-primary wa" href={wa} target="_blank" rel="noopener">WhatsApp</a>
 <nav className="bottom" aria-label="Navigation principale"><NavLink to="/" end>Accueil</NavLink><NavLink to="/catalogue">Catégories</NavLink><NavLink to="/panier">Panier{count>0&&` (${count})`}</NavLink><NavLink to="/commandes">Commandes</NavLink><NavLink to={user?'/compte':'/connexion'}>Compte</NavLink></nav></>}
