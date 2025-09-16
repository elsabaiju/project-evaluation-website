// API Base URL
const API_BASE = '/api';

// Global variables
let currentUser = null;
let assignments = [];
let submissions = [];

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
    
    // Auto hide after 5 seconds
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
    
    // Auto hide after 3 seconds
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

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        window.location.href = '/login.html';
        return false;
    }
    
    currentUser = JSON.parse(userStr);
    return true;
}

// Initialize dashboard
async function initDashboard() {
    if (!checkAuth()) return;
    
    // Update user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.textContent = `Welcome, ${currentUser.fullName} (${currentUser.role})`;
    }
    
    // Show appropriate dashboard
    const studentDashboard = document.getElementById('studentDashboard');
    const teacherDashboard = document.getElementById('teacherDashboard');
    const loadingMessage = document.getElementById('loadingMessage');
    
    // Check user role and redirect to new interfaces
    if (currentUser.role === 'student') {
        window.location.href = '/student-dashboard';
        return;
    } else if (currentUser.role === 'teacher') {
        window.location.href = '/teacher-dashboard';
        return;
    }
    
    // Continue with original dashboard logic (fallback)
    if (teacherDashboard) teacherDashboard.style.display = 'block';
    if (studentDashboard) studentDashboard.style.display = 'none';
    await loadTeacherAssignments();
    
    if (loadingMessage) loadingMessage.style.display = 'none';
}

