/**
 * NEXORA AI Battery Intelligence Platform
 * Authentication & Role Architecture Service
 */

const SESSION_KEY = 'nexora_auth_session';
const REMEMBER_KEY = 'nexora_remember_user';

// Mock Encrypted User Store for Demo & Application Authentication
const MOCK_USERS = [
  {
    userId: 'USR-ADM-001',
    username: 'nexora.admin',
    email: 'admin@nexora.ai',
    passwordHash: 'admin123', // Demo password
    name: 'Alexander Vance',
    role: 'ADMIN',
    department: 'System Security & Battery Engineering',
    status: 'ACTIVE',
    createdDate: '2025-01-15',
    lastLogin: new Date().toISOString()
  },
  {
    userId: 'USR-USR-002',
    username: 'nexora.user',
    email: 'user@nexora.ai',
    passwordHash: 'user123', // Demo password
    name: 'Elena Rostova',
    role: 'USER',
    department: 'Battery Operations & Analytics',
    status: 'ACTIVE',
    createdDate: '2025-02-10',
    lastLogin: new Date().toISOString()
  }
];

// Role-Based Access Matrix
const ROLE_PERMISSIONS = {
  ADMIN: [
    'view_dashboard',
    'edit_battery_config',
    'edit_parameter_config',
    'manage_users',
    'edit_model_config',
    'view_system_settings',
    'view_audit_logs'
  ],
  USER: [
    'view_dashboard',
    'view_battery_info',
    'view_health_rul',
    'view_anomaly_validation',
    'export_permitted_data'
  ]
};

export const AuthService = {
  /**
   * Authenticate user credentials
   * @param {string} usernameOrEmail 
   * @param {string} password 
   * @param {boolean} rememberMe 
   * @returns {Promise<{success: boolean, user?: object, message?: string}>}
   */
  async login(usernameOrEmail, password, rememberMe = false) {
    // Simulate real network/auth delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const cleanInput = (usernameOrEmail || '').trim().toLowerCase();
    
    if (!cleanInput || !password) {
      return { success: false, message: 'Please provide both username and password.' };
    }

    // Find user by username or email
    const user = MOCK_USERS.find(u => 
      u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput
    );

    // Secure authentication check (generic message to prevent enumeration)
    if (!user || user.passwordHash !== password) {
      return { success: false, message: 'Invalid username or password.' };
    }

    if (user.status !== 'ACTIVE') {
      return { success: false, message: 'Account is deactivated. Please contact your system administrator.' };
    }

    // Update last login
    user.lastLogin = new Date().toISOString();

    // Session payload
    const sessionData = {
      userId: user.userId,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      permissions: ROLE_PERMISSIONS[user.role] || [],
      token: `NXR-TOK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      loginTime: new Date().toISOString()
    };

    // Store Session
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, user.username);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    return { success: true, user: sessionData };
  },

  /**
   * Get current authenticated session
   */
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Failed to parse session:', e);
      return null;
    }
  },

  /**
   * Check if current user has specific role
   */
  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.role === role;
  },

  /**
   * Check if current user has specific permission
   */
  hasPermission(permission) {
    const user = this.getCurrentUser();
    return user && Array.isArray(user.permissions) && user.permissions.includes(permission);
  },

  /**
   * Clear session
   */
  logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  /**
   * Get remembered username
   */
  getRememberedUser() {
    return localStorage.getItem(REMEMBER_KEY) || '';
  },

  /**
   * Guard protected routes
   * @param {string} requiredRole 
   * @returns {boolean}
   */
  checkRouteAccess(requiredRole = null) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (requiredRole && user.role !== requiredRole) return false;
    return true;
  }
};
