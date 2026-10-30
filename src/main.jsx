import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import { Store } from './lib/store.jsx'
import App from './App.jsx'
import '@fontsource-variable/inter'
import './styles.css'
for(const k of ['tp_user','tp_deliveries','tp_drivers','tp_announce']){try{localStorage.removeItem(k)}catch{}}
createRoot(document.getElementById('root')).render(supabase?<BrowserRouter><Store><App/></Store></BrowserRouter>:
 <div className="wrap"><div className="empty" style={{marginTop:40}}><h1 className="ptitle">Configuration manquante</h1><p>La base de données n’est pas connectée. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel, puis redéployez.</p></div></div>)
// Écran de lancement : logo animé 5 s, une fois par session. Un appui permet de passer.
const sp=document.getElementById('splash')
if(sp){let seen=false;try{seen=!!sessionStorage.getItem('tp_splash')}catch{}
 if(seen)sp.remove();else{let done=false;const hide=()=>{if(done)return;done=true;sp.classList.add('out');setTimeout(()=>sp.remove(),400);try{sessionStorage.setItem('tp_splash','1')}catch{}}
  sp.addEventListener('click',hide);setTimeout(hide,Math.max(0,5000-performance.now()))}}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))
