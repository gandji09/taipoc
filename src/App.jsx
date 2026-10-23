import { useEffect, useState } from 'react'
import { supabase, WHATSAPP, formatXOF } from './lib/supabase.js'

const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour TAIPOC, j’ai une question.')}`
const DEFAULT_CATS = ['Mode', 'Électronique', 'Maison', 'Beauté', 'Enfants', 'Auto-moto', 'Outils']

function Logo() {
  return (
    <a href="/" className="logo" aria-label="TAIPOC, accueil">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#F97316"/><path d="M9 17a7 7 0 0 1 12-4.5M23 15a7 7 0 0 1-12 4.5" fill="none" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round"/></svg>
      TAIPOC
    </a>
  )
}

function ProductCard({ p }) {
  const promo = p.old_price_xof && p.old_price_xof > p.price_xof
  const pct = promo ? Math.round((1 - p.price_xof / p.old_price_xof) * 100) : 0
  return (
    <a className="card" href={`/produit/${p.id}`}>
      {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" width="400" height="400"/> : <div className="ph" role="img" aria-label="Photo à venir"/>}
      <div className="card-body">
        <div className="card-name">{p.name}</div>
        <div className="price">{formatXOF(p.price_xof)} <small>FCFA</small>{promo && <span className="badge">−{pct} %</span>}</div>
        {promo && <span className="old">{formatXOF(p.old_price_xof)} FCFA</span>}
        <div className="note">{p.shipping_note || 'Hors frais d’expédition'}</div>
      </div>
    </a>
  )
}

function ProductSection({ title, items, state }) {
  return (
    <section className="section" aria-label={title}>
      <div className="section-head"><h2>{title}</h2><a href="/catalogue">Tout voir</a></div>
      {state === 'loading' && <div className="grid">{[1,2,3,4].map(i => <div key={i} className="skeleton"/>)}</div>}
      {state === 'error' && <div className="empty"><p>Le catalogue ne s’est pas chargé. Vérifiez votre connexion.</p><button className="btn btn-secondary" onClick={() => location.reload()}>Réessayer</button></div>}
      {state === 'ready' && items.length === 0 && <div className="empty"><p>Aucun produit pour le moment. L’équipe TAIPOC ajoute bientôt de nouveaux articles.</p></div>}
      {state === 'ready' && items.length > 0 && <div className="grid">{items.map(p => <ProductCard key={p.id} p={p}/>)}</div>}
    </section>
  )
}

export default function App() {
  const [state, setState] = useState(supabase ? 'loading' : 'ready')
  const [products, setProducts] = useState([])
  const [cats, setCats] = useState(DEFAULT_CATS.map(name => ({ name, slug: name })))

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const [pr, ca] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(20),
        supabase.from('categories').select('name,slug').order('position'),
      ])
      if (pr.error) return setState('error')
      setProducts(pr.data || [])
      if (ca.data?.length) setCats(ca.data)
      setState('ready')
    })()
  }, [])

  const news = products.filter(p => p.is_new).slice(0, 10)

  return (
    <>
      <header className="header"><div className="wrap">
        <Logo/>
        <nav className="hlinks" aria-label="Liens rapides"><a href="/aide">Aide</a><a href="/compte">Compte</a><a href="/panier">Panier</a></nav>
        <form className="search" role="search" action="/catalogue">
          <label htmlFor="q" style={{position:'absolute',left:-9999}}>Rechercher un produit</label>
          <input id="q" name="q" type="search" placeholder="Rechercher un produit"/>
          <button type="submit" aria-label="Lancer la recherche">OK</button>
        </form>
      </div></header>

      <main className="wrap">
        <nav className="cats" aria-label="Catégories">
          {cats.map(c => <a key={c.slug} className="cat" href={`/catalogue?cat=${c.slug}`}><span aria-hidden="true">{c.name[0]}</span>{c.name}</a>)}
        </nav>

        <section className="hero">
          <h1>Des produits de Chine, payés en Mobile Money.</h1>
          <p>Vous choisissez, vous payez en FCFA, TAIPOC commande pour vous et vous suivez votre colis jusqu’à Cotonou.</p>
          <a className="btn btn-primary" href="/catalogue">Voir le catalogue</a>
        </section>

        <ul className="trust">
          <li>Paiement Mobile Money via FedaPay</li>
          <li>Suivi de commande dans votre compte</li>
          <li>Assistance en français sur WhatsApp</li>
        </ul>

        <ProductSection title="Produits populaires" items={products.slice(0, 10)} state={state}/>
        {news.length > 0 && <ProductSection title="Nouveautés" items={news} state={state}/>}

        <section className="section">
          <h2 style={{marginBottom:12}}>Comment ça marche</h2>
          <ol className="steps">
            <li><div><b>Je choisis</b>Je parcours le catalogue et j’ajoute au panier.</div></li>
            <li><div><b>Je paie</b>Je règle en Mobile Money.</div></li>
            <li><div><b>TAIPOC commande</b>L’équipe achète auprès du fournisseur.</div></li>
            <li><div><b>Je reçois</b>Livraison à domicile ou retrait à l’entreprise.</div></li>
          </ol>
        </section>

        <section className="section deliv">
          <h2>Livraison à Cotonou</h2>
          <p>Choisissez la livraison à domicile ou passez retirer votre colis à l’entreprise. Les frais et délais exacts sont affichés avant de payer.</p>
        </section>
      </main>

      <footer className="footer"><div className="wrap">
        <div><Logo/><p>Marketplace de produits de Chine pour l’Afrique de l’Ouest. Lancement à Cotonou, Bénin.</p></div>
        <div><a href="/comment-ca-marche">Comment ça marche</a><a href="/livraison">Livraison</a><a href="/retours">Retours</a></div>
        <div><a href="/faq">FAQ</a><a href="/contact">Contact</a><a href={wa}>WhatsApp : +229 40 31 91 81</a></div>
        <div><a href="/cgv">Conditions générales</a><a href="/confidentialite">Confidentialité</a></div>
      </div></footer>

      <a className="btn btn-primary wa" href={wa} target="_blank" rel="noopener">WhatsApp</a>
      <nav className="bottom" aria-label="Navigation principale">
        <a href="/" aria-current="page">Accueil</a><a href="/catalogue">Catégories</a><a href="/panier">Panier</a><a href="/commandes">Commandes</a><a href="/compte">Compte</a>
      </nav>
    </>
  )
}
