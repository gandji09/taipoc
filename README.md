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

## Sécurité (à lire avant le backend)
- Ne jamais mettre la clé `service_role` ni la clé secrète FedaPay dans une variable `VITE_`. Elles vivent seulement dans des fonctions serveur.
- Pendant la démonstration, `/admin` est ouvert à tous (données fictives). Avant le lancement, ajouter `VITE_DEMO_ADMIN=false` dans Vercel pour le fermer, puis le protéger par un vrai rôle administrateur Supabase.
- Premier administrateur : après inscription, exécuter dans le SQL Editor `update public.profiles set is_admin = true where id = '<id du compte>';`
- Le statut « paid » ne doit être posé que par le webhook FedaPay (signature, montant et référence vérifiés, traitement unique).

## Administrateur et photos
1. Supabase > Authentication > Users > Add user (e-mail + mot de passe).
2. SQL Editor : `update public.profiles set is_admin = true where id = '<id de ce compte>';`
3. Ouvrir `/admin`, se connecter, puis ajouter catégories et produits avec leurs photos. Les photos vont dans le bucket `product-images`.
