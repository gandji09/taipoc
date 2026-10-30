# TAIPOC

React + Vite, Supabase (base, comptes, photos), Vercel (hébergement). Aucune donnée fictive : tout vient de la base.

## Installation
1. Supabase > SQL Editor : exécuter `supabase/schema.sql` (installation neuve) ou, sur une base existante, `migration_02_donnees_reelles.sql` puis `migration_03_securite_admin.sql`.
2. Vercel > Environment Variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clé publique), `VITE_WHATSAPP`.
3. Premier administrateur : s'inscrire sur le site, confirmer l'e-mail, puis dans le SQL Editor :
   `update public.profiles set is_admin = true where email = 'votre@email.com';`
4. `/admin` : connexion e-mail + mot de passe, puis double authentification (obligatoire, exigée aussi par la base).

## Sécurité
- Ne jamais mettre la clé `service_role` ou une clé secrète dans le code ou dans une variable `VITE_`.
- Le fichier `.env` n'est jamais envoyé sur GitHub.
