import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { DEMO_PRODUCTS } from '../data/demo.js'
const C=createContext(null)
export const useStore=()=>useContext(C)
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
export function Store({children}){
  const [cart,setCart]=useState(()=>load('tp_cart',[]))
  const [user,setUser]=useState(()=>load('tp_user',null))
  useEffect(()=>save('tp_cart',cart),[cart]);useEffect(()=>save('tp_user',user),[user])
  const add=(id,variant,qty=1)=>setCart(c=>{const l=c.find(x=>x.id===id&&x.variant===variant);return l?c.map(x=>x===l?{...x,qty:x.qty+qty}:x):[...c,{id,variant,qty}]})
  const setQty=(i,q)=>setCart(c=>q<1?c.filter((_,k)=>k!==i):c.map((x,k)=>k===i?{...x,qty:q}:x))
  return <C.Provider value={{cart,add,setQty,clear:()=>setCart([]),count:cart.reduce((n,x)=>n+x.qty,0),user,login:setUser,logout:()=>setUser(null)}}>{children}</C.Provider>
}
export function useProducts(){
  const [s,set]=useState({items:supabase?[]:DEMO_PRODUCTS,state:supabase?'loading':'ready',demo:!supabase})
  useEffect(()=>{if(!supabase)return
    supabase.from('products').select('*').eq('is_active',true).order('created_at',{ascending:false}).then(({data,error})=>set({items:data||[],state:error?'error':'ready',demo:false}))},[])
  return s
}
