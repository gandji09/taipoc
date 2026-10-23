import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { WHATSAPP } from './lib/supabase.js'
import { useStore, useProducts } from './lib/store.jsx'
import { Home, Catalogue, Product, Cart, Checkout, Confirmation, Favorites } from './pages/Shop.jsx'
import { Auth, AccountLayout, Dashboard, Orders, OrderDetail, Addresses, Profile, Support } from './pages/Account.jsx'
import { Info } from './pages/Info.jsx'
import { AdminLayout, AdminHome, AdminOrders, AdminProducts, AdminClients } from './pages/Admin.jsx'
const I=({d})=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>
const P={"home": "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", "grid": "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", "cart": "M3 4h2l2.5 10h10L20 7H6.5M9 19.5a1 1 0 1 0 0 .1M17 19.5a1 1 0 1 0 0 .1", "box": "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10", "user": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"}
const wa=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour TAIPOC, j’ai une question.')}`
const Logo=()=><Link to="/" className="logo" aria-label="TAIPOC, accueil"><svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#F97316"/><path d="M9 17a7 7 0 0 1 12-4.5M23 15a7 7 0 0 1-12 4.5" fill="none" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round"/></svg>TAIPOC</Link>
export default function App(){const {count,user}=useStore();const {items}=useProducts();const nav=useNavigate()
 return <><header className="header"><div className="wrap"><Logo/><nav className="hlinks" aria-label="Liens rapides"><Link to="/aide">Aide</Link><Link to="/favoris">Favoris</Link><Link to={user?'/compte':'/connexion'}>Compte</Link><Link to="/panier">Panier ({count})</Link></nav>
 <form className="search" role="search" onSubmit={e=>{e.preventDefault();nav('/catalogue?q='+encodeURIComponent(e.target.q.value))}}><label htmlFor="q" className="sr">Rechercher un produit</label><input id="q" name="q" type="search" list="sugg" autoComplete="off" placeholder="Rechercher un produit"/><datalist id="sugg">{items.map(p=><option key={p.id} value={p.name}/>)}</datalist><button aria-label="Lancer la recherche">OK</button></form></div></header>
 <main className="wrap"><Routes>
  <Route path="/" element={<Home/>}/><Route path="/catalogue" element={<Catalogue/>}/><Route path="/produit/:id" element={<Product/>}/>
  <Route path="/favoris" element={<Favorites/>}/><Route path="/panier" element={<Cart/>}/><Route path="/commande" element={<Checkout/>}/><Route path="/commande/confirmation" element={<Confirmation/>}/>
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
 <nav className="bottom" aria-label="Navigation principale"><NavLink to="/" end><I d={P.home}/>Accueil</NavLink><NavLink to="/catalogue"><I d={P.grid}/>Catégories</NavLink><NavLink to="/panier"><I d={P.cart}/>Panier{count>0&&` (${count})`}</NavLink><NavLink to="/commandes"><I d={P.box}/>Commandes</NavLink><NavLink to={user?'/compte':'/connexion'}><I d={P.user}/>Compte</NavLink></nav></>}
