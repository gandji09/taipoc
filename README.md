# TAIPOC

React + Vite, Supabase (base de données et authentification), FedaPay (paiement, à intégrer), Vercel (hébergement).

## Démarrer
1. `npm install`
2. Copier `.env.example` en `.env` et renseigner l'URL et la clé anon de Supabase.
3. Dans Supabase > SQL Editor, exécuter `supabase/schema.sql`.
4. `npm run dev`

## GitHub et Vercel
```
git init && git add . && git commit -m "Accueil TAIPOC"
git remote add origin <url-du-depot> && git push -u origin main
```
Sur Vercel : Add New > Project > importer le dépôt (preset Vite), puis ajouter les variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WHATSAPP`.

## Administrateur
Après votre inscription, passez `is_admin` à `true` dans la table `profiles` pour votre compte.

## À venir
Catalogue, fiche produit, panier, commande, FedaPay (la clé secrète reste côté serveur : fonction Supabase ou Vercel), espace client, administration. Les liens du menu pointent vers ces pages pas encore créées.
