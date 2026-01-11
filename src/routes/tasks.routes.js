const express = require("express");
const router = express.Router();
const taskController = require("../controllers/tasks.controller");
const {
  validateTaskData,
  validateTaskUpdateData,
  validateCommentData,
  validateCommentUpdateData,
  validateTaskId,
  validateCommentId,
} = require("../middleware/validation");

// Routes pour les tâches
router.get("/", taskController.getAllTasks);
router.get("/:id", validateTaskId, taskController.getTaskById);
router.post("/", validateTaskData, taskController.createTask);
router.put("/:id", validateTaskId, validateTaskUpdateData, taskController.updateTask);
router.delete("/:id", validateTaskId, taskController.deleteTask);

// Routes pour les commentaires
router.post("/:id/comments", validateTaskId, validateCommentData, taskController.addComment);
router.get("/:id/comments", validateTaskId, taskController.getComments);
router.put("/:id/comments/:commentId", validateTaskId, validateCommentId, validateCommentUpdateData, taskController.updateComment);
router.delete("/:id/comments/:commentId", validateTaskId, validateCommentId, taskController.deleteComment);

module.exports = router;