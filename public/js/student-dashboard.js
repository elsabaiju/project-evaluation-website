// API Base URL
const API_BASE = '/api';

// Global variables
let currentUser = null;
let assignments = [];

// Utility functions
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

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
    
    setTimeout(() => {
        if (errorDiv) errorDiv.style.display = 'none';
    }, 5000);
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
    
    setTimeout(() => {
        if (successDiv) successDiv.style.display = 'none';
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function isOverdue(dueDate) {
    return new Date() > new Date(dueDate);
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        window.location.href = '/login.html';
        return false;
    }
    
    currentUser = JSON.parse(userStr);
    
    if (currentUser.role !== 'student') {
        window.location.href = '/dashboard.html';
        return false;
    }
    
    return true;
}

// Initialize dashboard
async function initDashboard() {
    if (!checkAuth()) return;
    
    // Update user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.textContent = `Welcome, ${currentUser.fullName}`;
    }
    
    await loadDashboardData();
    
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.style.display = 'none';
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/assignments`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            assignments = data.assignments;
            updateStats();
            renderRecentActivity();
            renderUpcomingDeadlines();
        } else {
            showError('Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Network error loading dashboard data');
    }
}

// Update statistics
function updateStats() {
    const totalAssignments = assignments.length;
    const submittedCount = assignments.filter(a => a.submission).length;
    const evaluatedCount = assignments.filter(a => a.submission && a.submission.isEvaluated).length;
    
    // Calculate average grade
    const evaluatedAssignments = assignments.filter(a => a.submission && a.submission.isEvaluated);
    let averageGrade = '-';
    
    if (evaluatedAssignments.length > 0) {
        const totalMarks = evaluatedAssignments.reduce((sum, a) => sum + a.submission.marks, 0);
        const totalMaxMarks = evaluatedAssignments.reduce((sum, a) => sum + a.maxMarks, 0);
        averageGrade = ((totalMarks / totalMaxMarks) * 100).toFixed(1) + '%';
    }
    
    // Update DOM
    document.getElementById('totalAssignments').textContent = totalAssignments;
    document.getElementById('submittedCount').textContent = submittedCount;
    document.getElementById('evaluatedCount').textContent = evaluatedCount;
    document.getElementById('averageGrade').textContent = averageGrade;
}

// Render recent activity
function renderRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    // Get recent submissions and evaluations
    const recentActivities = [];
    
    assignments.forEach(assignment => {
        if (assignment.submission) {
            recentActivities.push({
                type: 'submission',
                assignment: assignment,
                date: assignment.submission.submittedAt,
                message: `Submitted "${assignment.title}"`
            });
            
            if (assignment.submission.isEvaluated) {
                recentActivities.push({
                    type: 'evaluation',
                    assignment: assignment,
                    date: assignment.submission.evaluatedAt,
                    message: `Received grade for "${assignment.title}" - ${assignment.submission.marks}/${assignment.maxMarks}`
                });
            }
        }
    });
    
    // Sort by date (most recent first)
    recentActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Take only the 5 most recent
    const recentFive = recentActivities.slice(0, 5);
    
    if (recentFive.length === 0) {
        container.innerHTML = '<p style="padding: 1rem; text-align: center; color: #666;">No recent activity</p>';
        return;
    }
    
    container.innerHTML = recentFive.map(activity => `
        <div class="activity-item">
            <div class="activity-info">
                <h5>${activity.message}</h5>
                <p>${activity.assignment.subject} - ${activity.assignment.teacher.fullName}</p>
            </div>
            <div class="activity-time">${formatDate(activity.date)}</div>
        </div>
    `).join('');
}

// Render upcoming deadlines
function renderUpcomingDeadlines() {
    const container = document.getElementById('upcomingDeadlines');
    if (!container) return;
    
    // Get assignments that are not submitted and not overdue
    const upcomingDeadlines = assignments
        .filter(a => !a.submission && !isOverdue(a.dueDate))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);
    
    if (upcomingDeadlines.length === 0) {
        container.innerHTML = '<p style="padding: 1rem; text-align: center; color: #666;">No upcoming deadlines</p>';
        return;
    }
    
    container.innerHTML = upcomingDeadlines.map(assignment => {
        const daysLeft = Math.ceil((new Date(assignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        return `
            <div class="deadline-item">
                <div class="deadline-info">
                    <h5>${assignment.title}</h5>
                    <p>${assignment.subject} - ${assignment.teacher.fullName}</p>
                </div>
                <div class="deadline-time">
                    <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</strong><br>
                    <small>${formatDate(assignment.dueDate)}</small>
                </div>
            </div>
        `;
    }).join('');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }
});
