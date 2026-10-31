import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
const C=createContext(null)
export const useStore=()=>useContext(C)
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function usePersist(k,d){const [v,set]=useState(()=>load(k,d));useEffect(()=>save(k,v),[k,v]);return [v,set]}
export function Store({children}){
  const [cart,setCart]=usePersist('tp_cart',[]);const [fav,setFav]=usePersist('tp_fav',[]);const [recent,setRecent]=usePersist('tp_recent',[]);const [addresses,setAddr]=usePersist('tp_addr',[])
  const [user,setUser]=useState(null);const [ready,setReady]=useState(false)
  const seen=id=>supabase.from('profiles').update({last_seen:new Date().toISOString()}).eq('id',id).then(()=>{})
  const read=useCallback(async s=>{if(!s){setUser(null);setReady(true);return}
    const {data}=await supabase.from('profiles').select('full_name,phone,is_admin,is_driver').eq('id',s.user.id).maybeSingle()
    setUser({id:s.user.id,email:s.user.email,name:data?.full_name||s.user.email.split('@')[0],phone:data?.phone||'',admin:!!data?.is_admin,driver:!!data?.is_driver});setReady(true)},[])
  useEffect(()=>{supabase.auth.getSession().then(({data})=>{read(data.session);if(data.session)seen(data.session.user.id)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setTimeout(()=>read(s),0)})
    const t=setInterval(()=>{supabase.auth.getSession().then(({data})=>{if(data.session&&!document.hidden)seen(data.session.user.id)})},120000)
    return()=>{subscription.unsubscribe();clearInterval(t)}},[read])
  const add=(id,variant,qty=1,size='')=>setCart(c=>{const l=c.find(x=>x.id===id&&x.variant===variant&&(x.size||'')===size);return l?c.map(x=>x===l?{...x,qty:x.qty+qty}:x):[...c,{id,variant,size,qty}]})
  const setQty=(i,q)=>setCart(c=>q<1?c.filter((_,k)=>k!==i):c.map((x,k)=>k===i?{...x,qty:Math.min(q,100)}:x))
  if(!ready)return null
  return <C.Provider value={{cart,add,setQty,clear:()=>setCart([]),count:cart.reduce((n,x)=>n+x.qty,0),user,logout:()=>supabase.auth.signOut(),refresh:()=>supabase.auth.getSession().then(({data})=>read(data.session)),
   fav,toggleFav:id=>setFav(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id]),recent,seen:id=>setRecent(r=>[id,...r.filter(x=>x!==id)].slice(0,12)),
   addresses,addAddress:a=>setAddr(l=>l.includes(a)?l:[...l,a]),removeAddress:i=>setAddr(l=>l.filter((_,k)=>k!==i))}}>{children}</C.Provider>
}
export function useProducts(){
  const [s,set]=useState({items:[],state:'loading'})
  useEffect(()=>{const go=()=>supabase.from('products').select('*, categories(name)').eq('is_active',true).order('created_at',{ascending:false}).then(({data,error})=>set(x=>error&&x.items.length?x:{items:(data||[]).map(p=>({...p,cat:p.categories?.name})),state:error?'error':'ready'}))
    go();const t=setInterval(()=>{if(!document.hidden)go()},30000);return()=>clearInterval(t)},[])
  return s
}
