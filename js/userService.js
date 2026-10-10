/**
 * NEXORA AI Battery Intelligence Platform
 * User Management Service
 * Controls user accounts, role assignment, and access status.
 */

const STORAGE_KEY = 'nexora_users_db';

const INITIAL_USERS = [
  {
    userId: 'USR-ADM-001',
    name: 'Alexander Vance',
    email: 'admin@nexora.ai',
    username: 'nexora.admin',
    role: 'ADMIN',
    department: 'System Security & Battery Engineering',
    status: 'ACTIVE',
    createdDate: '2025-01-15',
    lastLogin: '2026-10-10 09:42:15'
  },
  {
    userId: 'USR-USR-002',
    name: 'Elena Rostova',
    email: 'user@nexora.ai',
    username: 'nexora.user',
    role: 'USER',
    department: 'Battery Operations & Analytics',
    status: 'ACTIVE',
    createdDate: '2025-02-10',
    lastLogin: '2026-10-09 16:20:00'
  },
  {
    userId: 'USR-ENG-003',
    name: 'Dr. Marcus Thorne',
    email: 'marcus.thorne@nexora.ai',
    username: 'm.thorne',
    role: 'USER',
    department: 'R&D Electrochemistry',
    status: 'ACTIVE',
    createdDate: '2025-03-01',
    lastLogin: '2026-10-08 11:05:30'
  },
  {
    userId: 'USR-ANA-004',
    name: 'Sarah Chen',
    email: 'sarah.chen@nexora.ai',
    username: 's.chen',
    role: 'USER',
    department: 'Fleet Analytics',
    status: 'ACTIVE',
    createdDate: '2025-04-12',
    lastLogin: '2026-10-07 14:15:22'
  }
];

export const UserService = {
  getUsers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_USERS;
    } catch (e) {
      return INITIAL_USERS;
    }
  },

  addUser(userObj) {
    const users = this.getUsers();
    const newId = `USR-${userObj.role === 'ADMIN' ? 'ADM' : 'USR'}-${String(users.length + 1).padStart(3, '0')}`;
    const newUser = {
      userId: newId,
      name: userObj.name,
      email: userObj.email,
      username: userObj.username,
      role: userObj.role || 'USER',
      department: userObj.department || 'Operations',
      status: 'ACTIVE',
      createdDate: new Date().toISOString().split('T')[0],
      lastLogin: 'Never'
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return newUser;
  },

  updateUser(userId, updates) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.userId === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      return true;
    }
    return false;
  },

  toggleStatus(userId) {
    const users = this.getUsers();
    const u = users.find(x => x.userId === userId);
    if (u) {
      u.status = u.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      return u.status;
    }
    return null;
  }
};
