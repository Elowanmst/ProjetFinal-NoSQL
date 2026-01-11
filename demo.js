const https = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const baseUrl = 'http://localhost:3000';

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function showResult(title, data, status) {
  console.log('');
  log(`► ${title}`, 'yellow');
  log(`Status: ${status}`, status.toString().startsWith('2') ? 'green' : 'red');
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            data: data ? JSON.parse(data) : null 
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: null });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function main() {
  log('========================================', 'cyan');
  log('   DEMO - Gestionnaire de Tâches      ', 'cyan');
  log('========================================', 'cyan');
  console.log('');

  // Vérifier que le serveur est lancé
  log('Vérification du serveur...', 'magenta');
  try {
    await request(`${baseUrl}/tasks`);
    log('Serveur accessible', 'green');
  } catch (error) {
    log('Serveur inaccessible. Lancez "npm run dev" d\'abord !', 'red');
    process.exit(1);
  }

  console.log('');
  log('========================================', 'cyan');
  log('  PARTIE 1: TESTS POSTGRESQL (Tâches) ', 'cyan');
  log('========================================', 'cyan');

  // 1. GET - Toutes les tâches
  console.log('');
  log('Test 1: GET /tasks (PostgreSQL)', 'magenta');
  const allTasks = await request(`${baseUrl}/tasks`);
  showResult('Liste des tâches', allTasks.data, allTasks.status);

  // 2. POST - Créer une tâche
  console.log('');
  log('Test 2: POST /tasks (PostgreSQL - Création)', 'magenta');
  const newTask = await request(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      title: `Demo Task - ${new Date().toLocaleTimeString()}`,
      description: 'Tâche créée pendant la démo',
      status: 'pending'
    }
  });
  const taskId = newTask.data.id;
  showResult('Tâche créée', newTask.data, newTask.status);

  // 3. GET - Une tâche spécifique
  console.log('');
  log(`Test 3: GET /tasks/${taskId} (PostgreSQL + Redis Views)`, 'magenta');
  const oneTask = await request(`${baseUrl}/tasks/${taskId}`);
  showResult('Tâche récupérée', oneTask.data, oneTask.status);

  // 4. Vérifier le compteur Redis
  console.log('');
  log('Vérification Redis - Compteur de vues', 'magenta');
  const { stdout: views1 } = await execPromise(`docker exec redis redis-cli GET "task:${taskId}:views"`);
  log(`Compteur de vues pour task ${taskId}: ${views1.trim()}`, 'cyan');

  log('Appels supplémentaires pour tester l\'incrémentation...', 'yellow');
  await request(`${baseUrl}/tasks/${taskId}`);
  await request(`${baseUrl}/tasks/${taskId}`);
  await request(`${baseUrl}/tasks/${taskId}`);

  const { stdout: views2 } = await execPromise(`docker exec redis redis-cli GET "task:${taskId}:views"`);
  log(`Nouveau compteur après 3 appels: ${views2.trim()}`, 'green');

  // 5. PUT - Modifier la tâche
  console.log('');
  log(`Test 4: PUT /tasks/${taskId} (PostgreSQL - Modification)`, 'magenta');
  const updatedTask = await request(`${baseUrl}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: { status: 'in_progress' }
  });
  showResult('Tâche modifiée', updatedTask.data, updatedTask.status);

  console.log('');
  log('========================================', 'cyan');
  log(' PARTIE 2: TESTS REDIS (Cache)        ', 'cyan');
  log('========================================', 'cyan');

  // 6. Test cache
  console.log('');
  log('Test 5: Vérification du cache Redis', 'magenta');
  
  log('GET /tasks (première fois - sans cache)', 'yellow');
  const start1 = Date.now();
  await request(`${baseUrl}/tasks`);
  const duration1 = Date.now() - start1;
  log(`Temps de réponse: ${duration1}ms`, 'cyan');

  console.log('');
  log('GET /tasks (deuxième fois - avec cache)', 'yellow');
  const start2 = Date.now();
  await request(`${baseUrl}/tasks`);
  const duration2 = Date.now() - start2;
  log(`Temps de réponse: ${duration2}ms`, 'green');

  console.log('');
  log('Contenu du cache Redis:', 'yellow');
  const { stdout: cache } = await execPromise('docker exec redis redis-cli GET "tasks:all"');
  if (cache.trim() && cache.trim() !== '(nil)') {
    log(`Cache présent (${cache.length} caractères)`, 'green');
  } else {
    log('Pas de cache', 'red');
  }

  console.log('');
  log('========================================', 'cyan');
  log(' PARTIE 3: TESTS MONGODB (Commentaires)', 'cyan');
  log('========================================', 'cyan');

  // 7. POST - Ajouter un commentaire
  console.log('');
  log(`Test 6: POST /tasks/${taskId}/comments (MongoDB - Création)`, 'magenta');
  const newComment = await request(`${baseUrl}/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      author: 'Demo User',
      content: `Commentaire ajouté pendant la démo à ${new Date().toLocaleTimeString()}`
    }
  });
  const commentId = newComment.data._id;
  showResult('Commentaire créé', newComment.data, newComment.status);

  // 8. GET - Récupérer les commentaires
  console.log('');
  log(`Test 7: GET /tasks/${taskId}/comments (MongoDB - Lecture)`, 'magenta');
  const comments = await request(`${baseUrl}/tasks/${taskId}/comments`);
  showResult('Liste des commentaires', comments.data, comments.status);

  // 9. PUT - Modifier le commentaire
  console.log('');
  log(`Test 8: PUT /tasks/${taskId}/comments/${commentId} (MongoDB - Modification)`, 'magenta');
  const updatedComment = await request(`${baseUrl}/tasks/${taskId}/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: { content: `Commentaire modifié à ${new Date().toLocaleTimeString()}` }
  });
  showResult('Commentaire modifié', updatedComment.data, updatedComment.status);

  // 10. Vérifier MongoDB
  console.log('');
  log('Vérification MongoDB directe', 'magenta');
  log(`Nombre de commentaires dans MongoDB pour taskId ${taskId}:`, 'yellow');
  try {
    const { stdout: mongoCount } = await execPromise(
      `docker exec mongo mongosh --quiet --eval "db.getSiblingDB('tasksdb').comments.countDocuments({taskId: ${taskId}})"`
    );
    log(`${mongoCount.trim()} commentaire(s)`, 'cyan');
  } catch (error) {
    log('Impossible de vérifier MongoDB directement', 'yellow');
  }

  console.log('');
  log('========================================', 'cyan');
  log(' PARTIE 4: TESTS DE VALIDATION        ', 'cyan');
  log('========================================', 'cyan');

  // 11. Champ manquant
  console.log('');
  log('Test 9: Validation - Champ manquant', 'magenta');
  const invalid1 = await request(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { title: 'Titre seulement' }
  });
  log('Erreur attendue (400):', 'green');
  console.log(JSON.stringify(invalid1.data, null, 2));

  // 12. Status invalide
  console.log('');
  log('Test 10: Validation - Status invalide', 'magenta');
  const invalid2 = await request(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      title: 'Test',
      description: 'Description',
      status: 'invalid_status'
    }
  });
  log('Erreur attendue (400):', 'green');
  console.log(JSON.stringify(invalid2.data, null, 2));

  // 13. ID invalide
  console.log('');
  log('Test 11: Validation - ID invalide', 'magenta');
  const invalid3 = await request(`${baseUrl}/tasks/abc`);
  log('Erreur attendue (400):', 'green');
  console.log(JSON.stringify(invalid3.data, null, 2));

  console.log('');
  log('========================================', 'cyan');
  log(' PARTIE 5: TESTS DE SUPPRESSION       ', 'cyan');
  log('========================================', 'cyan');

  // 14. DELETE commentaire
  console.log('');
  log(`Test 12: DELETE /tasks/${taskId}/comments/${commentId} (MongoDB)`, 'magenta');
  const deletedComment = await request(`${baseUrl}/tasks/${taskId}/comments/${commentId}`, {
    method: 'DELETE'
  });
  if (deletedComment.status === 204) {
    log('Commentaire supprimé (204 No Content)', 'green');
  } else {
    log('Erreur lors de la suppression', 'red');
  }

  // 15. DELETE tâche
  console.log('');
  log(`Test 13: DELETE /tasks/${taskId} (PostgreSQL + cascade)`, 'magenta');
  const deletedTask = await request(`${baseUrl}/tasks/${taskId}`, {
    method: 'DELETE'
  });
  if (deletedTask.status === 204) {
    log('Tâche supprimée (204 No Content)', 'green');
  } else {
    log('Erreur lors de la suppression', 'red');
  }

  console.log('');
  log('Vérification que le cache Redis a été invalidé...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const { stdout: cacheAfter } = await execPromise('docker exec redis redis-cli GET "tasks:all"');
  if (!cacheAfter.trim() || cacheAfter.trim() === '(nil)') {
    log('Cache invalidé', 'green');
  } else {
    log('Cache encore présent (sera régénéré au prochain GET)', 'yellow');
  }

  console.log('');
  log('========================================', 'cyan');
  log('         RÉSUMÉ DE LA DÉMO             ', 'cyan');
  log('========================================', 'cyan');
  console.log('');
  log('PostgreSQL (Prisma):', 'green');
  log('   - Création de tâche', 'reset');
  log('   - Lecture de tâche', 'reset');
  log('   - Modification de tâche', 'reset');
  log('   - Suppression de tâche', 'reset');
  console.log('');
  log('MongoDB:', 'green');
  log('   - Création de commentaire', 'reset');
  log('   - Lecture de commentaires', 'reset');
  log('   - Modification de commentaire', 'reset');
  log('   - Suppression de commentaire', 'reset');
  console.log('');
  log('Redis:', 'green');
  log('   - Cache de la liste des tâches (TTL 60s)', 'reset');
  log('   - Compteur de vues par tâche', 'reset');
  log('   - Invalidation automatique du cache', 'reset');
  console.log('');
  log('Validations:', 'green');
  log('   - Champs requis', 'reset');
  log('   - Types de données', 'reset');
  log('   - Status valides', 'reset');
  log('   - IDs valides', 'reset');
  console.log('');
  log('========================================', 'cyan');
  log('         DÉMO TERMINÉE                 ', 'cyan');
  log('========================================', 'cyan');
}

main().catch(error => {
  log(`Erreur: ${error.message}`, 'red');
  process.exit(1);
});
