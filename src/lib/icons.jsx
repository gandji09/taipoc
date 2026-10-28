const P={home:'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
 cart:'M3 4h2l2.5 10h10L20 7H6.5M9 19.5a1 1 0 1 0 0 .1M17 19.5a1 1 0 1 0 0 .1',box:'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
 user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.5-4.5',arrow:'M5 12h14M13 6l6 6-6 6',
 chat:'M4 5h16v11H9l-5 4z',phone:'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
 pkg:'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M9.5 15l1.7 1.7L15 13',headset:'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1zM20 19a3 3 0 0 1-3 2h-3',
 head:'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z',shirt:'M8 3l-5 3 2.5 4L8 9v12h8V9l2.5 1L21 6l-5-3a4 4 0 0 1-8 0z',
 lamp:'M9 21h6M10 17h4M8 3h8l2 8H6zM12 11v6',toy:'M3 12h8v8H3zM13 12h8v8h-8zM8 4h8v8H8z',spark:'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
 car:'M3 16v-4l2-5h14l2 5v4M3 16h18M7 19v-3M17 19v-3M3 12h18',tool:'M14.5 6.5a4 4 0 0 1 4-4l-2.5 2.5 2 2 2.5-2.5a4 4 0 0 1-4 4L7 16l-3 1 1-3z',tag:'M3 12l9-9h9v9l-9 9zM16 8h.01'}
export const Ico=({n,s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={P[n]||P.tag}/></svg>
export const catIcon=name=>{const n=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return n.includes('electro')?'head':n.includes('mode')?'shirt':n.includes('maison')?'lamp':n.includes('enfant')?'toy':n.includes('beaut')?'spark':n.includes('auto')?'car':n.includes('outil')?'tool':'tag'}
export const Parcel=({size=30,className})=><svg className={className} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3l11 5.5v13L16 27 5 21.5v-13z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M5 8.5L16 14l11-5.5M16 14v13" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M10.5 5.8l11 5.5" stroke="#F97316" strokeWidth="3" strokeLinecap="round"/></svg>
