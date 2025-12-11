const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend files from current directory
app.use(express.static(path.join(__dirname)));

// ------------------
// Task API
// ------------------
let tasks = [];

function getMaxOrder(column) {
  const colTasks = tasks.filter(t => t.column === column);
  if (!colTasks.length) return 0;
  return Math.max(...colTasks.map(t => t.order));
}

app.get("/tasks", (req, res) => {
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.column === b.column) return a.order - b.order;
    return a.column.localeCompare(b.column);
  });
  res.json(sortedTasks);
});

app.post("/tasks", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  const task = {
    id: Date.now(),
    text,
    column: "todo",
    order: getMaxOrder("todo") + 1,
    description: "",
    labels: [],
    dueDate: ""
  };

  tasks.push(task);
  res.json(task);
});

app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  tasks = tasks.filter(t => t.id !== id);
  res.json({ success: true });
});

app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const { column, order, description, labels, dueDate, text } = req.body;

  const task = tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (column && column !== task.column) {
    task.column = column;
    task.order = order || getMaxOrder(column) + 1;
  }
  if (order !== undefined) task.order = order;

  if (text !== undefined) task.text = text;
  if (description !== undefined) task.description = description;
  if (labels !== undefined) task.labels = labels;
  if (dueDate !== undefined) task.dueDate = dueDate;

  res.json(task);
});

// Serve index.html for all other routes (for SPA routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
