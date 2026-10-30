import { Link, useParams } from 'react-router-dom'
import { WHATSAPP } from '../lib/supabase.js'
import { Cgv } from './Cgv.jsx'
import { Privacy, Mentions } from './Legal.jsx'
const T='Texte à rédiger et faire valider par TAIPOC avant le lancement.'
const PAGES={
'comment-ca-marche':['Comment ça marche',[['Je choisis','Je parcours le catalogue et j’ajoute mes articles au panier.'],['Je paie','Je règle en Mobile Money.'],['TAIPOC commande','L’équipe achète auprès du fournisseur chinois.'],['Je suis et je reçois','Je suis ma commande dans mon compte, puis je la reçois à domicile ou je la retire à l’entreprise.']]],
'livraison':['Livraison',[['À Cotonou','Livraison à domicile ou retrait à l’entreprise.'],['Frais et délais','Affichés et confirmés avant le paiement. Valeurs à renseigner par TAIPOC.'],['Autres pays','Livraison par cargo prévue lors de l’expansion en Afrique de l’Ouest.']]],
'retours':['Annulation, retours et remboursements',[['Annuler avant l’achat chez le fournisseur','À définir par TAIPOC.'],['Produit non conforme ou endommagé','À définir par TAIPOC.'],['Colis perdu','À définir par TAIPOC.'],['Délai et mode de remboursement','À définir par TAIPOC.']]],
'faq':['Questions fréquentes',[['Comment payer ?','En Mobile Money, via FedaPay (à activer).'],['Où suivre ma commande ?','Dans votre compte, rubrique Commandes.'],['Combien de temps pour être livré ?','Le délai estimé est confirmé par TAIPOC avant le paiement.']]],
'cgv':['Conditions générales de vente',[['',T]]],'confidentialite':['Politique de confidentialité',[['',T]]],'mentions-legales':['Mentions légales',[['',T]]]}
export function Info({slug}){const p=useParams().slug||slug;const d=PAGES[p]
 if(p==='cgv')return <Cgv/>
 if(p==='confidentialite')return <Privacy/>
 if(p==='mentions-legales')return <Mentions/>
 if(p==='contact')return <div className="narrow"><h1 className="ptitle">Contact</h1><p>Écrivez-nous en français sur WhatsApp.</p><a className="btn btn-primary" href={`https://wa.me/${WHATSAPP}`}>+229 40 31 91 81</a></div>
 if(!d)return <div className="empty"><p>Cette page n’existe pas.</p><Link className="btn btn-primary" to="/">Accueil</Link></div>
 return <div className="narrow"><h1 className="ptitle">{d[0]}</h1>{d[1].map(([h,t],i)=><section key={i} style={{margin:'16px 0'}}>{h&&<h2 style={{fontSize:17}}>{h}</h2>}<p>{t}</p></section>)}</div>}
