# Real-time Chat Application

A modern real-time chat application built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- **Real-time messaging** using Socket.IO
- **User authentication** (register, login, JWT-based)
- **Message history** (stored in MongoDB)
- **Online user tracking**
- **Typing indicators**
- **Support for text, emoji, images, and file attachments**
- **Send and preview images/files** in chat
- **Image preview before sending** (see a thumbnail before uploading)
- **Automatic image resize & compression** before upload (save bandwidth)
- **Send files with original name (including Vietnamese characters)**
- **Download files with correct original name**
- **Modern file/image upload menu** (choose image or file, beautiful UI)
- **Beautiful file message UI** (icon, file name, download button)
- **Dark mode** (toggle theme)
- **Emoji picker**
- **Notification sounds** for new messages
- **Toast notifications** for system events
- **Responsive design** (mobile & desktop)
- **View account info** (click avatar to see username/email)
- **Logout** from account
- **.gitignore** to keep uploads, node_modules, .env out of git
- **Delete (hide) your own messages**: You can delete (hide) any message you sent, and it will disappear from your chat view but remain visible to others.
- **Voice message (Record and send voice messages):** Record directly in the browser, send the recording file to the server, everyone can listen to the voice message even when reloading the page or logging in from another device.
- **Password Reset System**: Complete forgot password flow with OTP verification via email
- **AI Chatbot Integration**: Chat with Google Gemini AI directly in the app
- **Advanced Emoji Picker**: 8 categories with 300+ emojis, recent tracking, modern UI
- **Profile Management**: View and edit user profiles with avatar support

### Private Chat Features

- **Private Messaging**: One-on-one private conversations between users
- **Real-time Private Chat**: Instant messaging with Socket.IO
- **Online/Offline Status**: See who's online/offline in private chat
- **Message History**: Load previous private conversations
- **Private File Sharing**: Send images, files, and voice messages in private chat
- **Offline Message Delivery**: Messages sent to offline users are delivered when they come online
- **Private Message Management**: Edit and delete your own private messages
- **Recent Contacts**: See users you've recently chatted with (both online and offline)
- **Private Chat UI**: Modern chat interface with message bubbles, timestamps, and status indicators
- **Message Actions**: Hover to reveal edit/delete options on your messages
- **Edit Confirmation**: Messages show "(đã sửa)" indicator when edited
- **Double-click to Edit**: Quick edit by double-clicking text messages

### Admin Features

- **Admin Dashboard** - Comprehensive admin panel at `/admin`
- **User Management**:
  - View all registered users
  - Lock/unlock user accounts
  - Delete users and their messages
  - See user details (email, join date, online status)
- **Message Management**:
  - View all messages in the system
  - Delete inappropriate messages
  - Filter messages with bad word detection
- **Bad Word Filter**:
  - Add/remove forbidden words
  - Auto-filter messages containing bad words
  - Manage word blacklist
- **Statistics Dashboard**:
  - Total users and messages count
  - Active users count
  - Voice messages statistics
  - Last 24 hours activity (new users, messages)
