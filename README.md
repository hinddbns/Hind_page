# هند بنياس / Hind Benyas — Plateforme de coaching

Application web (Next.js + Prisma/SQLite) pour un(e) coach proposant des **cours vidéo** à deux
publics distincts : les **adolescents** eux-mêmes, et les **mères / enseignants** qui les
accompagnent. Interface **entièrement en arabe (RTL)**. Le nom de la marque et son logo
s'affichent partout dans l'app (`src/lib/site.ts`, `public/logo.jpg`).

> **Pour Claude Code / tout futur contributeur** : voir [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md)
> pour la documentation complète et à jour du projet (architecture, pages, composants, design
> system, roadmap, conventions) — à lire avant toute modification.

## Deux espaces ("workspaces")

Le site distingue deux publics avec leur propre landing page, palette d'accent, et catalogue de
cours, tout en partageant un seul design system, un seul compte utilisateur et un seul panneau
admin :

- **`/`** — page d'accueil "hub" : présentation étendue de la coach (rôle, mission, valeurs,
  chiffres clés, citation) puis deux grandes cartes qui mènent vers les deux espaces.
- **`/parents-enseignants`** — espace historique : hero, "pour qui" (mères / enseignants /
  développement personnel), catalogue filtré aux cours `audience: PARENT_TEACHER`, témoignages.
- **`/ados`** — nouvel espace, palette et ton dédiés aux adolescents, catalogue filtré aux cours
  `audience: ADOLESCENT` (affiche un message "bientôt disponible" tant qu'aucun cours n'y est
  encore rattaché).
- Chaque utilisateur appartient à **un seul espace**, dérivé de son `profileCategory` à
  l'inscription (`MOTHER` / `TEACHER` / `OTHER` → espace parents-enseignants, `ADOLESCENT` →
  espace ados) via `src/lib/workspace.ts`. Ce `workspace` est calculé à chaque requête par
  `getAppUser()` (`src/lib/session.ts`) et détermine :
  - la variante de liens réseaux sociaux affichée (`src/components/SocialLinks.tsx` : Instagram +
    Facebook pour les parents/enseignants, + TikTok en plus pour les ados —
    `src/lib/site.ts#social`) ;
  - un léger accent visuel dans la barre de navigation connectée (`AppNav.tsx`).
- **Panneau admin unique** (`/admin`) mais entièrement conscient des deux espaces : sélecteur de
  cible sur chaque cours, onglets de filtre par espace sur les cours / demandes / utilisateurs, et
  statistiques de la vue d'ensemble ventilées par espace.

## Espace public vs espace personnel

- **Marketing** (visiteur non connecté) : hub (`/`), `/ados`, `/parents-enseignants`, connexion,
  inscription.
- **Application** (utilisateur connecté) : dès la connexion, on est redirigé dans son espace
  personnel et on ne peut plus retomber sur les pages marketing tant qu'on ne s'est pas
  déconnecté. La navigation change pour une barre "app" dédiée (Tableau de bord / Cours /
  Messages / Mon profil / Déconnexion), sans aucun lien marketing.

## Fonctionnement

- Catalogue de cours par espace. Chaque cours a un titre/résumé/description, un prix, une cible
  (`audience`), une vidéo de présentation publique (aperçu gratuit avant inscription) et des
  leçons vidéo.
- Pour accéder à un cours, l'utilisateur envoie un **virement bancaire** puis dépose le
  **reçu** (image ou PDF) sur la plateforme. Tant que la demande est en attente, il ne peut pas
  soumettre un nouveau reçu — seulement consulter le sien ou **retirer sa demande**. Si elle est
  refusée, il peut renvoyer un nouveau reçu. Une fois approuvée, l'accès est définitif et ne peut
  plus être annulé depuis l'interface.
- Un compte **admin** consulte les demandes (`/admin/demandes`, filtrables par espace), voit le
  reçu, et **approuve ou refuse** l'accès (avec confirmation avant toute action destructive).
