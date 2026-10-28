import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Store } from './lib/store.jsx'
import App from './App.jsx'
import '@fontsource-variable/inter'
import './styles.css'
createRoot(document.getElementById('root')).render(<BrowserRouter><Store><App/></Store></BrowserRouter>)
// Écran de lancement : logo animé 5 s, une fois par session. Un appui permet de passer.
const sp=document.getElementById('splash')
if(sp){let seen=false;try{seen=!!sessionStorage.getItem('tp_splash')}catch{}
 if(seen)sp.remove();else{let done=false;const hide=()=>{if(done)return;done=true;sp.classList.add('out');setTimeout(()=>sp.remove(),400);try{sessionStorage.setItem('tp_splash','1')}catch{}}
  sp.addEventListener('click',hide);setTimeout(hide,Math.max(0,5000-performance.now()))}}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))