- **Audit Log**:
  - Track all admin actions
  - View who performed what action and when
  - Keep accountability of admin operations

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/chat-app
   JWT_SECRET=your_jwt_secret_key_here
   GMAIL_USER=youremail@gmail.com           # Your Gmail address used for sending OTP/reset emails
   GMAIL_APP_PASSWORD=your_app_password_here # App Password from Google Account
   FRONTEND_URL=http://localhost:5000        # Base URL for front-end pages (forgot-password, verify-otp, reset-password)
   GEMINI_API_KEY=your_gemini_api_key_here       # Your Google Generative Language API key for AI chatbot
   # No endpoint override needed; uses Gemini default endpoint
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── server.js          # Main server file
├── models/           # MongoDB models
│   ├── User.js      # User model
│   ├── Message.js   # Message model
│   ├── PrivateMessage.js # Private message model
│   ├── BadWord.js   # Bad word filter model
│   └── AuditLog.js  # Admin audit log model
├── routes/          # API routes
│   ├── auth.js      # Authentication & password reset
│   ├── messages.js  # Public chat messages
│   ├── private-messages.js # Private chat messages
│   ├── upload.js    # File/image uploads
│   ├── user.js      # User management
│   ├── admin.js     # Admin panel APIs
│   └── chatgpt.js   # AI chatbot integration
├── middleware/      # Custom middleware
│   ├── auth.js      # JWT authentication
│   └── upload.js    # File upload handling
├── utils/           # Utility functions
│   └── mailer.js    # Email service for OTP
├── public/          # Static files (frontend)
│   ├── css/
│   ├── js/
│   ├── admin/       # Admin panel UI
│   ├── sounds/      # Notification sounds
│   ├── uploads/     # Uploaded files/images (gitignored)
│   ├── index.html   # Main chat interface
│   ├── private-chat.html # Private chat interface
│   ├── chat.html    # AI chatbot interface
│   ├── profile.html # User profile page
│   ├── forgot-password.html
│   ├── verify-otp.html
│   └── reset-password.html
└── .gitignore       # Ignore uploads, node_modules, .env
```

## API Endpoints

### User Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/forgot-password` - Send OTP code to email for password reset
- `POST /api/auth/verify-otp` - Verify OTP code before resetting password
- `POST /api/auth/reset-password` - Reset password using OTP code
- `GET /api/messages` - Get message history
- `POST /api/messages` - Send a new message
- `POST /api/upload` - Upload image/file (authenticated)
- `POST /api/users/search` - Search user by username
- `GET /api/private-messages/conversation/:userId` - Get private conversation history
- `GET /api/private-messages/recent-contacts` - Get recent chat contacts
- `PUT /api/private-messages/read/:conversationId` - Mark messages as read
- `POST /api/chat` - Chat with AI chatbot (Google Gemini)

### Admin Endpoints (requires admin role)
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:userId/toggle-status` - Lock/unlock user
- `DELETE /api/admin/users/:userId` - Delete user
- `GET /api/admin/messages` - Get all messages
- `DELETE /api/admin/messages/:messageId` - Delete message
- `GET /api/admin/statistics` - Get system statistics
- `GET /api/admin/badwords` - Get bad words list
- `POST /api/admin/badwords` - Add bad word
- `DELETE /api/admin/badwords/:id` - Remove bad word
- `GET /api/admin/audit-logs` - Get audit logs

## Socket.IO Events

### Public Chat Events
- `user:join` - User joins the chat
- `message:send` - Send a new message (text, emoji, image, file)
- `message:new` - Receive a new message
- `message:edit` - Edit an existing message
- `message:edited` - Broadcast edited message
- `user:typing` - User typing status
- `user:online-list` - Get list of online users
- `user:joined` - User joined notification
- `user:left` - User leaves the chat

### Private Chat Events
- `private:message` - Send private message
- `private:message:sent` - Private message sent confirmation
- `private:message:received` - Receive private message
- `private:message:edit` - Edit private message
- `private:message:edited` - Private message edited broadcast
- `private:message:delete` - Delete private message
- `private:message:deleted` - Private message deleted broadcast

## Pages & Interfaces

- **Main Chat** (`/`) - Public group chat room
- **Private Chat** (`/private-chat.html`) - One-on-one private messaging
- **AI Chatbot** (`/chat.html`) - Chat with Google Gemini AI
- **User Profile** (`/profile.html`) - View and edit user profile
- **Admin Panel** (`/admin/`) - Comprehensive admin dashboard
- **Authentication**:
  - Login/Register (integrated in main page)
  - Forgot Password (`/forgot-password.html`)
  - Verify OTP (`/verify-otp.html`)
  - Reset Password (`/reset-password.html`)

## File Upload Support

The application supports uploading various file types:
- **Images**: JPG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX, XLS, XLSX
- **Audio**: MP3, WAV, WebM (voice messages)
- **Video**: MP4, WebM
- **Archives**: ZIP, RAR
- **Text files**: TXT, CSV

## Contributing

Feel free to submit issues and enhancement requests. 