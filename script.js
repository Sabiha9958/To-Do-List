// Enhanced Todo App with Advanced Features
class TodoApp {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    this.currentFilter = "all";
    this.currentSort = "created";
    this.settings = JSON.parse(localStorage.getItem("settings")) || {
      notifications: true,
      sound: true,
      autoSave: true,
      theme: "light",
    };

    this.quotes = [
      "The way to get started is to quit talking and begin doing. - Walt Disney",
      "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
      "The future depends on what you do today. - Mahatma Gandhi",
      "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
      "The only way to do great work is to love what you do. - Steve Jobs",
    ];

    this.sounds = {
      add: () => this.playSound(800, 200),
      complete: () => this.playSound(600, 200),
      delete: () => this.playSound(400, 300),
      error: () => this.playSound(300, 500),
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadTheme();
    this.updateDailyQuote();
    this.renderTasks();
    this.startReminderCheck();
    this.requestNotificationPermission();

    // Auto-save every 30 seconds
    if (this.settings.autoSave) {
      setInterval(() => this.saveTasks(), 30000);
    }
  }

  bindEvents() {
    // Main functionality
    document
      .getElementById("addTaskBtn")
      .addEventListener("click", () => this.addTask());
    document.getElementById("taskInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addTask();
    });

    // Character counter
    document.getElementById("taskInput").addEventListener("input", (e) => {
      document.getElementById("charCount").textContent = e.target.value.length;
    });

