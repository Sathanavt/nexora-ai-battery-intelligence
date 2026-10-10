import { AuthService } from './authService.js';

document.addEventListener('DOMContentLoaded', () => {
  // Auto-redirect if session already active
  const currentUser = AuthService.getCurrentUser();
  if (currentUser) {
    let target = 'dashboard.html';
    const returnUrl = sessionStorage.getItem('nexora_return_url');
    if (returnUrl && ['dashboard.html', 'health-rul.html', 'anomaly.html'].includes(returnUrl)) {
      target = returnUrl;
    }
    sessionStorage.removeItem('nexora_return_url');
    window.location.href = target;
    return;
  }

  // DOM Elements
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const passwordToggleBtn = document.getElementById('passwordToggleBtn');
  const passwordIcon = document.getElementById('passwordIcon');
  const rememberCheckbox = document.getElementById('rememberCheckbox');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  const errorBanner = document.getElementById('errorBanner');
  const errorMessage = document.getElementById('errorMessage');

  const demoAdminBtn = document.getElementById('demoAdminBtn');
  const demoUserBtn = document.getElementById('demoUserBtn');

  // Pre-fill remembered username
  const rememberedUser = AuthService.getRememberedUser();
  if (rememberedUser) {
    usernameInput.value = rememberedUser;
    rememberCheckbox.checked = true;
    passwordInput.focus();
  }

  // Toggle Password Visibility
  let isPasswordVisible = false;
  if (passwordToggleBtn) {
    passwordToggleBtn.addEventListener('click', () => {
      isPasswordVisible = !isPasswordVisible;
      passwordInput.type = isPasswordVisible ? 'text' : 'password';
      passwordToggleBtn.setAttribute('aria-label', isPasswordVisible ? 'Hide password' : 'Show password');
      
      // Eye icon toggle
      passwordIcon.innerHTML = isPasswordVisible 
        ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 013.682-.763c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />`
        : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
    });
  }

  // Quick Demo Pills Handlers
  if (demoAdminBtn) {
    demoAdminBtn.addEventListener('click', () => {
      usernameInput.value = 'nexora.admin';
      passwordInput.value = 'admin123';
      hideError();
      submitForm();
    });
  }

  if (demoUserBtn) {
    demoUserBtn.addEventListener('click', () => {
      usernameInput.value = 'nexora.user';
      passwordInput.value = 'user123';
      hideError();
      submitForm();
    });
  }

  // Form Submit Handler
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm();
  });

  async function submitForm() {
    hideError();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberCheckbox.checked;

    if (!username) {
      showError('Please enter your username or email address.');
      usernameInput.focus();
      return;
    }

    if (!password) {
      showError('Please enter your password.');
      passwordInput.focus();
      return;
    }

    // Set Loading State
    setLoading(true);

    try {
      const res = await AuthService.login(username, password, rememberMe);
      
      if (res.success) {
        let target = 'dashboard.html';
        const returnUrl = sessionStorage.getItem('nexora_return_url');
        if (returnUrl && ['dashboard.html', 'health-rul.html', 'anomaly.html'].includes(returnUrl)) {
          target = returnUrl;
        }
        sessionStorage.removeItem('nexora_return_url');
        window.location.href = target;
      } else {
        showError(res.message || 'Invalid username or password.');
        setLoading(false);
      }
    } catch (err) {
      showError('An unexpected authentication error occurred. Please try again.');
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    usernameInput.disabled = isLoading;
    passwordInput.disabled = isLoading;
    
    if (isLoading) {
      btnText.textContent = 'Authenticating...';
      btnSpinner.style.display = 'block';
    } else {
      btnText.textContent = 'Sign In';
      btnSpinner.style.display = 'none';
    }
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.style.display = 'flex';
  }

  function hideError() {
    errorBanner.style.display = 'none';
  }
});
