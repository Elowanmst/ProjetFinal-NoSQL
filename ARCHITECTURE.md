# Document d'Architecture - Gestionnaire de Tâches

## 1. Vue d'ensemble de l'architecture

Ce projet implémente une **architecture multi-bases de données** combinant PostgreSQL, MongoDB et Redis pour optimiser les performances et adapter le stockage aux différents types de données.

```
┌─────────────────┐
│   Client API    │
│  (Frontend/UI)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│      Express.js Backend         │
│   (Node.js + Controllers)       │
└─────┬───────┬──────────┬────────┘
      │       │          │
      ▼       ▼          ▼
┌──────────┐ ┌─────────┐ ┌────────────┐
│PostgreSQL│ │ MongoDB │ │   Redis    │
│  (Prisma)│ │         │ │  (ioredis) │
└──────────┘ └─────────┘ └────────────┘
   Tâches    Commentaires  Cache + Stats
```

---

## 2. Schéma relationnel - PostgreSQL

### **Modèle : Task**

```sql
┌─────────────────────────────────┐
│             Task                │
├─────────────────────────────────┤
│ id          : INTEGER (PK, AI)  │
│ title       : VARCHAR(255)      │
│ description : TEXT              │
│ status      : VARCHAR(50)       │
│ createdAt   : TIMESTAMP         │
└─────────────────────────────────┘

Contraintes:
- id: Clé primaire auto-incrémentée
- status: ENUM ('pending', 'in_progress', 'completed')
- createdAt: Valeur par défaut NOW()
```

### **Schéma Prisma**
```prisma
model Task {
  id          Int      @id @default(autoincrement())
  title       String
  description String
  status      String
  createdAt   DateTime @default(now())
}
```

**Pourquoi PostgreSQL pour les tâches ?**
- **Intégrité des données** : Les tâches nécessitent des contraintes strictes (statut valide, champs obligatoires)
- **Transactions ACID** : Garantit la cohérence lors des mises à jour
- **Requêtes complexes** : Permet facilement le tri, filtrage et jointures futures
- **Relations** : Facilite l'ajout de fonctionnalités (assignation d'utilisateurs, catégories, etc.)

---

## 3. Modèle NoSQL - MongoDB

### **Collection : comments**

```json
{
  "_id": ObjectId("677f8a5b3c4d2e1f9a8b7c6d"),
  "taskId": 1,
  "author": "Alice",
  "content": "N'oublie pas les pommes",
  "createdAt": ISODate("2026-01-11T10:45:00.000Z"),
  "updatedAt": ISODate("2026-01-11T14:30:00.000Z")  // Optionnel, ajouté lors des mises à jour
}
```

**Structure de la collection**
```
┌─────────────────────────────────────┐
│         comments (Collection)       │
├─────────────────────────────────────┤
│ _id         : ObjectId (PK)         │
│ taskId      : Number (FK → Task.id) │
│ author      : String                │
│ content     : String                │
│ createdAt   : Date                  │
│ updatedAt   : Date (optionnel)      │
└─────────────────────────────────────┘

Index:
- taskId (pour accélérer les requêtes par tâche)
```

**Pourquoi MongoDB pour les commentaires ?**
- **Flexibilité du schéma** : Les commentaires peuvent évoluer (ajout de réactions, mentions, etc.)
- **Performance en lecture** : Récupération rapide de tous les commentaires d'une tâche
- **Scalabilité horizontale** : Facile à distribuer si le nombre de commentaires augmente
- **Pas de jointures** : Les commentaires sont indépendants, pas besoin de relations complexes
- **Volume élevé** : MongoDB gère mieux un grand nombre de documents non structurés

---

## 4. Cache et compteurs - Redis

### **Structure des clés Redis**

```
┌────────────────────────────────────────┐
│         Clés Redis                     │
├────────────────────────────────────────┤
│ "tasks:all"         → String (JSON)    │
│   Valeur: JSON de toutes les tâches    │
│   TTL: 60 secondes                     │
│                                        │
│ "task:{id}:views"   → Number           │
│   Valeur: Compteur de vues             │
│   Exemple: "task:1:views" → 42         │
└────────────────────────────────────────┘
```