- **Questionnaire d'accueil optionnel, par cours** : l'admin peut activer un questionnaire
  (`/admin/cours/[id]/questionnaire`) avec autant de questions que voulu — réponse libre, choix
  unique, choix multiples, ou échelle (avec libellés min/max). S'il est activé,
  l'utilisateur nouvellement approuvé doit y répondre **avant** de voir la moindre leçon ; ses
  réponses sont consultables par l'admin depuis la fiche de l'utilisateur.
- Une fois approuvé (et le questionnaire complété si activé), l'utilisateur accède aux
  **leçons vidéo** du cours dans son espace (`/tableau-de-bord`) — lecture protégée, lue
  directement dans la page (aucun lien de partage, pas de bouton de téléchargement, clic droit
  désactivé — voir "Sécurité vidéo" plus bas).
- **Messagerie intégrée** (`/tableau-de-bord/messages`) : l'utilisateur peut poser une question
  au coach ; un message automatique confirme la réception. L'admin retrouve toutes les
  conversations dans `/admin/messages` et peut répondre. Les horaires de disponibilité affichés
  sont modifiables dans `/admin/parametres`. Pastilles de messages non lus dans la navigation.
- **Gestion des cours** (`/admin/cours`) : création et modification à tout moment (titre,
  description, prix, cible/espace, vidéo de présentation, vidéos de leçon), onglets de filtre par
  espace, confirmation avant suppression/dépublication.
- **Gestion des utilisateurs** (`/admin/utilisateurs`) : liste filtrable par espace, fiche par
  utilisateur montrant ses informations, la liste de ses cours avec le statut d'accès, un
  raccourci vers sa conversation, et la possibilité de le **promouvoir admin** ou de lui
  **retirer les droits admin** (protégé : impossible de se démettre soi-même ou de retirer le
  dernier admin restant).
- **Inscription enrichie** : nom, email, téléphone, **date de naissance** (optionnelle) et un
  choix **mère / أستاذ(ة) (enseignant·e) / مراهق(ة) (adolescent·e) / autre**, qui détermine
  l'espace de l'utilisateur. Toutes ces informations, ainsi que le mot de passe, sont modifiables
  ensuite par l'utilisateur dans `/profil`.
- Bouton **WhatsApp** flottant sur toutes les pages (`src/components/WhatsAppButton.tsx`,
  numéro configuré dans `src/lib/site.ts`).
- Liens Instagram / Facebook / TikTok en pied de page, différents par espace (à configurer avec
  les vraies URLs — voir "Points à personnaliser" plus bas).

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Base de données

Postgres hébergé par Supabase. L'application y accède exclusivement via le client
serveur `src/lib/supabase/db.ts` (clé service-role, jamais exposée au navigateur).
Variables requises dans `.env` : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Le schéma est géré directement dans Supabase. L'historique SQL des migrations
antérieures reste disponible dans `prisma/migrations/` à titre de référence.

Aucun compte n'est pré-créé : inscrivez-vous via l'application (`/inscription`,
avec vérification e-mail par OTP), puis promouvez le compte au rôle `ADMIN`
directement dans la base.

## Sécurité

- **Verrouillage anti-force-brute** : après 5 tentatives de connexion échouées, le compte est
  verrouillé 15 minutes (`failedLoginAttempts` / `lockedUntil` sur `User`, logique dans
  `src/auth.ts`). Le compteur se réinitialise à la prochaine connexion réussie.
- **Validation réelle des fichiers uploadés** (`src/lib/fileSignature.ts`) : reçus de virement et
  vidéos sont vérifiés par leur **signature binaire réelle** (magic bytes), pas seulement par le
  type MIME déclaré par le navigateur (facilement falsifiable). Un fichier dont le contenu ne
  correspond pas au type prétendu est rejeté. Les routes de service (`/api/receipts/[id]`,
  `/api/videos/[lessonId]`) envoient aussi `X-Content-Type-Options: nosniff` en défense
  supplémentaire.

## Textes d'interface (arabe uniquement)

Tout le texte d'interface (navigation, formulaires, tableaux de bord...) vit dans
`src/i18n/dictionaries/ar.ts`. Il n'y a ni bascule de langue ni contenu bilingue : toute
l'application (chrome + contenu des cours) est en arabe (RTL).

## Vidéos

