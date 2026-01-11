// Middleware de validation pour les tâches et commentaires

const validateTaskData = (req, res, next) => {
  const { title, description, status } = req.body;

  // Vérifier que les champs requis sont présents
  if (!title || !description || !status) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["title", "description", "status"],
    });
  }

  // Vérifier que les champs sont des strings
  if (typeof title !== "string" || typeof description !== "string" || typeof status !== "string") {
    return res.status(400).json({
      error: "Invalid field types",
      message: "title, description, and status must be strings",
    });
  }

  // Vérifier que les champs ne sont pas vides
  if (title.trim() === "" || description.trim() === "" || status.trim() === "") {
    return res.status(400).json({
      error: "Empty fields not allowed",
      message: "title, description, and status cannot be empty",
    });
  }

  // Vérifier que le status est valide
  const validStatuses = ["pending", "in_progress", "completed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: "Invalid status",
      message: `status must be one of: ${validStatuses.join(", ")}`,
    });
  }

  next();
};


const validateTaskUpdateData = (req, res, next) => {
  const { title, description, status } = req.body;

  // Pour un UPDATE, au moins un champ doit être fourni
  if (!title && !description && !status) {
    return res.status(400).json({
      error: "No fields to update",
      message: "At least one field (title, description, or status) must be provided",
    });
  }

  // Vérifier les types si les champs sont présents
  if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
    return res.status(400).json({
      error: "Invalid title",
      message: "title must be a non-empty string",
    });
  }

  if (description !== undefined && (typeof description !== "string" || description.trim() === "")) {
    return res.status(400).json({
      error: "Invalid description",
      message: "description must be a non-empty string",
    });
  }

  if (status !== undefined) {
    const validStatuses = ["pending", "in_progress", "completed"];
    if (typeof status !== "string" || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
        message: `status must be one of: ${validStatuses.join(", ")}`,
      });
    }
  }

  next();
};


const validateCommentData = (req, res, next) => {
  const { author, content } = req.body;

  // Vérifier que les champs requis sont présents
  if (!author || !content) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["author", "content"],
    });
  }

  // Vérifier que les champs sont des strings
  if (typeof author !== "string" || typeof content !== "string") {
    return res.status(400).json({
      error: "Invalid field types",
      message: "author and content must be strings",
    });
  }

  // Vérifier que les champs ne sont pas vides
  if (author.trim() === "" || content.trim() === "") {
    return res.status(400).json({
      error: "Empty fields not allowed",
      message: "author and content cannot be empty",
    });
  }

  next();
};


const validateCommentUpdateData = (req, res, next) => {
  const { author, content } = req.body;

  // Pour un UPDATE, au moins un champ doit être fourni
  if (!author && !content) {
    return res.status(400).json({
      error: "No fields to update",
      message: "At least one field (author or content) must be provided",
    });
  }

  // Vérifier les types si les champs sont présents
  if (author !== undefined && (typeof author !== "string" || author.trim() === "")) {
    return res.status(400).json({
      error: "Invalid author",
      message: "author must be a non-empty string",
    });
  }

  if (content !== undefined && (typeof content !== "string" || content.trim() === "")) {
    return res.status(400).json({
      error: "Invalid content",
      message: "content must be a non-empty string",
    });
  }

  next();
};


const validateTaskId = (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid task ID",
      message: "Task ID must be a positive integer",
    });
  }

  req.taskId = id;
  next();
};


const validateCommentId = (req, res, next) => {
  const { commentId } = req.params;

  // Vérifier que c'est un ObjectId MongoDB valide (24 caractères hexadécimaux)
  if (!/^[0-9a-fA-F]{24}$/.test(commentId)) {
    return res.status(400).json({
      error: "Invalid comment ID",
      message: "Comment ID must be a valid MongoDB ObjectId",
    });
  }

  next();
};


module.exports = {
  validateTaskData,
  validateTaskUpdateData,
  validateCommentData,
  validateCommentUpdateData,
  validateTaskId,
  validateCommentId,
};