**Exemples de données**
```
tasks:all = '[{"id":1,"title":"Faire les courses",...}]'
task:1:views = "15"
task:2:views = "8"
task:3:views = "23"
```

**Pourquoi Redis pour le cache et les statistiques ?**
- **Performance extrême** : Temps de réponse < 1ms pour les lectures
- **Cache volatile** : TTL automatique évite les données obsolètes
- **Compteurs atomiques** : `INCR` est thread-safe pour les compteurs de vues
- **Réduction de charge DB** : Évite les requêtes répétées sur PostgreSQL
- **Statistiques temps réel** : Parfait pour les métriques (vues, popularité, etc.)

---

## 5. Justification des choix architecturaux

### **5.1 Principe de séparation des responsabilités**

| Base de données | Type de données | Raison |
|----------------|-----------------|---------|
| **PostgreSQL** | Tâches principales | Données structurées nécessitant intégrité et transactions |
| **MongoDB** | Commentaires | Données semi-structurées avec forte croissance et flexibilité |
| **Redis** | Cache + Statistiques | Données temporaires et métriques temps réel |

### **5.2 Avantages de cette architecture**

**Performance optimale**
- Cache Redis réduit les requêtes PostgreSQL pour `GET /tasks`
- MongoDB gère efficacement des milliers de commentaires sans impact sur PostgreSQL

**Scalabilité**
- PostgreSQL : Scaling pour les tâches critiques
- MongoDB : Scaling pour les commentaires
- Redis : Cluster Redis pour le cache distribué

**Flexibilité**
- Ajout de champs aux commentaires sans migration PostgreSQL
- Ajout de nouveaux types de cache sans modifier le schéma SQL

**Isolation des pannes**
- Si Redis tombe, l'API fonctionne toujours (sans cache)
- Si MongoDB est indisponible, les tâches restent accessibles

### **5.3 Patterns d'utilisation**

**Cache-Aside Pattern (Redis)**
```
1. Client demande GET /tasks
2. Vérifier Redis → Si présent, retourner
3. Sinon, requête PostgreSQL → Stocker dans Redis avec TTL 60s
4. Retourner au client
```

**Write-Through Pattern (Invalidation)**
```
1. Client crée/modifie/supprime une tâche
2. Écrire dans PostgreSQL
3. Invalider le cache Redis ("tasks:all")
4. Prochain GET /tasks rechargera depuis PostgreSQL
```

---

## 6. Workflow des opérations

### **Création d'une tâche**
```
1. POST /tasks
2. Validation des données (middleware)
3. Insertion dans PostgreSQL (Prisma)
4. Invalidation du cache Redis
5. Retour de la tâche créée
```

### **Ajout d'un commentaire**
```
1. POST /tasks/:id/comments
2. Validation des données
3. Vérification existence tâche (PostgreSQL)
4. Insertion commentaire (MongoDB)
5. Retour du commentaire créé
```

### **Consultation d'une tâche**
```
1. GET /tasks/:id
2. Validation de l'ID
3. Récupération depuis PostgreSQL
4. Incrémentation compteur vues (Redis INCR)
5. Retour de la tâche
```

---

## 7. Évolutions futures possibles

### **PostgreSQL**
- Table `users` pour l'authentification
- Table `categories` pour organiser les tâches
- Relations Many-to-Many pour les tags

### **MongoDB**
- Ajout de réactions aux commentaires (`likes`, `emoji`)
- Historique des modifications avec versioning
- Attachements (fichiers, images)

### **Redis**
- Cache des commentaires les plus récents
- Rate limiting par utilisateur
- Session management
- Leaderboard des tâches les plus vues

---

## Conclusion

Cette architecture multi-bases exploite les forces de chaque technologie :
- **PostgreSQL** pour la fiabilité et l'intégrité des données critiques
- **MongoDB** pour la flexibilité et la scalabilité des commentaires
- **Redis** pour la performance et les statistiques temps réel

Le résultat est une API **performante**, **scalable** et **maintenable**, prête pour la production.
