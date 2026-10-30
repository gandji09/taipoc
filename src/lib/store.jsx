import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { DEMO_PRODUCTS } from '../data/demo.js'
const C=createContext(null)
export const useStore=()=>useContext(C)
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function usePersist(k,d){const [v,set]=useState(()=>load(k,d));useEffect(()=>save(k,v),[k,v]);return [v,set]}
export function Store({children}){
  const [cart,setCart]=usePersist('tp_cart',[]);const [user,setUser]=useState(()=>supabase?null:load('tp_user',null));const [ready,setReady]=useState(!supabase)
  useEffect(()=>{if(!supabase)save('tp_user',user)},[user])
  useEffect(()=>{if(!supabase)return
   const seen=id=>supabase.from('profiles').update({last_seen:new Date().toISOString()}).eq('id',id).then(()=>{})
   const load2=async s=>{if(!s){setUser(null);setReady(true);return}
    const {data}=await supabase.from('profiles').select('full_name,phone,is_admin,is_driver').eq('id',s.user.id).maybeSingle()
    setUser({id:s.user.id,email:s.user.email,name:data?.full_name||s.user.email.split('@')[0],phone:data?.phone||'',admin:!!data?.is_admin,driver:!!data?.is_driver});setReady(true);seen(s.user.id)}
   supabase.auth.getSession().then(({data})=>load2(data.session))
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setTimeout(()=>load2(s),0)})
   const t=setInterval(()=>{supabase.auth.getSession().then(({data})=>{if(data.session&&!document.hidden)seen(data.session.user.id)})},120000)
   return()=>{subscription.unsubscribe();clearInterval(t)}},[])
  const [fav,setFav]=usePersist('tp_fav',[]);const [recent,setRecent]=usePersist('tp_recent',[]);const [addresses,setAddr]=usePersist('tp_addr',[])
  const add=(id,variant,qty=1)=>setCart(c=>{const l=c.find(x=>x.id===id&&x.variant===variant);return l?c.map(x=>x===l?{...x,qty:x.qty+qty}:x):[...c,{id,variant,qty}]})
  const setQty=(i,q)=>setCart(c=>q<1?c.filter((_,k)=>k!==i):c.map((x,k)=>k===i?{...x,qty:Math.min(q,100)}:x))
  if(!ready)return null
  return <C.Provider value={{cart,add,setQty,clear:()=>setCart([]),count:cart.reduce((n,x)=>n+x.qty,0),user,login:setUser,logout:()=>supabase?supabase.auth.signOut():setUser(null),
   fav,toggleFav:id=>setFav(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id]),recent,seen:id=>setRecent(r=>[id,...r.filter(x=>x!==id)].slice(0,12)),
   addresses,addAddress:a=>setAddr(l=>l.includes(a)?l:[...l,a]),removeAddress:i=>setAddr(l=>l.filter((_,k)=>k!==i))}}>{children}</C.Provider>
}
const fromAdmin=r=>({id:String(r.id),name:r.name,cat:r.cat,price_xof:+r.price,old_price_xof:r.old?+r.old:null,image_url:r.images?.[0]||null,images:r.images||[],description:r.desc,
 specs:(r.specs||'').split('\n').map(l=>l.split(':')).filter(a=>a[0].trim()&&a[1]).map(a=>[a[0].trim(),a.slice(1).join(':').trim()]),variants:(r.variants||'').split(',').map(v=>v.trim()).filter(Boolean),
 shipping_note:r.ship,is_new:r.isNew,is_qualified:r.qualified,stock_status:r.stock,lead_time_days:r.lead?+r.lead:null})
const readAdmin=()=>{try{const a=JSON.parse(localStorage.getItem('tp_admin_products'));return Array.isArray(a)?a.filter(r=>r.active!==false).map(fromAdmin):null}catch{return null}}
export function useProducts(){
  const [s,set]=useState({items:supabase?[]:(readAdmin()||DEMO_PRODUCTS),state:supabase?'loading':'ready',demo:!supabase})
  useEffect(()=>{if(!supabase){const f=e=>{if(e.key==='tp_admin_products')set(x=>({...x,items:readAdmin()||DEMO_PRODUCTS}))};addEventListener('storage',f);return()=>removeEventListener('storage',f)}
    const load=()=>supabase.from('products').select('*, categories(name)').eq('is_active',true).order('created_at',{ascending:false}).then(({data,error})=>set(x=>error&&x.items.length?x:{items:(data||[]).map(p=>({...p,cat:p.categories?.name})),state:error?'error':'ready',demo:false}))
    load();const t=setInterval(()=>{if(!document.hidden)load()},30000);return()=>clearInterval(t)},[])
  return s
}
