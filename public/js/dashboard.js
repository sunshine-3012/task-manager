/**
 * Dashboard Controller: Stats, Productivity Visualizer & Layout Manager
 */

const Dashboard = {
  currentStats: null,

  async init() {
    this.setupEventListeners();
    await this.loadUserProfile();
    await this.refreshStats();
  },

  setupEventListeners() {
    const menuBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (menuBtn && sidebar && backdrop) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('show');
      });

      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('show');
      });
    }

    const userBtn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    if (userBtn && dropdown) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!userBtn.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove('show');
        }
      });
    }

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => toggleTheme());
    }

    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await Auth.logout();
      });
    });

    const settingsBtns = document.querySelectorAll('.open-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          settingsModal.classList.add('show');
          this.populateSettingsForm();
        });
      });

      const closeSettings = settingsModal.querySelectorAll('.close-modal');
      closeSettings.forEach(btn => {
        btn.addEventListener('click', () => {
          settingsModal.classList.remove('show');
        });
      });

      const form = document.getElementById('settings-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await this.saveProfileSettings();
        });
      }
    }
  },

  async loadUserProfile() {
    try {
      const res = await API.getProfile();
      if (res && res.profile) {
        const { full_name, email, theme_preference } = res.profile;

        const nameElements = document.querySelectorAll('.user-display-name');
        nameElements.forEach(el => {
          el.textContent = full_name || email.split('@')[0];
        });

        const emailElements = document.querySelectorAll('.user-display-email');
        emailElements.forEach(el => {
          el.textContent = email;
        });

        const initial = (full_name || email || 'U').charAt(0).toUpperCase();
        const avatarEls = document.querySelectorAll('.avatar-initial');
        avatarEls.forEach(el => {
          el.textContent = initial;
        });

        if (theme_preference) {
          document.documentElement.setAttribute('data-theme', theme_preference);
          updateThemeIcon(theme_preference);
        }
      }
    } catch (err) {
      console.warn('Could not load user profile details:', err);
    }
  },

  populateSettingsForm() {
    const fullNameInput = document.getElementById('setting-full-name');
    const themeSelect = document.getElementById('setting-theme');
    const nameEl = document.querySelector('.user-display-name');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

    if (fullNameInput && nameEl) {
      fullNameInput.value = nameEl.textContent.trim();
    }
    if (themeSelect) {
      themeSelect.value = currentTheme;
    }
  },

  async saveProfileSettings() {
    const fullNameInput = document.getElementById('setting-full-name');
    const themeSelect = document.getElementById('setting-theme');
    const submitBtn = document.getElementById('save-settings-btn');
    const modal = document.getElementById('settings-modal');

    const newName = fullNameInput ? fullNameInput.value.trim() : '';
    const newTheme = themeSelect ? themeSelect.value : 'dark';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      await API.updateProfile({
        full_name: newName,
        theme_preference: newTheme
      });

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('taskflow_theme', newTheme);
      updateThemeIcon(newTheme);

      if (newName) {
        document.querySelectorAll('.user-display-name').forEach(el => {
          el.textContent = newName;
        });
        document.querySelectorAll('.avatar-initial').forEach(el => {
          el.textContent = newName.charAt(0).toUpperCase();
        });
      }

      if (window.Tasks && window.Tasks.showToast) {
        Tasks.showToast('Profile updated successfully!', 'success');
      }

      if (modal) modal.classList.remove('show');
    } catch (err) {
      if (window.Tasks && window.Tasks.showToast) {
        Tasks.showToast(err.message || 'Failed to save settings', 'error');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
      }
    }
  },

  async refreshStats() {
    try {
      const res = await API.getStats();
      if (!res || !res.stats) return;

      this.currentStats = res.stats;
      this.renderStatCards(res.stats);
      this.renderProductivity(res.stats);
      this.updateSidebarBadges(res.stats);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    }
  },

  renderStatCards(stats) {
    this.animateCount('stat-total-val', stats.total);
    this.animateCount('stat-pending-val', stats.pending);
    this.animateCount('stat-progress-val', stats.inProgress);
    this.animateCount('stat-completed-val', stats.completed);
    this.animateCount('stat-overdue-val', stats.overdue);
    this.animateCount('stat-today-val', stats.dueToday);
  },

  animateCount(elementId, targetVal) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const start = parseInt(el.textContent, 10) || 0;
    const duration = 400;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (targetVal - start) * progress);
      el.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = targetVal;
      }
    }

    requestAnimationFrame(update);
  },

  renderProductivity(stats) {
    const pct = stats.completionPercentage || 0;
    const radialPctEl = document.getElementById('radial-pct');
    const circle = document.getElementById('radial-circle-bar');

    if (radialPctEl) {
      radialPctEl.textContent = `${pct}%`;
    }

    if (circle) {
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      circle.style.strokeDasharray = `${circumference} ${circumference}`;
      const offset = circumference - (pct / 100) * circumference;
      circle.style.strokeDashoffset = offset;
    }

    const completedLeg = document.getElementById('legend-completed-count');
    const pendingLeg = document.getElementById('legend-pending-count');
    if (completedLeg) completedLeg.textContent = `${stats.completed} Completed`;
    if (pendingLeg) pendingLeg.textContent = `${stats.pending + stats.inProgress} In Progress/Pending`;

    const chartBarsContainer = document.getElementById('weekly-chart-bars');
    if (!chartBarsContainer || !stats.weeklyProductivity) return;

    chartBarsContainer.innerHTML = '';

    const maxVal = Math.max(
      ...stats.weeklyProductivity.map(d => Math.max(d.completed, d.created)),
      4
    );

    stats.weeklyProductivity.forEach(item => {
      const col = document.createElement('div');
      col.className = 'chart-column';

      const completedHeight = Math.max(Math.round((item.completed / maxVal) * 110), 4);
      const createdHeight = Math.max(Math.round((item.created / maxVal) * 110), 4);

      col.innerHTML = `
        <div class="bar-group">
          <div class="bar bar-created" style="height: ${createdHeight}px;">
            <span class="bar-tooltip">${item.created} created</span>
          </div>
          <div class="bar bar-completed" style="height: ${completedHeight}px;">
            <span class="bar-tooltip">${item.completed} completed</span>
          </div>
        </div>
        <span class="chart-day">${item.day}</span>
      `;

      chartBarsContainer.appendChild(col);
    });
  },

  updateSidebarBadges(stats) {
    const badgeAll = document.getElementById('badge-all');
    const badgeToday = document.getElementById('badge-today');
    const badgeCompleted = document.getElementById('badge-completed');
    const badgeOverdue = document.getElementById('badge-overdue');

    if (badgeAll) badgeAll.textContent = stats.total;
    if (badgeToday) badgeToday.textContent = stats.dueToday;
    if (badgeCompleted) badgeCompleted.textContent = stats.completed;
    if (badgeOverdue) {
      badgeOverdue.textContent = stats.overdue;
      badgeOverdue.style.display = stats.overdue > 0 ? 'inline-block' : 'none';
    }
  }
};

window.Dashboard = Dashboard;