// Load assignments for students
async function loadStudentAssignments() {
    try {
        const response = await fetch(`${API_BASE}/assignments`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            assignments = data.assignments;
            renderStudentAssignments();
        } else {
            showError('Failed to load assignments');
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        showError('Network error loading assignments');
    }
}

// Render student assignments
function renderStudentAssignments() {
    const container = document.getElementById('studentAssignments');
    if (!container) return;
    
    if (assignments.length === 0) {
        container.innerHTML = '<p>No assignments available.</p>';
        return;
    }
    
    container.innerHTML = assignments.map(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const overdue = isOverdue(assignment.dueDate);
        const submission = assignment.submission;
        
        let statusClass = 'status-pending';
        let statusText = 'Not Submitted';
        let actionButton = '';
        
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
            actionButton = `<button class="btn btn-primary" onclick="openSubmissionModal('${assignment._id}')">Submit Assignment</button>`;
        }
        
        return `
            <div class="assignment-card">
                <h4>${assignment.title}</h4>
                <p><strong>Subject:</strong> ${assignment.subject}</p>
                <p><strong>Teacher:</strong> ${assignment.teacher.fullName}</p>
                <p><strong>Description:</strong> ${assignment.description}</p>
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
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

// Load assignments for teachers
async function loadTeacherAssignments() {
    try {
        const response = await fetch(`${API_BASE}/assignments`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            assignments = data.assignments;
            renderTeacherAssignments();
        } else {
            showError('Failed to load assignments');
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        showError('Network error loading assignments');
    }
}

// Render teacher assignments
function renderTeacherAssignments() {
    const container = document.getElementById('teacherAssignments');
    if (!container) return;
    
    if (assignments.length === 0) {
        container.innerHTML = '<p>No assignments created yet. <button class="btn btn-primary" onclick="openCreateAssignmentModal()">Create your first assignment</button></p>';
        return;
    }
    
    container.innerHTML = assignments.map(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const overdue = isOverdue(assignment.dueDate);
        
        return `
            <div class="assignment-card">
                <h4>${assignment.title}</h4>
                <p><strong>Subject:</strong> ${assignment.subject}</p>
                <p><strong>Description:</strong> ${assignment.description}</p>
                <div class="assignment-meta">
                    <span><strong>Due:</strong> ${formatDate(assignment.dueDate)}</span>
                    <span><strong>Max Marks:</strong> ${assignment.maxMarks}</span>
                </div>
                <div class="assignment-status ${overdue ? 'status-overdue' : 'status-pending'}">
                    ${overdue ? 'Overdue' : 'Active'}
                </div>
                <div class="assignment-actions">
                    <button class="btn btn-primary" onclick="viewSubmissions('${assignment._id}')">View Submissions</button>
                </div>
            </div>
        `;
    }).join('');
}

// Modal functions
function openSubmissionModal(assignmentId) {
    const modal = document.getElementById('submissionModal');
    const assignmentIdInput = document.getElementById('assignmentId');
    
    if (modal && assignmentIdInput) {
        assignmentIdInput.value = assignmentId;
        modal.style.display = 'flex';
    }
}

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

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// View submissions for an assignment
async function viewSubmissions(assignmentId) {
    try {
        const response = await fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            submissions = data.submissions;
            renderSubmissions(assignmentId);
            
            const modal = document.getElementById('submissionsModal');
            if (modal) modal.style.display = 'flex';
        } else {
            showError('Failed to load submissions');
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        showError('Network error loading submissions');
    }
}

// Render submissions list
function renderSubmissions(assignmentId) {
    const container = document.getElementById('submissionsList');
    if (!container) return;
    
    const assignment = assignments.find(a => a._id === assignmentId);
    
    if (submissions.length === 0) {
        container.innerHTML = '<p>No submissions yet.</p>';
        return;
    }
    
    container.innerHTML = submissions.map(submission => {
        return `
            <div class="submission-item">
                <div class="submission-header">
                    <h5>${submission.student.fullName}</h5>
                    <span class="assignment-status ${submission.isEvaluated ? 'status-evaluated' : 'status-submitted'}">
                        ${submission.isEvaluated ? 'Evaluated' : 'Pending'}
                    </span>
                </div>
                <div class="submission-info">
                    <p><strong>Student ID:</strong> ${submission.student.studentId || 'N/A'}</p>
                    <p><strong>File:</strong> ${submission.fileName}</p>
                    <p><strong>Submitted:</strong> ${formatDate(submission.submittedAt)}</p>
                    ${submission.isEvaluated ? `<p><strong>Marks:</strong> ${submission.marks}/${assignment.maxMarks}</p>` : ''}
                </div>
                ${submission.isEvaluated ? `
                    <div class="feedback-section">
                        ${submission.feedback ? `<p><strong>Feedback:</strong> ${submission.feedback}</p>` : ''}
                        ${submission.comment ? `<p><strong>Comment:</strong> ${submission.comment}</p>` : ''}
                    </div>
                ` : ''}
                <div class="assignment-actions">
                    <button class="btn btn-primary" onclick="openEvaluationModal('${submission._id}', ${assignment.maxMarks})">
                        ${submission.isEvaluated ? 'Re-evaluate' : 'Evaluate'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Open evaluation modal
function openEvaluationModal(submissionId, maxMarks) {
    const modal = document.getElementById('evaluationModal');
    const submissionIdInput = document.getElementById('evaluationSubmissionId');
    const maxMarksDisplay = document.getElementById('maxMarksDisplay');
    const marksInput = document.getElementById('marks');
    
    if (modal && submissionIdInput && maxMarksDisplay && marksInput) {
        submissionIdInput.value = submissionId;
        maxMarksDisplay.textContent = `(Max: ${maxMarks})`;
        marksInput.max = maxMarks;
        
        // Pre-fill if already evaluated
        const submission = submissions.find(s => s._id === submissionId);
        if (submission && submission.isEvaluated) {
            marksInput.value = submission.marks;
            document.getElementById('feedback').value = submission.feedback || '';
            document.getElementById('comment').value = submission.comment || '';
        }
        
        modal.style.display = 'flex';
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
                    await loadTeacherAssignments();
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
    
    // Submission form
    const submissionForm = document.getElementById('submissionForm');
    if (submissionForm) {
        submissionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const assignmentId = formData.get('assignmentId');
            
            try {
                const response = await fetch(`${API_BASE}/assignments/${assignmentId}/submit`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });
                
                if (response.ok) {
                    showSuccess('Assignment submitted successfully!');
                    closeModal('submissionModal');
                    this.reset();
                    await loadStudentAssignments();
                } else {
                    const data = await response.json();
                    showError(data.message || 'Failed to submit assignment');
                }
            } catch (error) {
                console.error('Error submitting assignment:', error);
                showError('Network error submitting assignment');
            }
        });
    }
    
    // Evaluation form
    const evaluationForm = document.getElementById('evaluationForm');
    if (evaluationForm) {
        evaluationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submissionId = formData.get('submissionId');
            const evaluationData = {
                marks: parseInt(formData.get('marks')),
                feedback: formData.get('feedback'),
                comment: formData.get('comment')
            };
            
            try {
                const response = await fetch(`${API_BASE}/assignments/submissions/${submissionId}/evaluate`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(evaluationData)
                });
                
                if (response.ok) {
                    showSuccess('Submission evaluated successfully!');
                    closeModal('evaluationModal');
                    this.reset();
                    
                    // Refresh submissions view
                    const assignment = assignments.find(a => 
                        submissions.some(s => s._id === submissionId && s.assignment === a._id)
                    );
                    if (assignment) {
                        await viewSubmissions(assignment._id);
                    }
                } else {
                    const data = await response.json();
                    showError(data.message || 'Failed to evaluate submission');
                }
            } catch (error) {
                console.error('Error evaluating submission:', error);
                showError('Network error evaluating submission');
            }
        });
    }
});
