const P={
 headphones:'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3',
 shirt:'M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z',
 home:'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
 toy:'M4 20h6v-6H4zM14 20h6v-6h-6zM9 14h6V8H9z',
 sparkles:'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
 car:'M5 17h14M3 13l2-6h14l2 6v4H3zM7 17v2M17 17v2M7 13h.01M17 13h.01',
 wrench:'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
 tag:'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
 user:'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
 cart:'M3 3h2l2.4 11.2a1 1 0 0 0 .8.8h8.8a1 1 0 0 0 1-.76L20 7H6M9 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01',
 box:'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12M3.3 7 12 12l8.7-5M7.5 4.27l9 5.15',
 grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
 chat:'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z',
 phone:'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
 truck:'M2 6h11v10H2zM13 9h4l3 3v4h-7zM6 19a1.5 1.5 0 1 0 0 .01M17 19a1.5 1.5 0 1 0 0 .01',
 headset:'M4 13v-1a8 8 0 0 1 16 0v1M4 13h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM20 13h-2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1zM19 18a4 4 0 0 1-4 3h-2'}
export const Icon=({n,size=22,...r})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...r}><path d={P[n]||P.tag}/></svg>
export const catIcon=name=>{const s=(name||'').toLowerCase()
 if(/électro|electro|phone|tech/.test(s))return'headphones';if(/mode|vêt|vet|habit/.test(s))return'shirt';if(/maison|déco|deco|cuisine/.test(s))return'home'
 if(/enfant|jouet|bébé|bebe/.test(s))return'toy';if(/beaut/.test(s))return'sparkles';if(/auto|moto/.test(s))return'car';if(/outil/.test(s))return'wrench';return'tag'}
export const LogoMark=({size=32})=><svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#F97316"/><path d="M16 7l8 4.5v9L16 25l-8-4.5v-9zM8 11.5l8 4.5 8-4.5M16 16v9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/></svg>
