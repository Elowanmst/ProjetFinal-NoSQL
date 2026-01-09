module.exports = {
  getAllTasks: async (req, res) => {
    res.json({ message: "GET all tasks (à implémenter)" });
  },

  getTaskById: async (req, res) => {
    res.json({ message: "GET task by id (à implémenter)" });
  },

  createTask: async (req, res) => {
    res.json({ message: "POST create task (à implémenter)" });
  }
};