// API Base URL
const API_BASE = '/api';

// Global variables
let currentUser = null;
let assignments = [];
let filteredAssignments = [];

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
    
    if (currentUser.role !== 'teacher') {
        window.location.href = '/student-dashboard';
        return false;
    }
    
    return true;
}

// Initialize page
async function initPage() {
    if (!checkAuth()) return;
    
    // Update user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.textContent = `Welcome, ${currentUser.fullName}`;
    }
    
    await loadAssignments();
    
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.style.display = 'none';
}

// Load assignments
async function loadAssignments() {
    try {
        const response = await fetch(`${API_BASE}/assignments`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            assignments = data.assignments;
            
            // Load submission counts for each assignment
            await loadSubmissionCounts();
            
            filteredAssignments = [...assignments];
            renderAssignments();
        } else {
            showError('Failed to load assignments');
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        showError('Network error loading assignments');
    }
}

// Load submission counts
async function loadSubmissionCounts() {
    for (const assignment of assignments) {
        try {
            const response = await fetch(`${API_BASE}/assignments/${assignment._id}/submissions`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                assignment.submissions = data.submissions;
                assignment.submissionCount = data.submissions.length;
                assignment.gradedCount = data.submissions.filter(s => s.isEvaluated).length;
                assignment.pendingCount = data.submissions.filter(s => !s.isEvaluated).length;
            }
        } catch (error) {
            console.error('Error loading submissions for assignment:', assignment._id);
            assignment.submissionCount = 0;
            assignment.gradedCount = 0;
            assignment.pendingCount = 0;
        }
    }
}

// Apply filters and sorting
function applyFiltersAndSort() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortSelect').value;
    
    // Start with all assignments
    filteredAssignments = [...assignments];
    
    // Apply search filter
    if (searchTerm) {
        filteredAssignments = filteredAssignments.filter(a => 
            a.title.toLowerCase().includes(searchTerm) ||
            a.subject.toLowerCase().includes(searchTerm) ||
            a.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply status filter
    if (statusFilter) {
        filteredAssignments = filteredAssignments.filter(a => {
            switch (statusFilter) {
                case 'active':
                    return a.isActive && !isOverdue(a.dueDate);
                case 'overdue':
                    return isOverdue(a.dueDate);
                case 'completed':
                    return a.submissionCount > 0 && a.pendingCount === 0;
                default:
                    return true;
            }
        });
    }
    
    // Apply sorting
    filteredAssignments.sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'subject':
                return a.subject.localeCompare(b.subject);
            case 'createdAt':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'dueDate':
            default:
                return new Date(a.dueDate) - new Date(b.dueDate);
        }
    });
}

// Render assignments
function renderAssignments() {
    const container = document.getElementById('assignmentsContainer');
    if (!container) return;
    
    if (filteredAssignments.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No assignments found.</p>';
        return;
    }
    
    container.innerHTML = filteredAssignments.map(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const overdue = isOverdue(assignment.dueDate);
        const submissionCount = assignment.submissionCount || 0;
        const gradedCount = assignment.gradedCount || 0;
        const pendingCount = assignment.pendingCount || 0;
        
        let statusClass = 'status-pending';
        let statusText = 'Active';
        
        if (overdue) {
            statusClass = 'status-overdue';
            statusText = 'Overdue';
        } else if (submissionCount > 0 && pendingCount === 0) {
            statusClass = 'status-evaluated';
            statusText = 'Completed';
        } else if (pendingCount > 0) {
            statusClass = 'status-submitted';
            statusText = `${pendingCount} to grade`;
        }
        
        return `
            <div class="assignment-card">
                <h4>${assignment.title}</h4>
                <p><strong>Subject:</strong> ${assignment.subject}</p>
                <p class="assignment-description">${assignment.description}</p>
                <div class="assignment-meta">
                    <span><strong>Due:</strong> ${formatDate(assignment.dueDate)}</span>
                    <span><strong>Max Marks:</strong> ${assignment.maxMarks}</span>
                </div>
                <div class="assignment-meta">
                    <span><strong>Submissions:</strong> ${submissionCount}</span>
                    <span><strong>Graded:</strong> ${gradedCount}</span>
                </div>
                <div class="assignment-status ${statusClass}">${statusText}</div>
                <div class="assignment-actions">
                    <button class="btn btn-secondary" onclick="viewAssignmentDetails('${assignment._id}')">View Details</button>
                    <button class="btn btn-primary" onclick="viewSubmissions('${assignment._id}')">View Submissions (${submissionCount})</button>
                </div>
            </div>
        `;
    }).join('');
}

