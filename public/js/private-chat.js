let currentUser = null;
let authToken = null;
let socket = null;
let selectedUser = null;

// Initialize private chat
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndInit();
});

// Check authentication and initialize
function checkAuthAndInit() {
    authToken = getCookie('authToken');
    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }

    verifyTokenAndInit();
}

// Verify token and initialize socket
async function verifyTokenAndInit() {
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            initializeSocket();
            loadOnlineUsers();
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Auth verification error:', error);
        window.location.href = 'index.html';
    }
}

// Initialize socket connection
function initializeSocket() {
    socket = io();

    // Join with username
    socket.emit('user:join', currentUser.username);

    // Listen for online users updates
    socket.on('user:online-list', (users) => {
        updateOnlineUsersList(users);
    });

    // Listen for user left events
    socket.on('user:left', (data) => {
        console.log(`${data.username} đã offline`);

        // Update status in chat if we're chatting with this user
        if (selectedUser && selectedUser.username === data.username) {
            updateUserStatus('offline');
        }
    });

    // Listen for user joined events
    socket.on('user:joined', (data) => {
        console.log(`${data.username} đã online`);

        // Update status in chat if we're chatting with this user
        if (selectedUser && selectedUser.username === data.username) {
            updateUserStatus('online');
        }
    });

    // Listen for private messages received
    socket.on('private:message:received', (data) => {
        if (selectedUser && data.from === selectedUser.username) {
            displayPrivateMessage(data, false); // false = received message
        }
    });

    // Listen for private messages sent confirmation
    socket.on('private:message:sent', (data) => {
        // Message was already displayed when user clicked send
        console.log('Message sent successfully:', data);
    });

    // Listen for message edit events
    socket.on('private:message:edited', (data) => {
        const messageDiv = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageDiv) {
            const messageContent = messageDiv.querySelector('.message-content');
            if (messageContent) {
                messageContent.textContent = data.newContent;

                // Add edited indicator
                const timeDiv = messageDiv.querySelector('.message-time');
                if (timeDiv && !timeDiv.textContent.includes('(đã sửa)')) {
                    timeDiv.innerHTML += ' <span class="edited-indicator">(đã sửa)</span>';
                }
            }
        }
    });

    // Listen for message delete events
    socket.on('private:message:deleted', (data) => {
        const messageDiv = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageDiv) {
            messageDiv.remove();
        }
    });
}

// Load and display online users
function loadOnlineUsers() {
    // Users will be updated via socket events
    // Also load recent chats on initial load
    loadRecentChatsAndDisplay();
}

// Combined users list (online + recent chats)
let allUsers = [];
let onlineUsersList = [];

// Update online users list
function updateOnlineUsersList(onlineUsers) {
    onlineUsersList = onlineUsers.filter(username => username !== currentUser.username);
    loadRecentChatsAndDisplay();
}

// Load recent chats and combine with online users
async function loadRecentChatsAndDisplay() {
    try {
        console.log('Loading recent chats...');
        const response = await fetch('/api/private-messages/recent-contacts', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        let recentUsers = [];
        if (response.ok) {
            recentUsers = await response.json();
            console.log('Recent users loaded:', recentUsers);
        } else {
            console.error('Failed to load recent contacts:', response.status);
        }

        // Combine online users and recent chat users
        const combinedUsers = new Map();

        // Add online users first
        onlineUsersList.forEach(username => {
            combinedUsers.set(username, {
                username,
                isOnline: true,
                lastActivity: new Date()
            });
        });

        // Add recent chat users
        recentUsers.forEach(user => {
            if (user.username !== currentUser.username) {
                if (combinedUsers.has(user.username)) {
                    // User is both online and has recent chats
                    combinedUsers.get(user.username).lastActivity = new Date(user.lastMessageTime);
                } else {
                    // User is offline but has recent chats
                    combinedUsers.set(user.username, {
                        username: user.username,
                        isOnline: false,
                        lastActivity: new Date(user.lastMessageTime)
                    });
                }
            }
        });

        const finalUsers = Array.from(combinedUsers.values());
        console.log('Final combined users:', finalUsers);
        displayUsersList(finalUsers);
    } catch (error) {
        console.error('Error loading recent chats:', error);
        // Fallback to only online users
        displayUsersList(onlineUsersList.map(username => ({
            username,
            isOnline: true,
            lastActivity: new Date()
        })));
    }
}

// Display users list
function displayUsersList(users) {
    const usersList = document.getElementById('onlineUsersList');
    if (!usersList) return;

    if (users.length === 0) {
        usersList.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Không có người dùng nào</div>';
        return;
    }

    // Sort: online users first, then by last activity
    users.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return new Date(b.lastActivity) - new Date(a.lastActivity);
    });

    usersList.innerHTML = users.map(user => `
        <div class="user-item" onclick="startPrivateChat('${user.username}', ${user.isOnline})">
            <div class="user-avatar ${user.isOnline ? 'online' : 'offline'}">
                <i class="fas fa-user"></i>
            </div>
            <div class="user-info">
                <div class="user-name">${user.username}</div>
                <div class="user-status ${user.isOnline ? 'online' : 'offline'}">
                    <i class="fas fa-circle" style="font-size: 8px;"></i> 
                    ${user.isOnline ? 'Đang online' : 'Offline'}
                </div>
            </div>
        </div>
    `).join('');
}