- **Vidéo de présentation** (par cours) : publique, visible par tout visiteur avant inscription.
  Fichier uploadé → stocké dans `public/uploads/demos` (servi directement, comme un asset
  statique) ou lien externe (YouTube, Vimeo...).
- **Vidéos de leçon** : privées, accessibles uniquement aux utilisateurs dont la demande a été
  approuvée (ou à l'admin), servies via `/api/videos/[lessonId]` avec support des requêtes par
  plage (`Range`) pour permettre l'avance/retour dans la vidéo.
- Des vidéos de test générées localement (`scripts/gen_test_videos.py`) sont fournies dans le
  seed, à remplacer par vos vraies vidéos.
- Taille max par vidéo : 150 Mo (`src/lib/uploads.ts`, `MAX_VIDEO_SIZE`) — pensez à héberger les
  vidéos longues sur un service dédié (YouTube non listé, Vimeo, Mux...) si vous dépassez cette
  limite ou déployez sur une plateforme sans disque persistant (Vercel serverless, par exemple).

### Sécurité vidéo — ce qui est fait et ses limites

Chaque requête de vidéo de leçon vérifie la session ET l'approbation de l'inscription
côté serveur (impossible de deviner ou de partager un lien qui fonctionnerait pour quelqu'un
d'autre — sans compte approuvé, la réponse est 401/403). Le lecteur désactive le bouton de
téléchargement, le picture-in-picture et le clic droit.

**Limite honnête** : aucune de ces protections n'empêche un utilisateur approuvé de faire un
enregistrement d'écran de sa propre session — c'est une limite technique inhérente à toute
lecture vidéo dans un navigateur standard, y compris sur Netflix ou Udemy. Une vraie protection
DRM (chiffrement, blocage d'enregistrement d'écran) nécessite un service payant tiers (Mux,
Bunny Stream, Cloudflare Stream...) ; ce n'est pas branché ici — à ajouter si le risque de
piratage devient un enjeu réel pour vous.

## Logo et identité visuelle

Le logo (`public/logo.jpg`) sert de favicon (`src/app/icon.jpg`), d'icône iOS
(`src/app/apple-icon.jpg`), et apparaît dans la navigation marketing et app, les deux pieds de
page, et au-dessus des formulaires de connexion/inscription. La photo de la coach reste pour
l'instant un **emplacement réservé** (`src/components/CoachPortrait.tsx`) — à remplacer par une
vraie photo une fois disponible.

La palette (`src/app/globals.css`) distingue terracotta (chaleureux, espace parents/enseignants),
sarcelle (calme, section "qui est Hind"), et doré/accent (espace ados).

## Points à personnaliser avant mise en ligne

- `src/lib/site.ts` : nom de la marque, **coordonnées bancaires** (RIB/IBAN factices
  actuellement), numéro **WhatsApp**, et liens **réseaux sociaux** par espace
  (`social.parents` / `social.ados`, actuellement des placeholders identiques).
- Le texte de présentation et les valeurs de la coach (`about` dans
  `src/i18n/dictionaries/ar.ts`) sont un premier jet à relire — de même que le contenu de
  `/ados` (`ados` dans le même fichier), rédigé en attendant vos retours.
- Les cours et témoignages actuels sont des exemples (`prisma/seed.ts`, section `testimonials`
  du dictionnaire `ar.ts`) — à remplacer par du contenu réel, y compris les vraies vidéos. Les 3
  cours de départ sont classés `PARENT_TEACHER` ; ajoutez des cours `ADOLESCENT` depuis
  `/admin/cours` pour peupler l'espace `/ados`.
- `.env` : `AUTH_SECRET`, identifiants admin, à régénérer pour la production.
- Avant déploiement, remplacer SQLite par Postgres/MySQL si plusieurs instances/serveurs sont
  nécessaires (SQLite convient pour un serveur unique).
- Les reçus et vidéos de leçon sont stockés sur disque dans `/uploads` (non public, servis
  uniquement aux ayants droit) — prévoir un stockage externe (S3, etc.) si déployé sur une
  plateforme sans disque persistant.
- La messagerie utilise un polling (5s côté client, 20s pour les pastilles) — pas de websockets,
  suffisant pour un volume modeste.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma · Postgres (Supabase) ·
Supabase Auth · interface arabe (RTL).
