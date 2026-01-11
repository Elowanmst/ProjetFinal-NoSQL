const prisma = require("../services/prisma");
const redis = require("../services/redis");
const connectMongo = require("../services/mongo");
const { ObjectId } = require("mongodb");


// GET /tasks -> toutes les tâches avec Redis
const getAllTasks = async (req, res) => {
  try {
    const cachedTasks = await redis.get("tasks:all");
    if (cachedTasks) {
      return res.json(JSON.parse(cachedTasks));
    }

    const tasks = await prisma.task.findMany();

    await redis.setex("tasks:all", 60, JSON.stringify(tasks));

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// GET /tasks/:id → 1 tâche + compteur vues avec Redis

const getTaskById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await redis.incr(`task:${id}:views`);

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) return res.status(404).json({ error: "Task not found" });

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// POST /tasks → creation de la tâche

const createTask = async (req, res) => {
  try {
    const { title, description, status } = req.body;

    const task = await prisma.task.create({
      data: { title, description, status },
    });

    
    await redis.del("tasks:all");

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// PUT /tasks/:id → modification de la tâche

const updateTask = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, status } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: { title, description, status },
    });

    await redis.del("tasks:all");

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// DELETE /tasks/:id → suppression de la tâche

const deleteTask = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.task.delete({
      where: { id },
    });

    await redis.del("tasks:all");
    await redis.del(`task:${id}:views`);

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};



// POST /tasks/:id/comments

const addComment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { author, content } = req.body;

    const db = await connectMongo();
    const comment = await db.collection("comments").insertOne({
      taskId: id,
      author,
      content,
      createdAt: new Date(),
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getComments = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const db = await connectMongo();
    const comments = await db
      .collection("comments")
      .find({ taskId: id })
      .toArray();

    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// PUT /tasks/:id/comments/:commentId → modification d'un commentaire

const updateComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const { author, content } = req.body;

    const db = await connectMongo();
    const result = await db.collection("comments").updateOne(
      { _id: new ObjectId(commentId) },
      { $set: { author, content, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.json({ message: "Comment updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// DELETE /tasks/:id/comments/:commentId → suppression d'un commentaire

const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;

    const db = await connectMongo();
    const result = await db.collection("comments").deleteOne({
      _id: new ObjectId(commentId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  getComments,
  updateComment,
  deleteComment,
};