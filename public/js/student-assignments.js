// API Base URL
const API_BASE = '/api';

// Global variables
let currentUser = null;
let assignments = [];
let filteredAssignments = [];
let currentFilter = 'all';

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

// Filter assignments
function filterAssignments(filter) {
    currentFilter = filter;
    
    switch (filter) {
        case 'pending':
            filteredAssignments = assignments.filter(a => !a.submission && !isOverdue(a.dueDate));
            break;
        case 'submitted':
            filteredAssignments = assignments.filter(a => a.submission && !a.submission.isEvaluated);
            break;
        case 'evaluated':
            filteredAssignments = assignments.filter(a => a.submission && a.submission.isEvaluated);
            break;
        case 'overdue':
            filteredAssignments = assignments.filter(a => !a.submission && isOverdue(a.dueDate));
            break;
        default:
            filteredAssignments = [...assignments];
    }
    
    applySearchAndSort();
    renderAssignments();
}

// Apply search and sort
function applySearchAndSort() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const sortBy = document.getElementById('sortSelect').value;
    
    // Apply search
    if (searchTerm) {
        filteredAssignments = filteredAssignments.filter(a => 
            a.title.toLowerCase().includes(searchTerm) ||
            a.subject.toLowerCase().includes(searchTerm) ||
            a.teacher.fullName.toLowerCase().includes(searchTerm) ||
            a.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply sort
    filteredAssignments.sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'subject':
                return a.subject.localeCompare(b.subject);
            case 'teacher':
                return a.teacher.fullName.localeCompare(b.teacher.fullName);
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
        const submission = assignment.submission;
        
        let statusClass = 'status-pending';
        let statusText = 'Not Submitted';
        let actionButtons = '';
        
        if (submission) {
            if (submission.isEvaluated) {
                statusClass = 'status-evaluated';
                statusText = `Evaluated (${submission.marks}/${assignment.maxMarks})`;
            } else {
                statusClass = 'status-submitted';
                statusText = 'Submitted';
            }
        } else if (overdue) {
            statusClass = 'status-overdue';
            statusText = 'Overdue';
        } else {
            actionButtons = `<button class="btn btn-primary" onclick="openSubmissionModal('${assignment._id}')">Submit Assignment</button>`;
        }
        
        return `
            <div class="assignment-card">
                <h4>${assignment.title}</h4>
                <p><strong>Subject:</strong> ${assignment.subject}</p>
                <p><strong>Teacher:</strong> ${assignment.teacher.fullName}</p>
                <p class="assignment-description">${assignment.description}</p>
                <div class="assignment-meta">
                    <span><strong>Due:</strong> ${formatDate(assignment.dueDate)}</span>
                    <span><strong>Max Marks:</strong> ${assignment.maxMarks}</span>
                </div>
                <div class="assignment-status ${statusClass}">${statusText}</div>
                ${submission && submission.isEvaluated ? `
                    <div class="feedback-section">
                        ${submission.feedback ? `<p><strong>Feedback:</strong> ${submission.feedback}</p>` : ''}
                        ${submission.comment ? `<p><strong>Comment:</strong> ${submission.comment}</p>` : ''}
                    </div>
                ` : ''}
                <div class="assignment-actions">
                    <button class="btn btn-secondary" onclick="viewAssignmentDetails('${assignment._id}')">View Details</button>
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');
}

// Open submission modal
function openSubmissionModal(assignmentId) {
    const assignment = assignments.find(a => a._id === assignmentId);
    if (!assignment) return;
    
    const modal = document.getElementById('submissionModal');
    const assignmentIdInput = document.getElementById('assignmentId');
    const assignmentDetails = document.getElementById('assignmentDetails');
    
    if (modal && assignmentIdInput && assignmentDetails) {
        assignmentIdInput.value = assignmentId;
        
        assignmentDetails.innerHTML = `
            <h4>${assignment.title}</h4>
            <p><strong>Subject:</strong> ${assignment.subject}</p>
            <p><strong>Teacher:</strong> ${assignment.teacher.fullName}</p>
            <p><strong>Due Date:</strong> ${formatDate(assignment.dueDate)}</p>
            <p><strong>Max Marks:</strong> ${assignment.maxMarks}</p>
            ${assignment.instructions ? `<p><strong>Instructions:</strong> ${assignment.instructions}</p>` : ''}
        `;
        
        modal.style.display = 'flex';
    }
}

// View assignment details
function viewAssignmentDetails(assignmentId) {
    const assignment = assignments.find(a => a._id === assignmentId);
    if (!assignment) return;
    
    const modal = document.getElementById('detailsModal');
    const detailsContent = document.getElementById('assignmentFullDetails');
    
    if (modal && detailsContent) {
        const submission = assignment.submission;
        
        detailsContent.innerHTML = `
            <h3>${assignment.title}</h3>
            <div class="assignment-details-modal">
                <p><strong>Subject:</strong> ${assignment.subject}</p>
                <p><strong>Teacher:</strong> ${assignment.teacher.fullName}</p>
                <p><strong>Due Date:</strong> ${formatDate(assignment.dueDate)}</p>
                <p><strong>Max Marks:</strong> ${assignment.maxMarks}</p>
                <p><strong>Created:</strong> ${formatDate(assignment.createdAt)}</p>
            </div>
            
            <h4>Description</h4>
            <p>${assignment.description}</p>
            
            ${assignment.instructions ? `
                <h4>Instructions</h4>
                <p>${assignment.instructions}</p>
            ` : ''}
            
            ${submission ? `
                <h4>Your Submission</h4>
                <div class="submission-details">
                    <p><strong>File:</strong> ${submission.fileName}</p>
                    <p><strong>Submitted:</strong> ${formatDate(submission.submittedAt)}</p>
                    ${submission.isEvaluated ? `
                        <p><strong>Grade:</strong> ${submission.marks}/${assignment.maxMarks} (${((submission.marks/assignment.maxMarks)*100).toFixed(1)}%)</p>
                        ${submission.feedback ? `<p><strong>Feedback:</strong> ${submission.feedback}</p>` : ''}
                        ${submission.comment ? `<p><strong>Comment:</strong> ${submission.comment}</p>` : ''}
                        <p><strong>Evaluated:</strong> ${formatDate(submission.evaluatedAt)}</p>
                    ` : '<p><strong>Status:</strong> Awaiting evaluation</p>'}
                </div>
            ` : '<p><em>No submission yet</em></p>'}
        `;
        
        modal.style.display = 'flex';
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
    
    // Filter tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterAssignments(this.dataset.filter);
        });
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filteredAssignments = assignments.filter(a => {
                switch (currentFilter) {
                    case 'pending':
                        return !a.submission && !isOverdue(a.dueDate);
                    case 'submitted':
                        return a.submission && !a.submission.isEvaluated;
                    case 'evaluated':
                        return a.submission && a.submission.isEvaluated;
                    case 'overdue':
                        return !a.submission && isOverdue(a.dueDate);
                    default:
                        return true;
                }
            });
            applySearchAndSort();
            renderAssignments();
        });
    }
    
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            applySearchAndSort();
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
    
    // Submission form
    const submissionForm = document.getElementById('submissionForm');
    if (submissionForm) {
        submissionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const assignmentId = formData.get('assignmentId');
            
            try {
                console.log('Submitting assignment:', assignmentId);
                console.log('FormData contents:', formData.get('file'));
                
                const response = await fetch(`${API_BASE}/assignments/${assignmentId}/submit`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                        // Don't set Content-Type for FormData - browser will set it automatically with boundary
                    },
                    body: formData
                });
                
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Success response:', data);
                    showSuccess('Assignment submitted successfully!');
                    closeModal('submissionModal');
                    this.reset();
                    await loadAssignments();
                } else {
                    const data = await response.json();
                    console.error('Server error response:', data);
                    showError(data.message || 'Failed to submit assignment');
                }
            } catch (error) {
                console.error('Network error details:', error);
                console.error('Error type:', error.name);
                console.error('Error message:', error.message);
                showError('Network error submitting assignment');
            }
        });
    }
});
