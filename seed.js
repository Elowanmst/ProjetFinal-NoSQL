require("dotenv").config();
const prisma = require("./src/services/prisma");
const redis = require("./src/services/redis");
const connectMongo = require("./src/services/mongo");

async function main() {
  // ======= PostgreSQL Tasks =======
  console.log("Seeding PostgreSQL tasks...");
  const tasksData = [
    { title: "Faire les courses", description: "Acheter fruits et légumes", status: "pending" },
    { title: "Nettoyer la maison", description: "Chambre et salon", status: "in_progress" },
    { title: "Réviser Node.js", description: "Pratiquer Prisma et Express", status: "pending" },
  ];

  await prisma.task.deleteMany(); // clear table
  const tasks = await prisma.task.createMany({ data: tasksData });
  console.log(`Created ${tasks.count} tasks.`);

  // ======= Redis Cache & Views =======
  console.log("Seeding Redis cache and view counters...");
  const allTasks = await prisma.task.findMany();
  await redis.set("tasks:all", JSON.stringify(allTasks)); // cache
  for (const task of allTasks) {
    await redis.set(`task:${task.id}:views`, 0); // compteur initial
  }

  // ======= MongoDB Comments =======
  console.log("Seeding MongoDB comments...");
  const db = await connectMongo();
  const commentsCollection = db.collection("comments");
  await commentsCollection.deleteMany({}); // clear collection

  const commentsData = [
    { taskId: 1, author: "Alice", content: "N’oublie pas les pommes", createdAt: new Date() },
    { taskId: 2, author: "Bob", content: "Utilise l’aspirateur robot", createdAt: new Date() },
    { taskId: 3, author: "Charlie", content: "Relis le chapitre Prisma", createdAt: new Date() },
  ];

  await commentsCollection.insertMany(commentsData);

  console.log("Seeding done !");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });