# Project Evaluation Website

A comprehensive web application for students and teachers to manage assignment submissions and evaluations.

## Features

### For Students
- View upcoming assignments with due dates
- Submit assignments with file uploads
- Track grades and feedback from teachers
- View teacher comments on evaluated assignments

### For Teachers
- Create and manage assignments
- Review student submissions
- Assign grades with detailed feedback
- Track student progress across assignments

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer middleware

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-evaluation-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update the following variables in `.env`:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/project_evaluation
     JWT_SECRET=your_secure_jwt_secret_key_here
     PORT=3000
     NODE_ENV=development
     ```

4. **MongoDB Atlas Setup**
   - Create a MongoDB Atlas account at https://www.mongodb.com/atlas
   - Create a new cluster
   - Create a database user with read/write permissions
   - Get your connection string and update `MONGODB_URI` in `.env`
   - Whitelist your IP address in Network Access

5. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### Getting Started

1. **Registration**
   - Visit the homepage and click "Register"
   - Fill in your details and select your role (Student or Teacher)
   - Students must provide a Student ID
   - After registration, you'll be automatically logged in

2. **Login**
   - Use your username/email and password to log in
   - The system automatically detects your role and shows the appropriate dashboard

### Student Workflow

1. **View Assignments**
   - See all available assignments on your dashboard
   - Check due dates, subjects, and teacher information
   - View assignment descriptions and instructions

2. **Submit Assignments**
   - Click "Submit Assignment" on any pending assignment
   - Upload your file (supports PDF, DOC, DOCX, TXT, ZIP, RAR, images)
   - Maximum file size: 10MB

3. **Check Results**
   - View your grades once teachers evaluate your submissions
   - Read detailed feedback and comments from teachers

### Teacher Workflow

1. **Create Assignments**
   - Click "Create New Assignment" on your dashboard
   - Fill in assignment details, due date, and maximum marks
   - Add instructions for students

2. **Review Submissions**
   - Click "View Submissions" on any assignment
   - See all student submissions with their details
   - Download submitted files for review

3. **Evaluate Submissions**
   - Click "Evaluate" on any submission
   - Assign marks (cannot exceed maximum marks)
   - Provide detailed feedback and comments
   - Students can immediately see their results

## File Structure

```
project-evaluation-website/
├── models/
│   ├── User.js          # User schema (students & teachers)
│   ├── Assignment.js    # Assignment schema
│   └── Submission.js    # Submission schema
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── assignments.js   # Assignment management routes
│   └── users.js         # User management routes
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── public/
│   ├── css/
│   │   └── style.css    # Main stylesheet
│   ├── js/
│   │   ├── auth.js      # Authentication JavaScript
│   │   └── dashboard.js # Dashboard functionality
│   ├── index.html       # Homepage
│   ├── login.html       # Login page
│   ├── register.html    # Registration page
│   └── dashboard.html   # Main dashboard
├── uploads/             # File upload directory
├── server.js            # Main server file
├── package.json         # Dependencies and scripts
└── .env.example         # Environment variables template
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Assignments
- `GET /api/assignments` - Get all assignments
- `POST /api/assignments` - Create new assignment (teachers only)
- `GET /api/assignments/:id` - Get specific assignment
- `POST /api/assignments/:id/submit` - Submit assignment (students only)
- `GET /api/assignments/:id/submissions` - Get submissions (teachers only)
- `PUT /api/assignments/submissions/:id/evaluate` - Evaluate submission (teachers only)

### Users
- `GET /api/users/students` - Get all students (teachers only)
- `GET /api/users/teachers` - Get all teachers
- `PUT /api/users/profile` - Update user profile

## Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Input validation and sanitization
- File upload restrictions
- CORS protection

## Deployment

### For GitHub Pages (Frontend Only)
Note: GitHub Pages only supports static files. For full functionality, deploy to a platform that supports Node.js.

### Recommended Deployment Platforms
- **Heroku**: Easy deployment with MongoDB Atlas
- **Vercel**: Great for Node.js applications
- **Railway**: Simple deployment with database support
- **DigitalOcean App Platform**: Full-stack deployment

### Environment Variables for Production
```
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
NODE_ENV=production
PORT=3000
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check your MongoDB Atlas connection string
   - Ensure your IP is whitelisted
   - Verify database user credentials

2. **File Upload Issues**
   - Check file size (max 10MB)
   - Ensure file type is supported
   - Verify uploads directory permissions

3. **Authentication Problems**
   - Clear browser localStorage
   - Check JWT_SECRET in environment variables
   - Verify token expiration (7 days default)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the repository or contact the development team.
