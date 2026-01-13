#  Gestionnaire de Tâches - Backend Multi-Bases

API REST pour la gestion de tâches utilisant une architecture polyglotte avec PostgreSQL, MongoDB et Redis.

##  Démarrage rapide

### Prérequis
- Node.js  18
- Docker & Docker Compose

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier .env à la racine
DATABASE_URL="postgresql://user:password@localhost:5432/tasksdb"
MONGO_URL="mongodb://localhost:27017"
REDIS_URL="redis://localhost:6379"

# 3. Lancer Docker
docker-compose up -d

# 4. Exécuter la migration Prisma
npx prisma migrate dev --name init

# 5. Insérer les données de test
node seed.js

# 6. Lancer le serveur
npm run dev
```

Le serveur démarre sur `http://localhost:3000` 

##  Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture et justification des choix techniques

##  Technologies utilisées

- **Node.js** + Express.js - Serveur API
- **PostgreSQL** + Prisma - Stockage des tâches
- **MongoDB** - Stockage des commentaires
- **Redis** - Cache et statistiques

##  Structure du projet

```
src/
 app.js                  # Point d'entrée
 controllers/            # Logique métier
 routes/                 # Définition des routes
 middleware/             # Validation des données
 services/               # Connexions aux bases de données
```

##  Tests rapides

**Créer une tâche**
```bash
curl -X POST http://localhost:3000/tasks \
-H "Content-Type: application/json" \
-d '{\"title\":\"Ma tâche\", \"description\":\"Description\", \"status\":\"pending\"}'
```

**Lister les tâches**
```bash
curl http://localhost:3000/tasks
```

**Ajouter un commentaire**
```bash
curl -X POST http://localhost:3000/tasks/1/comments \
-H "Content-Type: application/json" \
-d '{\"author\":\"Alice\", \"content\":\"Super tâche !\"}'
```

**Vérifier Redis**
```bash
docker exec -it redis redis-cli GET "tasks:all"
docker exec -it redis redis-cli GET "task:1:views"
```

##  Commandes utiles

```bash
# Arrêter Docker
docker-compose down

# Redémarrer complètement
docker-compose down -v
docker-compose up -d
npx prisma migrate dev
node seed.js

# Voir les logs
docker logs postgres
docker logs mongo
docker logs redis
```

##  Fonctionnalités

-  CRUD complet sur les tâches
-  CRUD complet sur les commentaires
-  Validation des données
-  Gestion des erreurs (400, 404, 500)
-  Cache Redis avec TTL
-  Compteur de vues par tâche
-  Suppression en cascade

##  @Auteur

Anthony SKRZYPCZAK & Elowan MESTRES
