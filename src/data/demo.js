// DONNÉES DE DÉMONSTRATION : aucun produit, prix, commande ou client réel.
export const DEMO_CATS=['Mode','Électronique','Maison','Beauté','Enfants','Auto-moto','Outils']
const mk=(i,name,cat,price,isNew,variants)=>({id:'demo-'+i,image_url:'/img/'+i+'.svg',name:name+' (exemple)',cat,price_xof:price,old_price_xof:null,is_new:isNew,variants,
 description:'Description du produit à renseigner par l’équipe TAIPOC dans l’administration.',shipping_note:'Hors frais d’expédition'})
export const DEMO_PRODUCTS=[
 mk(1,'Écouteurs sans fil','Électronique',8500,true,['Noir','Blanc']),
 mk(2,'Montre connectée','Électronique',15000,true,['Noir','Argent']),
 mk(3,'Sac à dos','Mode',12000,false,['Noir','Bleu']),
 mk(4,'Lampe LED rechargeable','Maison',4500,false,['Standard']),
 mk(5,'Robe d’été','Mode',9000,true,['S','M','L']),
 mk(6,'Coque de téléphone','Électronique',2000,false,['Standard']),
 mk(7,'Jouet éducatif','Enfants',6000,false,['Standard']),
 mk(8,'Kit d’outils','Outils',18000,false,['Standard'])]
export const STATUS={pending_payment:'En attente de paiement',paid:'Paiement reçu',ordered_supplier:'Commandé auprès du fournisseur',shipped:'Expédié',in_transit:'En transit',arrived_benin:'Arrivé au Bénin',delivered:'Livré',cancelled:'Annulé'}
export const STEPS=['paid','ordered_supplier','shipped','in_transit','arrived_benin','delivered']
export const DEMO_ORDERS=[
 {id:'TP-EXEMPLE-1',date:'Exemple',total:8500,status:'ordered_supplier',client:'Client exemple',items:['Écouteurs sans fil (exemple) × 1']},
 {id:'TP-EXEMPLE-2',date:'Exemple',total:24000,status:'pending_payment',client:'Cliente exemple',items:['Sac à dos (exemple) × 2']}]
export const DEMO_CLIENTS=[{name:'Client exemple',phone:'+229 00 00 00 00',orders:1},{name:'Cliente exemple',phone:'+229 00 00 00 01',orders:1}]
