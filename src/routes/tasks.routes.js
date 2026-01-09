const express = require("express");
const router = express.Router();
const taskController = require("../controllers/tasks.controller");

router.get("/", taskController.getAllTasks);
router.get("/:id", taskController.getTaskById);
router.post("/", taskController.createTask);

router.post("/:id/comments", taskController.addComment);
router.get("/:id/comments", taskController.getComments);

module.exports = router;