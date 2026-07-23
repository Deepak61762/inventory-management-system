const API_URL = "/api/auth";

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        document.getElementById('errorMsg').textContent = data.error || 'Login failed';
        return;
      }

      // Save token + role so other pages know who's logged in
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);

      window.location.href = 'index.html';
    } catch (err) {
      document.getElementById('errorMsg').textContent = 'Could not connect to server';
    }
  });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const accessKeyField = document.getElementById('accessKey');
    const accessKey = accessKeyField ? accessKeyField.value : undefined;

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, accessKey })
      });
      const data = await res.json();

      if (!res.ok) {
        document.getElementById('errorMsg').textContent = data.error || 'Registration failed';
        return;
      }

      alert('Registered successfully! Please log in.');
      window.location.href = 'login.html';
    } catch (err) {
      document.getElementById('errorMsg').textContent = 'Could not connect to server';
    }
  });
}
