// Démonstration : livreurs et livraisons gardés dans ce navigateur. Avec Supabase : voir schema.sql.
// Deux types de livraisons : « order » (commande TAIPOC à domicile) et « service » (demande d'un client inscrit, même sans achat).
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
export const DSTATUS={to_assign:'À assigner',assigned:'Assignée',out:'En route',delivered:'Livrée',failed:'Échec',cancelled:'Annulée'}
export const CSTATUS={to_assign:'Demande reçue',assigned:'Livreur assigné',out:'En route',delivered:'Livrée',failed:'Livraison impossible',cancelled:'Annulée'}
export const newCode=()=>String(Math.floor(1000+Math.random()*9000))
const SEED=[
 {id:'L1',kind:'order',orderId:'TP-EXEMPLE-1',customer:'Client exemple',phone:'+229 00 00 00 00',pickup:'',address:'Quartier exemple, Cotonou (repère à renseigner)',items:'Écouteurs sans fil (exemple) × 1',driver:'',status:'to_assign',code:'4821',note:'',fee:null},
 {id:'L2',kind:'order',orderId:'TP-EXEMPLE-2',customer:'Cliente exemple',phone:'+229 00 00 00 01',pickup:'',address:'Autre quartier exemple, Cotonou',items:'Sac à dos (exemple) × 2',driver:'',status:'to_assign',code:'7350',note:'',fee:null}]
export const readDrivers=()=>load('tp_drivers',[]);export const writeDrivers=v=>save('tp_drivers',v)
export const readDeliveries=()=>load('tp_deliveries',SEED).map(x=>({kind:'order',pickup:'',fee:null,...x}));export const writeDeliveries=v=>save('tp_deliveries',v)
export const isDriver=email=>readDrivers().some(d=>d.email.toLowerCase()===String(email||'').trim().toLowerCase())
