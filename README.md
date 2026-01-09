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
''''
npm install -y
''''

## creation du .env à la racine 
''''
DATABASE_URL="postgresql://user:password@localhost:5432/tasksdb"
MONGO_URL="mongodb://localhost:27017"
REDIS_URL="redis://localhost:6379"
''''

## lancement docker
''''
docker-compose up -d
''''


## execution de la migration prisma 
''''
npx prisma migrate dev --name init 
''''


## executé les données de test avec seed
''''
node seed.js
''''


## lancement du serveur 
''''
npm run dev
''''

## test à faire 
### Tâches
''''
curl -X POST http://localhost:3000/tasks \
-H "Content-Type: application/json" \
-d '{"title":"Test", "description":"Faire quelque chose", "status":"pending"}'
''''

### Commentaires avec MongoDB

#### ajouter un commentaire
''''
curl -X POST http://localhost:3000/tasks/1/comments \
-H "Content-Type: application/json" \
-d '{"author":"Alice","contenue":"important!"}'
''''

#### lister les commentaires
''''
curl http://localhost:3000/tasks/1/comments
''''

### Vérification de Redis
''''
docker exec -it redis redis-cli GET "task:1:views"
docker exec -it redis redis-cli GET "tasks:all"
''''