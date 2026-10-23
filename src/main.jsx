import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Store } from './lib/store.jsx'
import App from './App.jsx'
import './styles.css'
createRoot(document.getElementById('root')).render(<BrowserRouter><Store><App/></Store></BrowserRouter>)

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))
