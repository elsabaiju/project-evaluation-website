// API Base URL
const API_BASE = '/api';

// Utility functions
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    if (successDiv) {
        successDiv.style.display = 'none';
    }
}

function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
    
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function hideMessages() {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

// Get user data from localStorage
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Redirect to dashboard if already logged in
function checkAuthAndRedirect() {
    if (isLoggedIn()) {
        window.location.href = '/dashboard';
    }
}

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in on auth pages
    if (window.location.pathname === '/login.html' || window.location.pathname === '/register.html') {
        checkAuthAndRedirect();
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideMessages();

            const formData = new FormData(loginForm);
            const loginData = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });

                const data = await response.json();

                if (response.ok) {
                    // Store token and user data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    showSuccess('Login successful! Redirecting...');
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                } else {
                    showError(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Network error. Please try again.');
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        // Show/hide student ID field based on role
        const roleSelect = document.getElementById('role');
        const studentIdGroup = document.getElementById('studentIdGroup');
        
        if (roleSelect && studentIdGroup) {
            roleSelect.addEventListener('change', function() {
                if (this.value === 'student') {
                    studentIdGroup.style.display = 'block';
                    document.getElementById('studentId').required = true;
                } else {
                    studentIdGroup.style.display = 'none';
                    document.getElementById('studentId').required = false;
                }
            });
        }

        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideMessages();

            const formData = new FormData(registerForm);
            const registerData = {
                fullName: formData.get('fullName'),
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role'),
                department: formData.get('department')
            };

            // Add student ID if role is student
            if (registerData.role === 'student') {
                registerData.studentId = formData.get('studentId');
            }

            try {
                const response = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(registerData)
                });

                const data = await response.json();

                if (response.ok) {
                    // Store token and user data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    showSuccess('Registration successful! Redirecting...');
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                } else {
                    if (data.errors && Array.isArray(data.errors)) {
                        showError(data.errors.map(err => err.msg).join(', '));
                    } else {
                        showError(data.message || 'Registration failed');
                    }
                }
            } catch (error) {
                console.error('Registration error:', error);
                showError('Network error. Please try again.');
            }
        });
    }
});
