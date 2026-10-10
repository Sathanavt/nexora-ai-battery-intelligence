import { AuthService } from './authService.js';
import { UserService } from './userService.js';
import { ParameterService } from './parameterService.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Guard route: Requires ADMIN privileges
  const user = AuthService.getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    alert('Access Restricted: Admin Control requires administrator privileges.');
    window.location.href = 'dashboard.html';
    return;
  }

  // Populate Header Profile
  document.getElementById('userNameDisplay').textContent = user.name;
  document.getElementById('userRoleDisplay').textContent = user.role;
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    AuthService.logout();
    window.location.href = 'index.html';
  });

  // 2. User Management Table Rendering
  const userTableBody = document.getElementById('userTableBody');

  function renderUserTable() {
    const users = UserService.getUsers();
    userTableBody.innerHTML = '';

    users.forEach(u => {
      const tr = document.createElement('tr');
      const isAdmin = u.role === 'ADMIN';
      const isActive = u.status === 'ACTIVE';

      tr.innerHTML = `
        <td><strong>${u.userId}</strong></td>
        <td>${u.name}</td>
        <td>
          <div style="font-weight: 600;">${u.username}</div>
          <div style="font-size: 0.75rem; color: #64748b;">${u.email}</div>
        </td>
        <td>${u.department || 'Operations'}</td>
        <td><span class="role-badge ${isAdmin ? 'role-admin' : 'role-user'}">${u.role}</span></td>
        <td><span class="${isActive ? 'status-active' : 'status-deactivated'}">${u.status}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="action-btn toggle-role-btn" data-id="${u.userId}">${isAdmin ? 'Demote to USER' : 'Make ADMIN'}</button>
            <button class="action-btn toggle-status-btn" data-id="${u.userId}">${isActive ? 'Deactivate' : 'Activate'}</button>
          </div>
        </td>
      `;
      userTableBody.appendChild(tr);
    });

    // Attach listeners
    document.querySelectorAll('.toggle-role-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const u = UserService.getUsers().find(x => x.userId === id);
        if (u) {
          const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
          UserService.updateUser(id, { role: newRole });
          addAuditLog(`Updated user '${u.username}' role to ${newRole}.`);
          renderUserTable();
        }
      });
    });

    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const newStatus = UserService.toggleStatus(id);
        const u = UserService.getUsers().find(x => x.userId === id);
        if (u) {
          addAuditLog(`Changed status of user '${u.username}' to ${newStatus}.`);
        }
        renderUserTable();
      });
    });
  }

  // Modal Controls for Add User
  const modal = document.getElementById('addUserModal');
  const openModalBtn = document.getElementById('openAddUserBtn');
  const closeModalBtn = document.getElementById('closeAddUserBtn');
  const cancelModalBtn = document.getElementById('cancelAddUserBtn');
  const addUserForm = document.getElementById('addUserForm');

  openModalBtn.addEventListener('click', () => modal.classList.add('active'));
  closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelModalBtn.addEventListener('click', () => modal.classList.remove('active'));

  addUserForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newUser = UserService.addUser({
      name: document.getElementById('newFullName').value,
      username: document.getElementById('newUsername').value,
      email: document.getElementById('newEmail').value,
      department: document.getElementById('newDept').value,
      role: document.getElementById('newRole').value
    });

    addAuditLog(`Created new system user account '${newUser.username}' (${newUser.role}).`);
    renderUserTable();
    addUserForm.reset();
    modal.classList.remove('active');
  });

  // 3. Render Parameter Thresholds
  const paramContainer = document.getElementById('parametersAdminContainer');

  function renderParameters() {
    const params = ParameterService.getParameters();
    paramContainer.innerHTML = '';

    params.forEach(p => {
      const div = document.createElement('div');
      div.className = 'param-admin-item';
      div.innerHTML = `
        <div class="param-admin-header">
          <div class="param-admin-title">${p.displayName} (${p.category})</div>
          <div style="font-size: 0.8rem; color: #64748b;">Unit: ${p.unit}</div>
        </div>
        <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 0.5rem;">${p.description}</div>
        <div class="param-inputs-grid">
          <div class="param-input-group">
            <label>Min Limit</label>
            <input type="number" step="any" value="${p.minVal}" class="p-min" data-id="${p.id}" />
          </div>
          <div class="param-input-group">
            <label>Max Limit</label>
            <input type="number" step="any" value="${p.maxVal}" class="p-max" data-id="${p.id}" />
          </div>
          <div class="param-input-group">
            <label>Warning Threshold</label>
            <input type="number" step="any" value="${p.warningThreshold}" class="p-warn" data-id="${p.id}" />
          </div>
          <div class="param-input-group">
            <label>Critical Threshold</label>
            <input type="number" step="any" value="${p.criticalThreshold}" class="p-crit" data-id="${p.id}" />
          </div>
        </div>
      `;
      paramContainer.appendChild(div);
    });
  }

  // Save Thresholds
  document.getElementById('saveParamsBtn').addEventListener('click', () => {
    const params = ParameterService.getParameters();
    params.forEach(p => {
      const minInput = document.querySelector(`.p-min[data-id="${p.id}"]`);
      const maxInput = document.querySelector(`.p-max[data-id="${p.id}"]`);
      const warnInput = document.querySelector(`.p-warn[data-id="${p.id}"]`);
      const critInput = document.querySelector(`.p-crit[data-id="${p.id}"]`);

      if (minInput && maxInput && warnInput && critInput) {
        p.minVal = parseFloat(minInput.value);
        p.maxVal = parseFloat(maxInput.value);
        p.warningThreshold = parseFloat(warnInput.value);
        p.criticalThreshold = parseFloat(critInput.value);
        ParameterService.updateParameter(p);
      }
    });

    addAuditLog(`Updated battery safety parameter thresholds.`);
    alert('Battery parameter thresholds successfully updated and saved!');
  });

  // 4. Model Controls
  const activeModelSelect = document.getElementById('activeModelSelect');
  activeModelSelect.addEventListener('change', (e) => {
    addAuditLog(`Primary machine learning model switched to ${e.target.value}.`);
  });

  document.getElementById('triggerRetrainBtn').addEventListener('click', () => {
    addAuditLog(`Initiated manual AI model retraining pipeline for ${activeModelSelect.value}.`);
    alert(`Model retraining pipeline triggered for ${activeModelSelect.value}. Optimization in progress.`);
  });

  // 5. Audit Logging Helper
  const auditList = document.getElementById('auditLogList');
  function addAuditLog(text) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const item = document.createElement('div');
    item.style.cssText = 'padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9;';
    item.innerHTML = `<strong>[${timestamp}]</strong> ${text}`;
    auditList.insertBefore(item, auditList.firstChild);
  }

  // Initialize
  renderUserTable();
  renderParameters();
});