// View assignment details
function viewAssignmentDetails(assignmentId) {
    const assignment = assignments.find(a => a._id === assignmentId);
    if (!assignment) return;
    
    const modal = document.getElementById('assignmentDetailsModal');
    const detailsContent = document.getElementById('assignmentDetailsContent');
    
    if (modal && detailsContent) {
        const submissionCount = assignment.submissionCount || 0;
        const gradedCount = assignment.gradedCount || 0;
        const pendingCount = assignment.pendingCount || 0;
        
        detailsContent.innerHTML = `
            <h3>${assignment.title}</h3>
            <div class="assignment-details-modal">
                <p><strong>Subject:</strong> ${assignment.subject}</p>
                <p><strong>Due Date:</strong> ${formatDate(assignment.dueDate)}</p>
                <p><strong>Max Marks:</strong> ${assignment.maxMarks}</p>
                <p><strong>Created:</strong> ${formatDate(assignment.createdAt)}</p>
                <p><strong>Status:</strong> ${assignment.isActive ? 'Active' : 'Inactive'}</p>
            </div>
            
            <h4>Description</h4>
            <p>${assignment.description}</p>
            
            ${assignment.instructions ? `
                <h4>Instructions</h4>
                <p>${assignment.instructions}</p>
            ` : ''}
            
            <h4>Submission Statistics</h4>
            <div class="submission-stats">
                <p><strong>Total Submissions:</strong> ${submissionCount}</p>
                <p><strong>Graded:</strong> ${gradedCount}</p>
                <p><strong>Pending Grading:</strong> ${pendingCount}</p>
                ${gradedCount > 0 ? `<p><strong>Completion Rate:</strong> ${((gradedCount / submissionCount) * 100).toFixed(1)}%</p>` : ''}
            </div>
            
            <div class="assignment-actions" style="margin-top: 1.5rem;">
                <button class="btn btn-primary" onclick="viewSubmissions('${assignment._id}'); closeModal('assignmentDetailsModal');">View Submissions</button>
                <button class="btn btn-secondary" onclick="closeModal('assignmentDetailsModal')">Close</button>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
}

// View submissions (redirect to grading page)
function viewSubmissions(assignmentId) {
    window.location.href = `/teacher-grading.html?assignment=${assignmentId}`;
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
    initPage();
    
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
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFiltersAndSort();
            renderAssignments();
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            applyFiltersAndSort();
            renderAssignments();
        });
    }
    
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            applyFiltersAndSort();
            renderAssignments();
        });
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
            const assignmentData = {
                title: formData.get('title'),
                description: formData.get('description'),
                subject: formData.get('subject'),
                dueDate: formData.get('dueDate'),
                maxMarks: parseInt(formData.get('maxMarks')),
                instructions: formData.get('instructions')
            };
            
            try {
                const response = await fetch(`${API_BASE}/assignments`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(assignmentData)
                });
                
                if (response.ok) {
                    showSuccess('Assignment created successfully!');
                    closeModal('createAssignmentModal');
                    this.reset();
                    await loadAssignments();
                } else {
                    const data = await response.json();
                    showError(data.message || 'Failed to create assignment');
                }
            } catch (error) {
                console.error('Error creating assignment:', error);
                showError('Network error creating assignment');
            }
        });
    }
});