// Start private chat with selected user
function startPrivateChat(username, isOnline = true) {
    selectedUser = { username, isOnline };

    // Switch to chat screen
    document.getElementById('userSelection').style.display = 'none';
    document.getElementById('privateChatScreen').style.display = 'flex';
    document.getElementById('chatPartnerName').textContent = `Chat với ${username}`;

    // Set initial status based on current status
    updateUserStatus(isOnline ? 'online' : 'offline');

    // Clear previous messages and load conversation history
    document.getElementById('privateMessages').innerHTML = '';
    loadConversationHistory(username);

    // Focus on input
    document.getElementById('privateMessageInput').focus();
}

// Send private message
function sendPrivateMessage() {
    const input = document.getElementById('privateMessageInput');
    const message = input.value.trim();

    if (!message || !selectedUser) return;

    const messageData = {
        to: selectedUser.username,
        from: currentUser.username,
        content: message,
        type: 'text',
        timestamp: new Date()
    };

    // Validate data before sending
    if (!messageData.content || !messageData.to || !messageData.from) {
        console.error('Invalid message data:', messageData);
        return;
    }

    // Display message immediately as sent
    displayPrivateMessage(messageData, true);

    // Emit private message via socket
    socket.emit('private:message', messageData);

    // Clear input
    input.value = '';
}

