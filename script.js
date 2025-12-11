const API_URL = "http://localhost:4000";

// Modal setup (same as before)
const modalHTML = `
<div id="task-modal" style="display:none; position:fixed; top:0;left:0;width:100%;height:100%;
  background:rgba(0,0,0,0.5); justify-content:center; align-items:center;">
  <div style="background:white; padding:20px; border-radius:8px; width:90%; max-width:350px; position:relative;">
    <h2>Edit Task</h2>
    <label>Title:</label>
    <input id="modal-title" style="width:100%; margin-bottom:10px;">
    <label>Description:</label>
    <textarea id="modal-desc" style="width:100%; margin-bottom:10px;"></textarea>
    <label>Labels (comma separated):</label>
    <input id="modal-labels" style="width:100%; margin-bottom:10px;">
    <label>Due Date:</label>
    <input type="date" id="modal-due" style="width:100%; margin-bottom:10px;">
    <button id="modal-save">Save</button>
    <button id="modal-close" style="position:absolute; top:5px; right:5px;">X</button>
  </div>
</div>
`;
document.body.insertAdjacentHTML("beforeend", modalHTML);

let currentEditingTask = null;

// Load tasks
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("addBtn").addEventListener("click", addTask);

  try {
    const res = await fetch(`${API_URL}/tasks`);
    const data = await res.json();
    ["todo", "doing", "done"].forEach(col => {
      data.filter(t => t.column === col)
          .sort((a,b) => a.order - b.order)
          .forEach(task => createTaskCard(task, col));
    });
  } catch (err) {
    console.error(err);
  }

  setupSortable(); // Use SortableJS for all columns
});

// Add task
async function addTask() {
  const input = document.getElementById("taskText");
  const text = input.value.trim();
  if (!text) return;
  try {
    const res = await fetch(`${API_URL}/tasks`, {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({text})
    });
    const task = await res.json();
    createTaskCard(task, "todo");
    input.value="";
  } catch(err){console.error(err);}
}

// Create task card
function createTaskCard(task, columnId="todo") {
  const div = document.createElement("div");
  div.className="task";
  div.dataset.id = task.id;
  div.dataset.order = task.order;

  div.innerHTML = `
    <div class="task-title">${task.text}</div>
    <div class="task-labels">
      ${task.labels.map(label => `<span class="task-label">${label}</span>`).join("")}
    </div>
    ${task.dueDate ? `<div class="task-due${isOverdue(task.dueDate) ? ' overdue' : ''}">${task.dueDate}</div>` : ''}
  `;

  // Right-click delete
  div.addEventListener("contextmenu", async e=>{
    e.preventDefault();
    await fetch(`${API_URL}/tasks/${task.id}`, {method:"DELETE"});
    div.remove();
  });

  // Click to open modal
  div.addEventListener("click", () => openTaskModal(task, div));

  document.getElementById(columnId).appendChild(div);
}

// Check if due date is overdue
function isOverdue(dueDateStr) {
  if(!dueDateStr) return false;
  const now = new Date();
  const due = new Date(dueDateStr);
  return due < now;
}

// Modal functions
function openTaskModal(task, taskDiv){
  currentEditingTask = {task, taskDiv};
  document.getElementById("modal-title").value = task.text;
  document.getElementById("modal-desc").value = task.description;
  document.getElementById("modal-labels").value = task.labels.join(",");
  document.getElementById("modal-due").value = task.dueDate;
  document.getElementById("task-modal").style.display="flex";
}

document.getElementById("modal-close").addEventListener("click", ()=>{
  document.getElementById("task-modal").style.display="none";
});

document.getElementById("modal-save").addEventListener("click", async ()=>{
  const {task, taskDiv} = currentEditingTask;
  const updated = {
    text: document.getElementById("modal-title").value,
    description: document.getElementById("modal-desc").value,
    labels: document.getElementById("modal-labels").value.split(",").map(l=>l.trim()).filter(Boolean),
    dueDate: document.getElementById("modal-due").value
  };
  try {
    await fetch(`${API_URL}/tasks/${task.id}`, {
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(updated)
    });

    // Update card content
    taskDiv.innerHTML = `
      <div class="task-title">${updated.text}</div>
      <div class="task-labels">
        ${updated.labels.map(label => `<span class="task-label">${label}</span>`).join("")}
      </div>
      ${updated.dueDate ? `<div class="task-due${isOverdue(updated.dueDate) ? ' overdue' : ''}">${updated.dueDate}</div>` : ''}
    `;

    document.getElementById("task-modal").style.display="none";
  } catch(err){console.error(err);}
});

// -----------------------------
// SortableJS Integration
// -----------------------------
function setupSortable() {
  const columnIds = ["todo", "doing", "done"];
  columnIds.forEach(colId => {
    new Sortable(document.getElementById(colId), {
      group: "tasks",
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.65,
      onEnd: async (evt) => {
        const taskDiv = evt.item;
        const taskId = taskDiv.dataset.id;
        const newColumn = evt.to.id;
        const tasksInCol = Array.from(evt.to.children);
        const newOrder = tasksInCol.indexOf(taskDiv) + 1;

        // Update backend
        try {
          await fetch(`${API_URL}/tasks/${taskId}`, {
            method:"PUT",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({column: newColumn, order: newOrder})
          });
        } catch(err){console.error(err);}
      }
    });
  });
}
