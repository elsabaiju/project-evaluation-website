// API Base URL
const API_BASE = '/api';

// Global variables
let currentUser = null;
let assignments = [];
let allSubmissions = [];

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
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        window.location.href = '/login.html';
        return false;
    }
    
    currentUser = JSON.parse(userStr);
    
    if (currentUser.role !== 'teacher') {
        window.location.href = '/student-dashboard';
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
        // Load assignments
        const assignmentsResponse = await fetch(`${API_BASE}/assignments`, {
            headers: getAuthHeaders()
        });
        
        if (assignmentsResponse.ok) {
            const assignmentsData = await assignmentsResponse.json();
            assignments = assignmentsData.assignments;
            
            // Load submissions for each assignment
            await loadAllSubmissions();
            
            updateStats();
            renderRecentActivity();
            renderNeedsAttention();
        } else {
            showError('Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Network error loading dashboard data');
    }
}

// Load all submissions
async function loadAllSubmissions() {
    allSubmissions = [];
    
    for (const assignment of assignments) {
        try {
            const response = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                allSubmissions.push(...data.submissions.map(sub => ({
                    ...sub,
                    assignmentTitle: assignment.title,
                    assignmentMaxMarks: assignment.maxMarks,
                    assignmentDueDate: assignment.dueDate
                })));
            }
        } catch (error) {
            console.error('Error loading submissions for assignment:', assignment._id);
        }
    }
}

// Update statistics
function updateStats() {
    const totalAssignments = assignments.length;
    const totalSubmissions = allSubmissions.length;
    const pendingGrading = allSubmissions.filter(s => !s.isEvaluated).length;
    
    // Calculate average grade
    const evaluatedSubmissions = allSubmissions.filter(s => s.isEvaluated);
    let averageGrade = '-';
    
    if (evaluatedSubmissions.length > 0) {
        const totalMarks = evaluatedSubmissions.reduce((sum, s) => sum + s.marks, 0);
        const totalMaxMarks = evaluatedSubmissions.reduce((sum, s) => sum + s.assignmentMaxMarks, 0);
        averageGrade = ((totalMarks / totalMaxMarks) * 100).toFixed(1) + '%';
    }
    
    // Update DOM
    document.getElementById('totalAssignments').textContent = totalAssignments;
    document.getElementById('totalSubmissions').textContent = totalSubmissions;
    document.getElementById('pendingGrading').textContent = pendingGrading;
    document.getElementById('averageGrade').textContent = averageGrade;
}

// Render recent activity
function renderRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    // Get recent submissions and evaluations
    const recentActivities = [];
    
    allSubmissions.forEach(submission => {
        recentActivities.push({
            type: 'submission',
            submission: submission,
            date: submission.submittedAt,
            message: `${submission.student.fullName} submitted "${submission.assignmentTitle}"`
        });
        
        if (submission.isEvaluated) {
            recentActivities.push({
                type: 'evaluation',
                submission: submission,
                date: submission.evaluatedAt,
                message: `Graded "${submission.assignmentTitle}" for ${submission.student.fullName} - ${submission.marks}/${submission.assignmentMaxMarks}`
            });
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
                <p>${activity.type === 'submission' ? 'New submission' : 'Graded assignment'}</p>
            </div>
            <div class="activity-time">${formatDate(activity.date)}</div>
        </div>
    `).join('');
}

// Render assignments needing attention
function renderNeedsAttention() {
    const container = document.getElementById('needsAttention');
    if (!container) return;
    
    // Get assignments with pending submissions
    const needsAttention = assignments
        .map(assignment => {
            const assignmentSubmissions = allSubmissions.filter(s => s.assignment === assignment._id);
            const pendingCount = assignmentSubmissions.filter(s => !s.isEvaluated).length;
            
            return {
                assignment,
                pendingCount,
                totalSubmissions: assignmentSubmissions.length
            };
        })
        .filter(item => item.pendingCount > 0)
        .sort((a, b) => b.pendingCount - a.pendingCount)
        .slice(0, 5);
    
    if (needsAttention.length === 0) {
        container.innerHTML = '<p style="padding: 1rem; text-align: center; color: #666;">No assignments need attention</p>';
        return;
    }
    
    container.innerHTML = needsAttention.map(item => `
        <div class="attention-item">
            <div class="attention-info">
                <h5>${item.assignment.title}</h5>
                <p>${item.assignment.subject} - ${item.totalSubmissions} submission${item.totalSubmissions !== 1 ? 's' : ''}</p>
            </div>
            <div class="attention-badge">${item.pendingCount} to grade</div>
        </div>
    `).join('');
}

// Open create assignment modal
function openCreateAssignmentModal() {
    const modal = document.getElementById('createAssignmentModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Set minimum date to today
        const dueDateInput = document.getElementById('assignmentDueDate');
        if (dueDateInput) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            dueDateInput.min = now.toISOString().slice(0, 16);
        }
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
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
    
    // Create assignment button
    const createAssignmentBtn = document.getElementById('createAssignmentBtn');
    if (createAssignmentBtn) {
        createAssignmentBtn.addEventListener('click', openCreateAssignmentModal);
    }
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // Create assignment form
    const createAssignmentForm = document.getElementById('createAssignmentForm');
    if (createAssignmentForm) {
        createAssignmentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const rawDueDate = formData.get('dueDate');
            console.log('Raw due date from form:', rawDueDate);
            console.log('All form data:', Object.fromEntries(formData));
            
            const assignmentData = {
                title: formData.get('title'),
                description: formData.get('description'),
                subject: formData.get('subject'),
                dueDate: rawDueDate,
                maxMarks: parseInt(formData.get('maxMarks')),
                instructions: formData.get('instructions') || ''
            };
            
            // Validate required fields on client side
            if (!assignmentData.title || assignmentData.title.length < 3) {
                showError('Title must be at least 3 characters');
                return;
            }
            if (!assignmentData.description || assignmentData.description.trim().length < 5) {
                showError('Description must be at least 5 characters');
                return;
            }
            if (!assignmentData.subject || assignmentData.subject.length < 2) {
                showError('Subject is required');
                return;
            }
            if (!assignmentData.dueDate) {
                showError('Due date is required');
                return;
            }
            if (!assignmentData.maxMarks || assignmentData.maxMarks < 1) {
                showError('Max marks must be a positive number');
                return;
            }
            
            console.log('Creating assignment with data:', assignmentData);
            
            try {
                const response = await fetch(`${API_BASE}/assignments`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(assignmentData)
                });
                
                console.log('Assignment creation response status:', response.status);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Assignment created successfully:', result);
                    showSuccess('Assignment created successfully!');
                    closeModal('createAssignmentModal');
                    this.reset();
                    await loadAssignments();
                } else {
                    const responseText = await response.text();
                    console.error('Raw error response:', responseText);
                    
                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch (e) {
                        console.error('Failed to parse error response:', e);
                        showError(`Server error: ${responseText || 'Unknown error'}`);
                        return;
                    }
                    console.error('Assignment creation failed:', data);
                    if (data.errors && Array.isArray(data.errors)) {
                        const errorMessages = data.errors.map(err => err.msg).join(', ');
                        showError(`Validation errors: ${errorMessages}`);
                    } else {
                        showError(data.message || 'Failed to create assignment');
                    }
                }
            } catch (error) {
                console.error('Error creating assignment:', error);
                showError('Network error creating assignment');
            }
        });
    }
});