// Display private message
function displayPrivateMessage(data, isSent = false) {
    const messagesContainer = document.getElementById('privateMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `private-message ${isSent || data.from === currentUser.username ? 'sent' : 'received'}`;
    messageDiv.setAttribute('data-message-id', data._id);

    const time = new Date(data.timestamp).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    let messageContent = '';
    const canEdit = data.from === currentUser.username && data.type === 'text';

    // Handle different message types
    switch (data.type) {
        case 'image':
            messageContent = `
                <div class="message-image">
                    <img src="${data.content}" alt="Image" style="max-width: 200px; max-height: 200px; border-radius: 8px;" onclick="window.open('${data.content}', '_blank')">
                </div>
            `;
            break;
        case 'file':
            const fileName = data.fileName || 'File';
            messageContent = `
                <div class="message-file">
                    <i class="fas fa-file"></i>
                    <a href="${data.content}" download="${fileName}" target="_blank">${fileName}</a>
                    <button onclick="window.open('${data.content}', '_blank')" style="margin-left: 8px; padding: 2px 8px; border: none; background: rgba(255,255,255,0.2); color: inherit; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
            break;
        case 'audio':
            messageContent = `
                <div class="message-audio">
                    <audio controls style="width: 200px;">
                        <source src="${data.content}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            `;
            break;
        default:
            messageContent = `<div class="message-content" ondblclick="${canEdit ? `editMessage('${data._id}')` : ''}">${data.content}</div>`;
    }

    // Add edit indicator if message was edited
    const editedIndicator = data.edited ? '<span class="edited-indicator">(đã sửa)</span>' : '';

    // Add action buttons for own messages
    const actionButtons = data.from === currentUser.username ? `
        <div class="message-actions" style="display: none;">
            ${data.type === 'text' ? `<button onclick="editMessage('${data._id}')" class="edit-btn" title="Sửa"><i class="fas fa-edit"></i></button>` : ''}
            <button onclick="deleteMessage('${data._id}')" class="delete-btn" title="Xóa"><i class="fas fa-trash"></i></button>
        </div>
    ` : '';

    messageDiv.innerHTML = `
        <div class="message-wrapper">
            ${messageContent}
            <div class="message-time">${time} ${editedIndicator}</div>
            ${actionButtons}
        </div>
    `;

    // Add hover event for action buttons
    if (data.from === currentUser.username) {
        messageDiv.addEventListener('mouseenter', () => {
            const actions = messageDiv.querySelector('.message-actions');
            if (actions) actions.style.display = 'flex';
        });
        messageDiv.addEventListener('mouseleave', () => {
            const actions = messageDiv.querySelector('.message-actions');
            if (actions) actions.style.display = 'none';
        });
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Back to user selection
function backToUserSelection() {
    selectedUser = null;
    document.getElementById('privateChatScreen').style.display = 'none';
    document.getElementById('userSelection').style.display = 'flex';
}

// Handle Enter key in message input
document.addEventListener('keypress', (e) => {
    if (e.target.id === 'privateMessageInput' && e.key === 'Enter') {
        sendPrivateMessage();
    }
});

// Update user status in chat header
function updateUserStatus(status) {
    const statusElement = document.getElementById('userStatus');
    if (statusElement) {
        statusElement.textContent = status === 'online' ? 'Đang online' : 'Offline';
        statusElement.className = `user-status ${status}`;
    }
}

// Load conversation history
async function loadConversationHistory(username) {
    try {
        // Get user ID first
        const userResponse = await fetch('/api/users/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ username })
        });

        if (!userResponse.ok) return;

        const userData = await userResponse.json();
        const userId = userData._id;

        // Load conversation
        const response = await fetch(`/api/private-messages/conversation/${userId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const messages = await response.json();
            const messagesContainer = document.getElementById('privateMessages');
            messagesContainer.innerHTML = '';

            messages.forEach(msg => {
                const messageData = {
                    _id: msg._id,
                    from: msg.from.username,
                    to: msg.to.username,
                    content: msg.content,
                    type: msg.type || 'text',
                    fileName: msg.fileName,
                    edited: msg.edited,
                    timestamp: msg.createdAt
                };
                displayPrivateMessage(messageData);
            });
        }
    } catch (error) {
        console.error('Error loading conversation history:', error);
    }
}

// Edit message
function editMessage(messageId) {
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageDiv) return;

    const messageContent = messageDiv.querySelector('.message-content');
    if (!messageContent) return;

    const currentText = messageContent.textContent;

    // Create edit input
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = currentText;
    editInput.className = 'edit-input';
    editInput.style.cssText = `
        width: 100%;
        padding: 8px;
        border: 1px solid #4caf50;
        border-radius: 4px;
        background: var(--input-background);
        color: var(--text-color);
        font-size: 14px;
    `;

    // Replace content with input
    messageContent.style.display = 'none';
    messageContent.parentNode.insertBefore(editInput, messageContent.nextSibling);

    // Focus and select all
    editInput.focus();
    editInput.select();

    // Handle save/cancel
    function saveEdit() {
        const newText = editInput.value.trim();
        if (newText && newText !== currentText) {
            // Send edit request
            socket.emit('private:message:edit', {
                messageId: messageId,
                newContent: newText
            });

            // Update UI immediately
            messageContent.textContent = newText;
            messageContent.style.display = 'block';
            editInput.remove();

            // Add edited indicator
            const timeDiv = messageDiv.querySelector('.message-time');
            if (timeDiv && !timeDiv.textContent.includes('(đã sửa)')) {
                timeDiv.innerHTML += ' <span class="edited-indicator">(đã sửa)</span>';
            }
        } else {
            cancelEdit();
        }
    }

    function cancelEdit() {
        messageContent.style.display = 'block';
        editInput.remove();
    }

    // Event listeners
    editInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });

    editInput.addEventListener('blur', saveEdit);
}

// Delete message
function deleteMessage(messageId) {
    if (!confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;

    // Send delete request
    socket.emit('private:message:delete', { messageId });

    // Remove from UI immediately
    const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageDiv) {
        messageDiv.remove();
    }
}

// Helper function to get cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
} 