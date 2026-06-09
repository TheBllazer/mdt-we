# ✦ West Elizabeth Law Enforcement — MDT
**Terminal de Données Mobile · Version 5 · Anno Domini 1905**

> Système de gestion des Forces de l'Ordre pour serveur RP Red Dead Redemption 2.  
> Hébergé sur GitHub Pages · Base de données Firebase Firestore · Photos via Postimage

---

## 🌐 Accès au site

```
https://[votre-username].github.io/[nom-du-repo]/
```

---

## 🗂️ Structure du projet

```
mdt-v5/
├── index.html              ← Page principale
├── css/
│   └── style.css           ← Design 1905
└── js/
    ├── firebase-config.js  ← ⚠️ À configurer avec vos clés Firebase
    ├── grades.js           ← Grades, permissions, code pénal
    ├── firebase.js         ← Auth, Firestore, session
    ├── ui.js               ← Interface, navigation, modales
    ├── pages1.js           ← Dashboard, citoyens, casiers
    └── pages2.js           ← Rapports, mandats, armes, propriétés, personnel, enquêtes, logs
```

---

## ⚙️ Configuration rapide

### 1. Firebase

1. Créer un projet sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activer **Firestore Database** (mode production, région `europe-west1`)
3. Récupérer les clés dans **Paramètres du projet → Vos applications → Web**
4. Remplir `js/firebase-config.js` avec vos valeurs

### 2. Mots de passe (Firestore)

Les mots de passe sont stockés en **SHA-256** — jamais en clair.

Générer les hash depuis la console du navigateur (F12) :
```javascript
async function hash(pwd) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
hash("MOT_DE_PASSE_AGENT").then(console.log);
hash("MOT_DE_PASSE_COMMANDER").then(console.log);
```

Créer dans Firestore la collection `config`, document `auth` avec :

| Champ | Type | Valeur |
|-------|------|--------|
| `agentPasswordHash` | string | *hash du mot de passe agent* |
| `commanderPasswordHash` | string | *hash du mot de passe commander* |

### 3. Règles Firestore

Dans **Firestore → Règles** :
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 4. GitHub Pages

Dans **Settings → Pages → Source : main / root** → Save.

---

## 🔐 Système d'accès

| Compte | Connexion | Accès |
|--------|-----------|-------|
| **Agent** | Mot de passe agent + nom + grade | Consultation, création, modification |
| **Commander** | Mot de passe commander + nom + grade | Tout + suppression + administration |

### Grades verrouillés (Commander uniquement ⭐)
`Commander` · `Sheriff (Valentine)` · `Sheriff (Strawberry)` · `Captain`

### Session
La session est conservée **1 heure** après connexion. Un F5 ne déconnecte pas.

---

## 📋 Fonctionnalités

| Module | Description |
|--------|-------------|
| **Tableau de bord** | Stats en temps réel : mandats actifs, individus recherchés, rapports en attente, enquêtes |
| **Citoyens** | Fiche complète avec photo (Postimage), lieu d'habitation, télégramme |
| **Casiers judiciaires** | Sélecteur du code pénal complet avec recherche (Contraventions / Délits / Crimes), modifiable |
| **Rapports d'incident** | Création, modification (avant approbation), approbation Commander, photos, lien enquête |
| **Mandats d'arrêt** | Émission, clôture, photos jointes |
| **Enquêtes** | Nom, responsable, territoire, description, notes, rapports liés |
| **Armes** | Registre par numéro de série |
| **Propriétés** | Registre foncier |
| **Personnel FDO** | Annuaire par département, fiche cliquable, télégramme, modification Commander |
| **Code Pénal** | Lien direct vers la législation officielle |
| **Journal des actions** | Traçabilité complète (Commander uniquement) |

### Workflow rapports
```
Rédaction (agent) → En attente → Approbation (Commander) → Verrouillé
                        ↑
              Modification possible
              (agent avant approbation,
               Commander toujours)
```

---

## 📷 Photos (Postimage)

Les photos sont hébergées gratuitement sur [postimage.org](https://postimage.org).

1. Uploader l'image sur postimage.org
2. Copier le **"Direct link"** (se terminant par `.jpg`, `.png`, etc.)
3. Coller dans le champ prévu dans la fiche

Disponible sur : fiches citoyens, rapports d'incident, mandats d'arrêt.

---

## 🏛️ Départements & Grades

### ⭐ Command's Office
- Commander ⭐

### 🟤 Sheriff de Valentine
- Sheriff ⭐ · Undersheriff · Chief Deputy Sheriff · Deputy Sheriff · Deputy Trainee Sheriff

### 🟠 Sheriff de Strawberry
- Sheriff ⭐ · Undersheriff · Chief Deputy Sheriff · Deputy Sheriff · Deputy Trainee Sheriff

### 🔵 Police de Blackwater
- Captain ⭐ · Lieutenant · Sergeant · Police Officer · Recruit Police Officer

*⭐ = grade accessible uniquement avec le mot de passe Commander*

---

## ⚖️ Code Pénal

Le code pénal complet est disponible à l'adresse :  
**[https://thebllazer.gitbook.io/we-laws](https://thebllazer.gitbook.io/we-laws)**

Le sélecteur de faits dans les casiers judiciaires couvre :
- **Contraventions** — Atteinte aux biens, ordre public, stupéfiants
- **Délits mineurs** — Stupéfiants, atteinte à la personne et à l'autorité
- **Délits majeurs** — Atteinte à la personne, armes illégales
- **Crimes** — Atteinte à la personne, justice, trafics, corruption, fraude, sûreté du comté

---

## 🔒 Modifier les mots de passe

Connecté en Commander → **Personnel FDO → 🔒 Mots de passe**

Le nouveau hash est calculé automatiquement et sauvegardé dans Firebase.

---

## ❓ Problèmes courants

**"Configuration introuvable" à la connexion**  
→ Vérifier que le document `config/auth` existe dans Firestore avec les deux champs hash.

**"Mot de passe incorrect" alors que c'est le bon**  
→ Regénérer le hash en faisant attention à la casse exacte du mot de passe.

**Page blanche au chargement**  
→ Ouvrir F12 → Console → vérifier si erreur Firebase. Probablement `firebase-config.js` non rempli.

**Les photos ne s'affichent pas**  
→ Vérifier que le lien Postimage est bien un "Direct link" (commence par `https://i.postimg.cc/`).

---

## 📄 Licence

Usage interne — Serveur RP privé West Elizabeth.  
*Document officiel — Usage exclusif des Forces de l'Ordre du Territoire.*
