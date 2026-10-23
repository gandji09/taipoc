import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Store } from './lib/store.jsx'
import App from './App.jsx'
import './styles.css'
createRoot(document.getElementById('root')).render(<BrowserRouter><Store><App/></Store></BrowserRouter>)
// Écran de lancement : logo animé ~2 s, une fois par session.
const sp=document.getElementById('splash')
if(sp){let seen=false;try{seen=!!sessionStorage.getItem('tp_splash')}catch{}
 if(seen)sp.remove();else setTimeout(()=>{sp.classList.add('out');setTimeout(()=>sp.remove(),400);try{sessionStorage.setItem('tp_splash','1')}catch{}},Math.max(0,2000-performance.now()))}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))
