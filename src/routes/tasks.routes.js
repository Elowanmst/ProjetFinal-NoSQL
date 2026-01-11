const express = require("express");
const router = express.Router();
const taskController = require("../controllers/tasks.controller");

router.get("/", taskController.getAllTasks);
router.get("/:id", taskController.getTaskById);
router.post("/", taskController.createTask);
router.put("/:id", taskController.updateTask);
router.delete("/:id", taskController.deleteTask);

router.post("/:id/comments", taskController.addComment);
router.get("/:id/comments", taskController.getComments);
router.put("/:id/comments/:commentId", taskController.updateComment);
router.delete("/:id/comments/:commentId", taskController.deleteComment);

module.exports = router;