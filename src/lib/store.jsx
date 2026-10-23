import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { DEMO_PRODUCTS } from '../data/demo.js'
const C=createContext(null)
export const useStore=()=>useContext(C)
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function usePersist(k,d){const [v,set]=useState(()=>load(k,d));useEffect(()=>save(k,v),[k,v]);return [v,set]}
export function Store({children}){
  const [cart,setCart]=usePersist('tp_cart',[]);const [user,setUser]=usePersist('tp_user',null)
  const [fav,setFav]=usePersist('tp_fav',[]);const [recent,setRecent]=usePersist('tp_recent',[]);const [addresses,setAddr]=usePersist('tp_addr',[])
  const add=(id,variant,qty=1)=>setCart(c=>{const l=c.find(x=>x.id===id&&x.variant===variant);return l?c.map(x=>x===l?{...x,qty:x.qty+qty}:x):[...c,{id,variant,qty}]})
  const setQty=(i,q)=>setCart(c=>q<1?c.filter((_,k)=>k!==i):c.map((x,k)=>k===i?{...x,qty:Math.min(q,100)}:x))
  return <C.Provider value={{cart,add,setQty,clear:()=>setCart([]),count:cart.reduce((n,x)=>n+x.qty,0),user,login:setUser,logout:()=>setUser(null),
   fav,toggleFav:id=>setFav(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id]),recent,seen:id=>setRecent(r=>[id,...r.filter(x=>x!==id)].slice(0,12)),
   addresses,addAddress:a=>setAddr(l=>l.includes(a)?l:[...l,a]),removeAddress:i=>setAddr(l=>l.filter((_,k)=>k!==i))}}>{children}</C.Provider>
}
export function useProducts(){
  const [s,set]=useState({items:supabase?[]:DEMO_PRODUCTS,state:supabase?'loading':'ready',demo:!supabase})
  useEffect(()=>{if(!supabase)return
    supabase.from('products').select('*').eq('is_active',true).order('created_at',{ascending:false}).then(({data,error})=>set({items:data||[],state:error?'error':'ready',demo:false}))},[])
  return s
}
