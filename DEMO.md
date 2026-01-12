# Guide de Démo - Gestionnaire de Tâches

Ce document présente un scénario de démo complet pour montrer toutes les fonctionnalités du projet.

## Objectifs de la démo

Démontrer que :
1. **PostgreSQL** stocke les tâches de manière fiable
2. **MongoDB** gère les commentaires avec flexibilité
3. **Redis** optimise les performances via le cache et les statistiques
4. Les validations fonctionnent correctement
5. L'architecture multi-bases est cohérente

---

## Méthode 1 : Script automatisé

### Lancer la démo automatique

```powershell

npm run dev


node demo.js
```

Le script va automatiquement :
- Tester tous les endpoints (CRUD complet)
- Vérifier Redis (cache + compteurs)
- Vérifier MongoDB (commentaires)
- Tester les validations
- Afficher un résumé complet

---

## Méthode 2 : Démo manuelle étape par étape

### **Préparation**

```bash
# 1. Lancer Docker
docker-compose up -d

# 2. Vérifier que les 3 conteneurs sont actifs
docker ps

# 3. Lancer le serveur
npm run dev
```

---

### **PARTIE 1 : PostgreSQL - Gestion des tâches**

#### **1.1 Créer une tâche**
```bash
curl -X POST http://localhost:3000/tasks \
-H "Content-Type: application/json" \
-d '{"title":"Préparer la démo", "description":"Montrer PostgreSQL", "status":"pending"}'
```

**Résultat attendu :** 
- Code 201 (Created)
- Retour de la tâche avec un ID auto-généré
- La tâche est stockée dans PostgreSQL

#### **1.2 Récupérer toutes les tâches**
```bash
curl http://localhost:3000/tasks
```

**Résultat attendu :**
- Code 200
- Liste JSON de toutes les tâches
- **Redis** : Le résultat est mis en cache pendant 60 secondes

#### **1.3 Récupérer une tâche spécifique**
```bash
curl http://localhost:3000/tasks/1
```

**Résultat attendu :**
- Code 200
- Détails de la tâche
- **Redis** : Le compteur de vues est incrémenté

**Vérifier le compteur Redis :**
```bash
docker exec -it redis redis-cli GET "task:1:views"
```

#### **1.4 Modifier une tâche**
```bash
curl -X PUT http://localhost:3000/tasks/1 \
-H "Content-Type: application/json" \
-d '{"status":"completed"}'
```

**Résultat attendu :**
- Code 200
- Tâche mise à jour
- **Redis** : Le cache est invalidé automatiquement

#### **1.5 Vérifier l'invalidation du cache**
```bash
docker exec -it redis redis-cli GET "tasks:all"
```

**Résultat attendu :** Le cache est vide (null) car il a été invalidé lors de la modification

---

### **PARTIE 2 : Redis - Cache et statistiques**

#### **2.1 Tester la performance du cache**

**Premier appel (sans cache) :**
```bash
curl http://localhost:3000/tasks
```
Temps : ~50ms (requête PostgreSQL)

**Deuxième appel (avec cache) :**
```bash
curl http://localhost:3000/tasks
```
Temps : ~2ms (lecture Redis)

**Gain de performance : ~95%**

#### **2.2 Vérifier le contenu du cache**
```bash
docker exec -it redis redis-cli GET "tasks:all"
```

**Résultat attendu :** JSON de toutes les tâches

#### **2.3 Tester le compteur de vues**

```bash
# Appeler plusieurs fois la même tâche
curl http://localhost:3000/tasks/1
curl http://localhost:3000/tasks/1
curl http://localhost:3000/tasks/1

# Vérifier le compteur
docker exec -it redis redis-cli GET "task:1:views"
```

**Résultat attendu :** Le compteur augmente à chaque appel (3, 4, 5...)

---

### **PARTIE 3 : MongoDB - Commentaires**

#### **3.1 Ajouter un commentaire**
```bash
curl -X POST http://localhost:3000/tasks/1/comments \
-H "Content-Type: application/json" \
-d '{"author":"Alice", "content":"Excellente tâche !"}'
```

**Résultat attendu :**
- Code 201
- Commentaire avec un `_id` MongoDB (ObjectId)
- Le commentaire est stocké dans MongoDB

#### **3.2 Récupérer les commentaires d'une tâche**
```bash
curl http://localhost:3000/tasks/1/comments
```

**Résultat attendu :**
- Code 200
- Liste des commentaires au format MongoDB

