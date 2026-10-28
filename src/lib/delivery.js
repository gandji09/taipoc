// Démonstration : livreurs et livraisons gardés dans ce navigateur. Avec Supabase : tables drivers/deliveries (voir schema.sql).
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
export const DSTATUS={to_assign:'À assigner',assigned:'Assignée',out:'En route',delivered:'Livrée',failed:'Échec'}
const SEED=[
 {id:'L1',orderId:'TP-EXEMPLE-1',customer:'Client exemple',phone:'+229 00 00 00 00',address:'Quartier exemple, Cotonou (repère à renseigner)',items:'Écouteurs sans fil (exemple) × 1',driver:'',status:'to_assign',code:'4821',note:''},
 {id:'L2',orderId:'TP-EXEMPLE-2',customer:'Cliente exemple',phone:'+229 00 00 00 01',address:'Autre quartier exemple, Cotonou',items:'Sac à dos (exemple) × 2',driver:'',status:'to_assign',code:'7350',note:''}]
export const readDrivers=()=>load('tp_drivers',[]);export const writeDrivers=v=>save('tp_drivers',v)
export const readDeliveries=()=>load('tp_deliveries',SEED);export const writeDeliveries=v=>save('tp_deliveries',v)
export const isDriver=email=>readDrivers().some(d=>d.email.toLowerCase()===String(email||'').trim().toLowerCase())