    // Theme toggle
    document
      .getElementById("themeToggle")
      .addEventListener("click", () => this.toggleTheme());

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.setFilter(e.target.dataset.filter)
      );
    });

    // Sort functionality
    document.getElementById("sortBy").addEventListener("change", (e) => {
      this.currentSort = e.target.value;
      this.renderTasks();
    });

    // Search functionality
    document
      .getElementById("searchInput")
      .addEventListener("input", () => this.renderTasks());
    document.getElementById("clearSearch").addEventListener("click", () => {
      document.getElementById("searchInput").value = "";
      this.renderTasks();
    });

    // Action buttons
    document
      .getElementById("clearCompleted")
      .addEventListener("click", () => this.clearCompleted());
    document
      .getElementById("exportTasks")
      .addEventListener("click", () => this.exportTasks());
    document
      .getElementById("importTasks")
      .addEventListener("click", () => this.importTasks());

    // Settings modal
    document
      .getElementById("settingsBtn")
      .addEventListener("click", () => this.openSettings());
    document
      .getElementById("closeSettings")
      .addEventListener("click", () => this.closeSettings());

    // Settings changes
    document
      .getElementById("notificationsEnabled")
      .addEventListener("change", (e) => {
        this.settings.notifications = e.target.checked;
        this.saveSettings();
      });

    document.getElementById("soundEnabled").addEventListener("change", (e) => {
      this.settings.sound = e.target.checked;
      this.saveSettings();
    });

    document.getElementById("autoSave").addEventListener("change", (e) => {
      this.settings.autoSave = e.target.checked;
      this.saveSettings();
    });

    // File input for import
    document
      .getElementById("fileInput")
      .addEventListener("change", (e) => this.handleFileImport(e));

    // Modal close on backdrop click
    document.getElementById("settingsModal").addEventListener("click", (e) => {
      if (e.target.id === "settingsModal") this.closeSettings();
    });
  }

  addTask() {
    const text = document.getElementById("taskInput").value.trim();
    const dueDate = document.getElementById("dueDate").value;
    const priority = document.getElementById("priority").value;
    const category = document.getElementById("category").value;

    if (!text) {
      this.showToast("Please enter a task", "error");
      this.sounds.error();
      return;
    }

    const task = {
      id: Date.now(),
      text,
      done: false,
      date: dueDate,
      priority,
      category,
      pinned: false,
      created: new Date().toISOString(),
    };

    this.tasks.unshift(task);
    this.clearInputs();
    this.saveTasks();
    this.renderTasks();
    this.showToast("Task added successfully!", "success");

    if (this.settings.sound) this.sounds.add();
  }

  clearInputs() {
    document.getElementById("taskInput").value = "";
    document.getElementById("dueDate").value = "";
    document.getElementById("priority").value = "low";
    document.getElementById("category").value = "general";
    document.getElementById("charCount").textContent = "0";
  }

  toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.done = !task.done;
      task.completedAt = task.done ? new Date().toISOString() : null;
      this.saveTasks();
      this.renderTasks();

      if (this.settings.sound) {
        this.sounds.complete();
      }

      this.showToast(
        task.done ? "Task completed!" : "Task reopened",
        task.done ? "success" : "info"
      );
    }
  }

  pinTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.pinned = !task.pinned;
      this.saveTasks();
      this.renderTasks();
      this.showToast(task.pinned ? "Task pinned" : "Task unpinned", "info");
    }
  }

  editTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      const newText = prompt("Edit task:", task.text);
      if (newText && newText.trim()) {
        task.text = newText.trim();
        this.saveTasks();
        this.renderTasks();
        this.showToast("Task updated!", "success");
      }
    }
  }

  deleteTask(id) {
    if (confirm("Are you sure you want to delete this task?")) {
      this.tasks = this.tasks.filter((t) => t.id !== id);
      this.saveTasks();
      this.renderTasks();
      this.showToast("Task deleted", "warning");

      if (this.settings.sound) this.sounds.delete();
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;

    // Update active filter button
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add("active");

    this.renderTasks();
  }

  renderTasks() {
    const taskList = document.getElementById("taskList");
    const emptyState = document.getElementById("emptyState");
    const searchTerm = document
      .getElementById("searchInput")
      .value.toLowerCase();

    // Filter tasks
    let filteredTasks = this.tasks.filter((task) => {
      const matchesFilter = this.filterTask(task);
      const matchesSearch = task.text.toLowerCase().includes(searchTerm);
      return matchesFilter && matchesSearch;
    });

    // Sort tasks
    filteredTasks = this.sortTasks(filteredTasks);

    // Show/hide empty state
    if (filteredTasks.length === 0) {
      taskList.style.display = "none";
      emptyState.style.display = "block";
    } else {
      taskList.style.display = "block";
      emptyState.style.display = "none";
    }

    // Render tasks
    taskList.innerHTML = filteredTasks
      .map((task) => this.createTaskHTML(task))
      .join("");

    // Bind task events
    this.bindTaskEvents();

    // Update stats
    this.updateStats();
    this.updateProgress();
  }

  filterTask(task) {
    const now = new Date();
    const dueDate = task.date ? new Date(task.date) : null;

    switch (this.currentFilter) {
      case "active":
        return !task.done;
      case "done":
        return task.done;
      case "overdue":
        return dueDate && dueDate < now && !task.done;
      default:
        return true;
    }
  }

  sortTasks(tasks) {
    return tasks.sort((a, b) => {
      // Pinned tasks always on top
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      switch (this.currentSort) {
        case "due":
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date) - new Date(b.date);

        case "priority":
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];

        case "alphabetical":
          return a.text.localeCompare(b.text);

        default: // created
          return new Date(b.created) - new Date(a.created);
      }
    });
  }

  createTaskHTML(task) {
    const dueDate = task.date ? new Date(task.date) : null;
    const now = new Date();
    const isOverdue = dueDate && dueDate < now && !task.done;

    const taskClasses = [
      "task",
      task.done ? "done" : "",
      task.pinned ? "pinned" : "",
      isOverdue ? "overdue" : "",
      task.priority === "urgent" ? "urgent" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `
            <li class="${taskClasses}" data-id="${task.id}">
                <div class="task-checkbox ${
                  task.done ? "checked" : ""
                }" onclick="app.toggleTask(${task.id})">
                    ${task.done ? '<i class="fas fa-check"></i>' : ""}
                </div>
                <div class="task-content">
                    <div class="task-text">${this.escapeHtml(task.text)}</div>
                    <div class="task-meta">
                        <span class="priority-${task.priority}">
                            <i class="fas fa-flag"></i> ${task.priority.toUpperCase()}
                        </span>
                        <span class="category-${task.category}">
                            <i class="fas fa-tag"></i> ${task.category}
                        </span>
                        ${
                          task.date
                            ? `<span><i class="fas fa-calendar"></i> ${this.formatDate(
                                task.date
                              )}</span>`
                            : ""
                        }
                        ${
                          isOverdue
                            ? '<span class="overdue-text"><i class="fas fa-exclamation-triangle"></i> OVERDUE</span>'
                            : ""
                        }
                    </div>
                </div>
                <div class="task-actions">
                    <button class="action-btn-sm pin" onclick="app.pinTask(${
                      task.id
                    })" title="${task.pinned ? "Unpin" : "Pin"} task">
                        <i class="fas fa-thumbtack"></i>
                    </button>
                    <button class="action-btn-sm edit" onclick="app.editTask(${
                      task.id
                    })" title="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn-sm delete" onclick="app.deleteTask(${
                      task.id
                    })" title="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>
        `;
  }

  bindTaskEvents() {
    // Add any additional task-specific event listeners here
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.done).length;
    const pending = total - completed;
    const overdue = this.tasks.filter((t) => {
      const dueDate = t.date ? new Date(t.date) : null;
      return dueDate && dueDate < new Date() && !t.done;
    }).length;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("overdueTasks").textContent = overdue;
  }

  updateProgress() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.done).length;
    const percentage = total ? Math.round((completed / total) * 100) : 0;

    document.getElementById(
      "progressPercentage"
    ).textContent = `${percentage}%`;
    document.getElementById("progressBar").style.width = `${percentage}%`;
  }

  clearCompleted() {
    const completedCount = this.tasks.filter((t) => t.done).length;
    if (completedCount === 0) {
      this.showToast("No completed tasks to clear", "info");
      return;
    }

    if (confirm(`Delete ${completedCount} completed task(s)?`)) {
      this.tasks = this.tasks.filter((t) => !t.done);
      this.saveTasks();
      this.renderTasks();
      this.showToast(`${completedCount} completed tasks cleared`, "success");
    }
  }

  exportTasks() {
    const dataStr = JSON.stringify(this.tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `tasks-${new Date().toISOString().split("T")[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.showToast("Tasks exported successfully!", "success");
  }

  importTasks() {
    document.getElementById("fileInput").click();
  }

  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTasks = JSON.parse(e.target.result);
        if (Array.isArray(importedTasks)) {
          this.tasks = [...this.tasks, ...importedTasks];
          this.saveTasks();
          this.renderTasks();
          this.showToast(`${importedTasks.length} tasks imported!`, "success");
        } else {
          this.showToast("Invalid file format", "error");
        }
      } catch (error) {
        this.showToast("Error reading file", "error");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");

    this.settings.theme = isDark ? "dark" : "light";
    this.saveSettings();

    // Update theme toggle icon
    const icon = document.querySelector("#themeToggle i");
    icon.className = isDark ? "fas fa-sun" : "fas fa-moon";

    this.showToast(`${isDark ? "Dark" : "Light"} mode activated`, "info");
  }

  loadTheme() {
    if (this.settings.theme === "dark") {
      document.body.classList.add("dark-mode");
      document.querySelector("#themeToggle i").className = "fas fa-sun";
    }

    // Load other settings
    document.getElementById("notificationsEnabled").checked =
      this.settings.notifications;
    document.getElementById("soundEnabled").checked = this.settings.sound;
    document.getElementById("autoSave").checked = this.settings.autoSave;
  }

  updateDailyQuote() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem("quoteDate");

    if (savedDate !== today) {
      const randomQuote =
        this.quotes[Math.floor(Math.random() * this.quotes.length)];
      document.getElementById("dailyQuote").textContent = randomQuote;
      localStorage.setItem("quoteDate", today);
      localStorage.setItem("dailyQuote", randomQuote);
    } else {
      const savedQuote = localStorage.getItem("dailyQuote");
      if (savedQuote) {
        document.getElementById("dailyQuote").textContent = savedQuote;
      }
    }
  }

  startReminderCheck() {
    // Check for reminders every minute
    setInterval(() => {
      if (!this.settings.notifications) return;

      const now = new Date();
      this.tasks.forEach((task) => {
        if (task.done || !task.date) return;

        const dueDate = new Date(task.date);
        const timeDiff = dueDate - now;

        // Notify 1 hour before due date
        if (timeDiff > 0 && timeDiff <= 3600000) {
          this.sendNotification(`Reminder: "${task.text}" is due soon!`);
        }

        // Notify when overdue
        if (timeDiff < 0 && timeDiff >= -60000) {
          // Within 1 minute of being overdue
          this.sendNotification(`"${task.text}" is now overdue!`);
        }
      });
    }, 60000);
  }

  requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  sendNotification(message) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Smart Todo", {
        body: message,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23667eea'><path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z'/></svg>",
      });
    }
  }

  openSettings() {
    document.getElementById("settingsModal").classList.add("show");
  }

  closeSettings() {
    document.getElementById("settingsModal").classList.remove("show");
  }

  showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon = this.getToastIcon(type);
    toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = "slideInRight 0.3s reverse";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  getToastIcon(type) {
    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    };
    return icons[type] || icons.info;
  }

  playSound(frequency, duration) {
    if (!this.settings.sound) return;

    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration / 1000
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  }

  saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(this.tasks));
  }

  saveSettings() {
    localStorage.setItem("settings", JSON.stringify(this.settings));
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }
}

// Initialize the app
const app = new TodoApp();

// Global functions for onclick handlers
window.app = app;