#### **3.3 Modifier un commentaire**

*Récupérer d'abord l'ID du commentaire via GET /tasks/1/comments*

```bash
curl -X PUT http://localhost:3000/tasks/1/comments/COMMENT_ID \
-H "Content-Type: application/json" \
-d '{"content":"Commentaire mis à jour !"}'
```

**Résultat attendu :**
- Code 200
- Commentaire avec le champ `updatedAt` ajouté

#### **3.4 Vérifier MongoDB directement**
```bash
docker exec -it mongo mongosh

use tasksdb
db.comments.find().pretty()
```

**Résultat attendu :** Affichage des commentaires stockés dans MongoDB

#### **3.5 Supprimer un commentaire**
```bash
curl -X DELETE http://localhost:3000/tasks/1/comments/COMMENT_ID
```

**Résultat attendu :** Code 204 (No Content)

---

### **PARTIE 4 : Validations**

#### **4.1 Champ manquant**
```bash
curl -X POST http://localhost:3000/tasks \
-H "Content-Type: application/json" \
-d '{"title":"Titre seulement"}'
```

**Résultat attendu :**
- Code 400
- Message : "Missing required fields"

#### **4.2 Status invalide**
```bash
curl -X POST http://localhost:3000/tasks \
-H "Content-Type: application/json" \
-d '{"title":"Test", "description":"Desc", "status":"invalid"}'
```

**Résultat attendu :**
- Code 400
- Message : "status must be one of: pending, in_progress, completed"

#### **4.3 ID invalide**
```bash
curl http://localhost:3000/tasks/abc
```

**Résultat attendu :**
- Code 400
- Message : "Task ID must be a positive integer"

#### **4.4 Ressource inexistante**
```bash
curl http://localhost:3000/tasks/9999
```

**Résultat attendu :**
- Code 404
- Message : "Task not found"

---

### **PARTIE 5 : Suppression en cascade**

#### **5.1 Créer une tâche avec des commentaires**
```bash
# Créer une tâche
curl -X POST http://localhost:3000/tasks \
-H "Content-Type: application/json" \
-d '{"title":"Tâche test", "description":"Test cascade", "status":"pending"}'

# Ajouter 2 commentaires (en utilisant l'ID retourné)
curl -X POST http://localhost:3000/tasks/ID/comments \
-H "Content-Type: application/json" \
-d '{"author":"User1", "content":"Commentaire 1"}'

curl -X POST http://localhost:3000/tasks/ID/comments \
-H "Content-Type: application/json" \
-d '{"author":"User2", "content":"Commentaire 2"}'
```

#### **5.2 Vérifier les commentaires dans MongoDB**
```bash
docker exec -it mongo mongosh --eval "db.getSiblingDB('tasksdb').comments.countDocuments({taskId: ID})"
```

**Résultat attendu :** 2 commentaires

#### **5.3 Supprimer la tâche**
```bash
curl -X DELETE http://localhost:3000/tasks/ID
```

**Résultat attendu :**
- Code 204
- Tâche supprimée de PostgreSQL
- Commentaires supprimés de MongoDB
- Clés Redis supprimées (`task:ID:views`)

#### **5.4 Vérifier la suppression dans MongoDB**
```bash
docker exec -it mongo mongosh --eval "db.getSiblingDB('tasksdb').comments.countDocuments({taskId: ID})"
```

**Résultat attendu :** 0 commentaires (suppression en cascade)

---

## Résumé de la démo

### **PostgreSQL (Prisma)**
- Stockage structuré des tâches
- Contraintes d'intégrité (ID auto-incrémenté, types)
- Transactions ACID

### **MongoDB**
- Stockage flexible des commentaires
- Format JSON natif
- Gestion des ObjectId
- Champ `updatedAt` dynamique

### **Redis**
- Cache des requêtes fréquentes (liste des tâches)
- TTL de 60 secondes
- Compteurs atomiques (vues par tâche)
- Invalidation automatique

### **Architecture cohérente**
- Validation des données (middleware)
- Gestion d'erreurs complète (400, 404, 500)
- Suppression en cascade
- API RESTful

---

## Points à souligner pendant la démo

1. **Performance** : Montrer la différence entre appel avec/sans cache
2. **Flexibilité** : MongoDB permet d'ajouter `updatedAt` sans migration
3. **Isolation** : Chaque base a son rôle spécifique
4. **Robustesse** : Les validations protègent l'intégrité des données
5. **Scalabilité** : Architecture prête pour la production

---