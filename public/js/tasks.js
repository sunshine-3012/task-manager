/**
 * Tasks Controller: CRUD, Search, Filter, Sort, Modal & Notification Manager
 */

const Tasks = {
  tasks: [],
  categories: [],
  currentFilters: {
    status: 'All',
    priority: 'All',
    category: 'All',
    timeframe: null,
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  },
  editingTaskId: null,
  taskToDeleteId: null,

  async init() {
    this.setupEventListeners();
    await this.loadCategories();
    await this.loadTasks();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.currentFilters.search = e.target.value.trim();
          this.loadTasks();
        }, 250);
      });
    }

    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentFilters.status = pill.dataset.status || 'All';
        this.loadTasks();
      });
    });

    const prioritySelect = document.getElementById('filter-priority');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', (e) => {
        this.currentFilters.priority = e.target.value;
        this.loadTasks();
      });
    }

    const categorySelect = document.getElementById('filter-category');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        this.currentFilters.category = e.target.value;
        this.loadTasks();
      });
    }

    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'oldest') {
          this.currentFilters.sortBy = 'created_at';
          this.currentFilters.sortOrder = 'asc';
        } else if (val === 'due_date') {
          this.currentFilters.sortBy = 'due_date';
          this.currentFilters.sortOrder = 'asc';
        } else if (val === 'priority') {
          this.currentFilters.sortBy = 'priority';
          this.currentFilters.sortOrder = 'desc';
        } else if (val === 'title') {
          this.currentFilters.sortBy = 'title';
          this.currentFilters.sortOrder = 'asc';
        } else if (val === 'updated_at') {
          this.currentFilters.sortBy = 'updated_at';
          this.currentFilters.sortOrder = 'desc';
        } else {
          this.currentFilters.sortBy = 'created_at';
          this.currentFilters.sortOrder = 'desc';
        }
        this.loadTasks();
      });
    }

    const navItems = document.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const view = item.dataset.view;
        this.handleViewChange(view);
      });
    });

    const addTaskBtns = document.querySelectorAll('.btn-add-task');
    addTaskBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.openCreateModal();
      });
    });

    const closeTaskModalBtns = document.querySelectorAll('#task-modal .close-modal');
    closeTaskModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeTaskModal();
      });
    });

    const taskForm = document.getElementById('task-form');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveTask();
      });
    }

    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtns = document.querySelectorAll('#delete-modal .close-modal');

    cancelDeleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (deleteModal) deleteModal.classList.remove('show');
        this.taskToDeleteId = null;
      });
    });

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        this.executeDeleteTask();
      });
    }

    const addCatBtn = document.getElementById('btn-add-category');
    const catModal = document.getElementById('category-modal');
    if (addCatBtn && catModal) {
      addCatBtn.addEventListener('click', () => {
        catModal.classList.add('show');
      });

      const closeCatBtns = catModal.querySelectorAll('.close-modal');
      closeCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          catModal.classList.remove('show');
        });
      });

      const catForm = document.getElementById('category-form');
      if (catForm) {
        catForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveCategory();
        });
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
      }
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        const s = document.getElementById('search-input');
        if (s) s.focus();
      }
    });
  },

  handleViewChange(view) {
    const productivitySection = document.querySelector('.productivity-section');
    const statsGrid = document.querySelector('.stats-grid');
    const pageTitle = document.getElementById('view-title');
    const pageSubtitle = document.getElementById('view-subtitle');

    this.currentFilters.status = 'All';
    this.currentFilters.priority = 'All';
    this.currentFilters.category = 'All';
    this.currentFilters.timeframe = null;

    document.querySelectorAll('.filter-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.status === 'All');
    });

    if (view === 'dashboard') {
      if (productivitySection) productivitySection.style.display = 'grid';
      if (statsGrid) statsGrid.style.display = 'grid';
      if (pageTitle) pageTitle.textContent = 'Dashboard Overview';
      if (pageSubtitle) pageSubtitle.textContent = 'Monitor your productivity and upcoming deliverables';
    } else {
      if (productivitySection) productivitySection.style.display = 'none';
      if (statsGrid) statsGrid.style.display = 'grid';

      if (view === 'tasks') {
        if (pageTitle) pageTitle.textContent = 'My Tasks';
        if (pageSubtitle) pageSubtitle.textContent = 'View and organize all your tasks';
      } else if (view === 'today') {
        this.currentFilters.timeframe = 'today';
        if (pageTitle) pageTitle.textContent = 'Tasks Due Today';
        if (pageSubtitle) pageSubtitle.textContent = 'Focus on items that need to be finished today';
      } else if (view === 'upcoming') {
        this.currentFilters.timeframe = 'upcoming';
        if (pageTitle) pageTitle.textContent = 'Upcoming Tasks';
        if (pageSubtitle) pageSubtitle.textContent = 'Tasks scheduled for future dates';
      } else if (view === 'completed') {
        this.currentFilters.status = 'Completed';
        if (pageTitle) pageTitle.textContent = 'Completed Tasks';
        if (pageSubtitle) pageSubtitle.textContent = 'All finished accomplishments';
      } else if (view === 'overdue') {
        this.currentFilters.status = 'Overdue';
        if (pageTitle) pageTitle.textContent = 'Overdue Tasks';
        if (pageSubtitle) pageSubtitle.textContent = 'Tasks that have passed their deadline';
      }
    }

    this.loadTasks();
  },

  async loadCategories() {
    try {
      const res = await API.getCategories();
      if (res && res.categories) {
        this.categories = res.categories;
        this.renderCategoriesSidebar(res.categories);
        this.populateCategoryDropdowns(res.categories);
      }
    } catch (err) {
      console.warn('Could not load categories:', err);
    }
  },

  renderCategoriesSidebar(categories) {
    const container = document.getElementById('sidebar-categories');
    if (!container) return;

    container.innerHTML = '';
    categories.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'category-item';
      item.innerHTML = `
        <div class="category-indicator">
          <span class="color-dot" style="background-color: ${cat.color || '#6366f1'};"></span>
          <span>${cat.name}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        this.currentFilters.category = cat.name;
        const catSelect = document.getElementById('filter-category');
        if (catSelect) catSelect.value = cat.name;
        this.loadTasks();
      });

      container.appendChild(item);
    });
  },

  populateCategoryDropdowns(categories) {
    const filterSelect = document.getElementById('filter-category');
    const formSelect = document.getElementById('task-category');

    if (filterSelect) {
      const currentVal = filterSelect.value;
      filterSelect.innerHTML = '<option value="All">All Categories</option>';
      categories.forEach(cat => {
        filterSelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
      });
      filterSelect.value = currentVal || 'All';
    }

    if (formSelect) {
      formSelect.innerHTML = '<option value="General">General</option>';
      categories.forEach(cat => {
        formSelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
      });
    }
  },

  async loadTasks() {
    const container = document.getElementById('tasks-list');
    if (!container) return;

    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <p class="state-desc">Loading tasks...</p>
      </div>
    `;

    try {
      const res = await API.getTasks(this.currentFilters);
      this.tasks = res.tasks || [];
      this.renderTasks(this.tasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      container.innerHTML = `
        <div class="state-box">
          <div class="state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 class="state-title">Failed to load tasks</h3>
          <p class="state-desc">${err.message || 'Please check your Supabase connection in .env'}</p>
          <button class="btn btn-secondary btn-sm" onclick="Tasks.loadTasks()">Try Again</button>
        </div>
      `;
    }
  },

  renderTasks(tasks) {
    const container = document.getElementById('tasks-list');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3 class="state-title">No tasks found</h3>
          <p class="state-desc">You're all caught up! Create a new task to get things done.</p>
          <button class="btn btn-primary btn-sm" onclick="Tasks.openCreateModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Task
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    tasks.forEach(task => {
      const isCompleted = task.status === 'Completed';

      let dueHtml = '';
      if (task.due_date) {
        const d = new Date(task.due_date);
        const isOverdue = !isCompleted && d < startOfToday;
        const isToday = !isCompleted && d >= startOfToday && d <= endOfToday;

        let dueClass = 'badge-due';
        let dueLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (isOverdue) {
          dueClass += ' due-overdue';
          dueLabel = `Overdue (${dueLabel})`;
        } else if (isToday) {
          dueClass += ' due-today';
          dueLabel = 'Due Today';
        }

        dueHtml = `
          <span class="badge ${dueClass}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${dueLabel}
          </span>
        `;
      }

      const priorityClass = `badge-priority-${(task.priority || 'medium').toLowerCase()}`;
      const priorityHtml = `
        <span class="badge ${priorityClass}">
          ${task.priority || 'Medium'}
        </span>
      `;

      const statusSlug = (task.status || 'Pending').toLowerCase().replace(/\s+/g, '-');
      const statusHtml = `
        <span class="badge badge-status-${statusSlug}">
          ${task.status || 'Pending'}
        </span>
      `;

      const categoryHtml = task.category ? `
        <span class="badge badge-category">
          # ${task.category}
        </span>
      ` : '';

      const card = document.createElement('div');
      card.className = `task-card ${isCompleted ? 'completed' : ''}`;
      card.id = `task-${task.id}`;

      card.innerHTML = `
        <div class="task-checkbox-wrapper">
          <div class="task-checkbox ${isCompleted ? 'checked' : ''}" title="${isCompleted ? 'Mark Pending' : 'Mark Completed'}">
            ${isCompleted ? `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ` : ''}
          </div>
        </div>

        <div class="task-body">
          <div class="task-header">
            <h4 class="task-title">${this.escapeHtml(task.title)}</h4>
            <div class="task-actions">
              <button class="action-btn edit-btn" title="Edit Task">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="action-btn delete-btn" title="Delete Task">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>

          ${task.description ? `<p class="task-desc">${this.escapeHtml(task.description)}</p>` : ''}

          <div class="task-meta">
            ${statusHtml}
            ${priorityHtml}
            ${categoryHtml}
            ${dueHtml}
          </div>
        </div>
      `;

      const checkbox = card.querySelector('.task-checkbox');
      checkbox.addEventListener('click', () => {
        this.toggleComplete(task.id, isCompleted ? 'Pending' : 'Completed');
      });

      const editBtn = card.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => {
        this.openEditModal(task);
      });

      const delBtn = card.querySelector('.delete-btn');
      delBtn.addEventListener('click', () => {
        this.openDeleteModal(task.id, task.title);
      });

      container.appendChild(card);
    });
  },

  async toggleComplete(taskId, newStatus) {
    try {
      await API.toggleComplete(taskId, newStatus);
      this.showToast(`Task marked as ${newStatus}`, 'success');

      await this.loadTasks();
      if (window.Dashboard && window.Dashboard.refreshStats) {
        await Dashboard.refreshStats();
      }
    } catch (err) {
      this.showToast(err.message || 'Failed to update task status', 'error');
    }
  },

  openCreateModal() {
    this.editingTaskId = null;
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('task-modal-title');
    const form = document.getElementById('task-form');

    if (form) form.reset();
    if (title) title.textContent = 'Create New Task';

    const dueInput = document.getElementById('task-due-date');
    if (dueInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      dueInput.value = tomorrow.toISOString().slice(0, 16);
    }

    if (modal) modal.classList.add('show');
    const titleInput = document.getElementById('task-title');
    if (titleInput) setTimeout(() => titleInput.focus(), 100);
  },

  openEditModal(task) {
    this.editingTaskId = task.id;
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('task-modal-title');

    if (modalTitle) modalTitle.textContent = 'Edit Task';

    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-status').value = task.status || 'Pending';
    document.getElementById('task-priority').value = task.priority || 'Medium';
    document.getElementById('task-category').value = task.category || 'General';

    const dueInput = document.getElementById('task-due-date');
    if (task.due_date && dueInput) {
      const d = new Date(task.due_date);
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      dueInput.value = localIso;
    } else if (dueInput) {
      dueInput.value = '';
    }

    if (modal) modal.classList.add('show');
  },

  closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) modal.classList.remove('show');
    this.editingTaskId = null;
  },

  async saveTask() {
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-description');
    const statusInput = document.getElementById('task-status');
    const priorityInput = document.getElementById('task-priority');
    const categoryInput = document.getElementById('task-category');
    const dueInput = document.getElementById('task-due-date');
    const saveBtn = document.getElementById('save-task-btn');

    const title = titleInput.value.trim();
    if (!title) {
      this.showToast('Please enter a task title', 'warning');
      titleInput.focus();
      return;
    }

    const payload = {
      title,
      description: descInput.value.trim() || null,
      status: statusInput.value,
      priority: priorityInput.value,
      category: categoryInput.value || 'General',
      due_date: dueInput.value ? new Date(dueInput.value).toISOString() : null
    };

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      if (this.editingTaskId) {
        await API.updateTask(this.editingTaskId, payload);
        this.showToast('Task updated successfully', 'success');
      } else {
        await API.createTask(payload);
        this.showToast('Task created successfully', 'success');
      }

      this.closeTaskModal();
      await this.loadTasks();
      if (window.Dashboard && window.Dashboard.refreshStats) {
        await Dashboard.refreshStats();
      }
    } catch (err) {
      this.showToast(err.message || 'Failed to save task', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Task';
      }
    }
  },

  openDeleteModal(taskId, taskTitle) {
    this.taskToDeleteId = taskId;
    const modal = document.getElementById('delete-modal');
    const titleEl = document.getElementById('delete-task-title');

    if (titleEl) {
      titleEl.textContent = `"${taskTitle}"`;
    }

    if (modal) modal.classList.add('show');
  },

  async executeDeleteTask() {
    if (!this.taskToDeleteId) return;

    const confirmBtn = document.getElementById('confirm-delete-btn');
    const modal = document.getElementById('delete-modal');

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deleting...';
    }

    try {
      await API.deleteTask(this.taskToDeleteId);
      this.showToast('Task deleted successfully', 'success');

      if (modal) modal.classList.remove('show');
      this.taskToDeleteId = null;

      await this.loadTasks();
      if (window.Dashboard && window.Dashboard.refreshStats) {
        await Dashboard.refreshStats();
      }
    } catch (err) {
      this.showToast(err.message || 'Failed to delete task', 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete Task';
      }
    }
  },

  async saveCategory() {
    const nameInput = document.getElementById('cat-name');
    const colorInput = document.getElementById('cat-color');
    const modal = document.getElementById('category-modal');

    const name = nameInput.value.trim();
    if (!name) {
      this.showToast('Category name is required', 'warning');
      return;
    }

    try {
      await API.createCategory({
        name,
        color: colorInput.value || '#6366f1'
      });

      this.showToast(`Category "${name}" created!`, 'success');
      nameInput.value = '';
      if (modal) modal.classList.remove('show');

      await this.loadCategories();
    } catch (err) {
      this.showToast(err.message || 'Failed to create category', 'error');
    }
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-message">${this.escapeHtml(message)}</span>
      <button class="toast-close" title="Dismiss">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 4000);
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.Tasks = Tasks;
