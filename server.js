require('dotenv').config();
// Verify that the Gemini API key is loaded from environment
if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not set in environment variables!');
} else {
    console.log('GEMINI_API_KEY loaded successfully.');
}
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const chatgptRoutes = require('./routes/chatgpt');
const privateMessageRoutes = require('./routes/private-messages');
const User = require('./models/User');
const Message = require('./models/Message');
const BadWord = require('./models/BadWord');
const PrivateMessage = require('./models/PrivateMessage');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
console.log('Serving uploads from:', path.join(__dirname, 'public/uploads'));
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')))


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatgptRoutes);
app.use('/api/private-messages', privateMessageRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Quản lý user online duy nhất
const onlineUsers = new Set();
const userSockets = {};

// Function to filter forbidden words in real-time
async function filterBadWords(text) {
    const badwords = await BadWord.find();
    let filtered = text;
    badwords.forEach(bw => {
        const regex = new RegExp(bw.word, 'gi');
        filtered = filtered.replace(regex, '*'.repeat(bw.word.length));
    });
    return filtered;
}

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle user joining
    socket.on('user:join', async (username) => {
        socket.username = username;
        // Quản lý socket theo user
        if (!userSockets[username]) userSockets[username] = new Set();
        userSockets[username].add(socket.id);
        onlineUsers.add(username);

        // Update user status in database
        try {
            await User.findOneAndUpdate({ username }, { isOnline: true });
        } catch (e) { }

        // Emit danh sách user online duy nhất
        io.emit('user:online-list', Array.from(onlineUsers));
        io.emit('user:joined', {
            username: username,
            id: socket.id,
            timestamp: new Date()
        });

        // Send pending messages to user who just came online
        await sendPendingMessages(username);
    });

    // Handle new messages
    socket.on('message:send', async (message) => {
        console.log('[SOCKET] Nhận message:send', message);
        const msgData = {
            username: socket.username,
            content: message.content || message,
            type: message.type || 'text',
            timestamp: new Date()
        };
        if (message.type === 'file' && message.fileName) {
            msgData.fileName = message.fileName;
        }
        try {
            const user = await User.findOne({ username: socket.username });
            if (user) {
                const newMsg = new Message({
                    sender: user._id,
                    content: msgData.content,
                    type: msgData.type,
                    room: message.room || 'general'
                });
                // Lưu fileName nếu là file
                if (msgData.type === 'file' && msgData.fileName) {
                    newMsg.fileName = msgData.fileName;
                }
                await newMsg.save();
                // console.log('[SOCKET] Đã lưu message vào MongoDB:', newMsg);
                const populatedMsg = await Message.findById(newMsg._id).populate('sender', 'username').lean();
                const msgToSend = {
                    _id: populatedMsg._id,
                    username: socket.username,
                    content: populatedMsg.content,
                    type: populatedMsg.type,
                    fileName: msgData.fileName || populatedMsg.fileName,
                    edited: populatedMsg.edited,
                    timestamp: populatedMsg.createdAt
                };
                // Censor forbidden words before emitting
                msgToSend.content = await filterBadWords(msgToSend.content);
                socket.emit('message:new', msgToSend);
                socket.broadcast.emit('message:new', msgToSend);
                return;
            }
        } catch (err) {
            // console.error('[SOCKET] Lỗi khi lưu tin nhắn:', err);
        }
    });

    // Handle message edit
    socket.on('message:edit', async (data) => {
        try {
            const user = await User.findOne({ username: socket.username });
            if (!user) return;

            const message = await Message.findById(data.messageId);
            if (!message || String(message.sender) !== String(user._id)) return;

            message.content = data.newContent;
            message.edited = true;
            message.editedAt = new Date();
            await message.save();

            const updatedMsgData = {
                id: message._id,
                username: socket.username,
                content: message.content,
                type: message.type,
                edited: true,
                editedAt: message.editedAt,
                timestamp: message.createdAt
            };

            // Broadcast edited message to all clients
            io.emit('message:edited', updatedMsgData);
        } catch (err) {
            console.error('Lỗi khi chỉnh sửa tin nhắn:', err);
        }
    });

    // Handle typing status
    socket.on('user:typing', (isTyping) => {
        socket.broadcast.emit('user:typing', {
            username: socket.username,
            isTyping: isTyping
        });
    });

    // Handle private messages
    socket.on('private:message', async (data) => {
        const { to, from, content, timestamp } = data;

        // Validate required fields
        if (!to || !from || !content) {
            console.error('Missing required fields:', { to, from, content });
            return;
        }

        try {
            // Find users in database
            const fromUser = await User.findOne({ username: from });
            const toUser = await User.findOne({ username: to });

            if (fromUser && toUser) {
                // Create conversation ID (always same order)
                const conversationId = [fromUser._id.toString(), toUser._id.toString()].sort().join('_');

                // Save message to database
                const privateMessage = new PrivateMessage({
                    from: fromUser._id,
                    to: toUser._id,
                    content: content,
                    type: data.type || 'text',
                    fileName: data.fileName,
                    conversationId: conversationId
                });

                await privateMessage.save();

                // Create message data with database info
                const messageData = {
                    _id: privateMessage._id,
                    from,
                    to,
                    content,
                    type: data.type || 'text',
                    fileName: data.fileName,
                    timestamp: privateMessage.createdAt,
                    isRead: false
                };

                // Send to recipient if online (không gửi lại cho sender)
                if (userSockets[to]) {
                    userSockets[to].forEach(socketId => {
                        io.to(socketId).emit('private:message:received', messageData);
                    });
                }

                // Send confirmation back to sender only
                socket.emit('private:message:sent', messageData);
            }
        } catch (error) {
            console.error('Error saving private message:', error);
        }
    });

    // Handle private message edit
    socket.on('private:message:edit', async (data) => {
        const { messageId, newContent } = data;

        try {
            const user = await User.findOne({ username: socket.username });
            if (!user) return;

            const message = await PrivateMessage.findById(messageId);
            if (!message || String(message.from) !== String(user._id)) return;

            message.content = newContent;
            message.edited = true;
            message.editedAt = new Date();
            await message.save();

            // Broadcast edit to both users
            const editData = {
                messageId: messageId,
                newContent: newContent,
                edited: true,
                editedAt: message.editedAt
            };

            // Send to sender
            socket.emit('private:message:edited', editData);

            // Send to recipient if online
            const toUser = await User.findById(message.to);
            if (toUser && userSockets[toUser.username]) {
                userSockets[toUser.username].forEach(socketId => {
                    io.to(socketId).emit('private:message:edited', editData);
                });
            }
        } catch (error) {
            console.error('Error editing private message:', error);
        }
    });

    // Handle private message delete
    socket.on('private:message:delete', async (data) => {
        const { messageId } = data;

        try {
            const user = await User.findOne({ username: socket.username });
            if (!user) return;

            const message = await PrivateMessage.findById(messageId);
            if (!message || String(message.from) !== String(user._id)) return;

            const toUser = await User.findById(message.to);
            await PrivateMessage.findByIdAndDelete(messageId);

            // Broadcast delete to both users
            const deleteData = { messageId: messageId };

            // Send to sender
            socket.emit('private:message:deleted', deleteData);

            // Send to recipient if online
            if (toUser && userSockets[toUser.username]) {
                userSockets[toUser.username].forEach(socketId => {
                    io.to(socketId).emit('private:message:deleted', deleteData);
                });
            }
        } catch (error) {
            console.error('Error deleting private message:', error);
        }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
        if (socket.username) {
            // Xóa socket khỏi userSockets
            if (userSockets[socket.username]) {
                userSockets[socket.username].delete(socket.id);
                if (userSockets[socket.username].size === 0) {
                    // Không còn socket nào của user này, xóa khỏi online
                    onlineUsers.delete(socket.username);
                    delete userSockets[socket.username];
                    // Set isOnline=false trong DB
                    try {
                        await User.findOneAndUpdate({ username: socket.username }, { isOnline: false });
                    } catch (e) { }
                }
            }
            io.emit('user:online-list', Array.from(onlineUsers));
            io.emit('user:left', {
                username: socket.username,
                timestamp: new Date()
            });
        }
        console.log('Client disconnected');
    });
});

// Send pending messages to user who just came online
async function sendPendingMessages(username) {
    try {
        const user = await User.findOne({ username });
        if (!user) return;

        // Find unread messages for this user
        const pendingMessages = await PrivateMessage.find({
            to: user._id,
            isRead: false
        }).populate('from', 'username').sort({ createdAt: 1 });

        // Send each pending message
        if (userSockets[username] && pendingMessages.length > 0) {
            userSockets[username].forEach(socketId => {
                pendingMessages.forEach(msg => {
                    io.to(socketId).emit('private:message:received', {
                        _id: msg._id,
                        from: msg.from.username,
                        to: username,
                        content: msg.content,
                        type: msg.type || 'text',
                        fileName: msg.fileName,
                        timestamp: msg.createdAt,
                        isRead: false
                    });
                });
            });

            // Mark messages as delivered
            await PrivateMessage.updateMany(
                { to: user._id, isRead: false },
                { isRead: true }
            );
        }
    } catch (error) {
        console.error('Error sending pending messages:', error);
    }
}

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 