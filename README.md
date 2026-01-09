# Gestionnaire de tâches (Backend multi-bases)

## Description

Backend pour la gestion de tâches utilisant PostgreSQL, Redis et MongoDB avec Node.js et Prisma.

- PostgreSQL → stockage des tâches
- Redis → cache et compteur de vues
- MongoDB → commentaires


## Prérequis

- Node.js ≥ 18
- Docker & Docker Compose
- Git
- VS Code (optionnel)
- Postman ou curl pour tester l’API


## Installation

1. Cloner le projet


## installations des dependances 
```bash
npm install -y
```

## creation du .env à la racine 
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/tasksdb"
MONGO_URL="mongodb://localhost:27017"
REDIS_URL="redis://localhost:6379"
```

## lancement docker
```bash
docker-compose up -d
```


## execution de la migration prisma 
```bash
npx prisma migrate dev --name init 
```


## executé les données de test avec seed
```bash
node seed.js
```


## lancement du serveur 
```bash
npm run dev
```

## test à faire 
### Tâches
```bash
curl -X POST http://localhost:3000/tasks \
-H "Content-Type: application/json" \
-d '{"title":"Test", "description":"Faire quelque chose", "status":"pending"}'
```

### Commentaires avec MongoDB

#### ajouter un commentaire
```bash
curl -X POST http://localhost:3000/tasks/1/comments \
-H "Content-Type: application/json" \
-d '{"author":"Alice","contenue":"important!"}'
```

#### lister les commentaires
```bash
curl http://localhost:3000/tasks/1/comments
```

### Vérification de Redis
```bash
docker exec -it redis redis-cli GET "task:1:views"
docker exec -it redis redis-cli GET "tasks:all"
```