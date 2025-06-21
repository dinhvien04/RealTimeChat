const express = require('express');
const router = express.Router();
const PrivateMessage = require('../models/PrivateMessage');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get conversation between two users
router.get('/conversation/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        // Create conversation ID (always same order)
        const conversationId = [currentUserId, userId].sort().join('_');

        const messages = await PrivateMessage.find({ conversationId })
            .populate('from', 'username')
            .populate('to', 'username')
            .sort({ createdAt: 1 })
            .limit(50);

        res.json(messages);
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's conversations list
router.get('/conversations', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all conversations where user is participant
        const conversations = await PrivateMessage.aggregate([
            {
                $match: {
                    $or: [{ from: userId }, { to: userId }]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: '$conversationId',
                    lastMessage: { $first: '$$ROOT' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$to', userId] }, { $eq: ['$isRead', false] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lastMessage.from',
                    foreignField: '_id',
                    as: 'fromUser'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lastMessage.to',
                    foreignField: '_id',
                    as: 'toUser'
                }
            }
        ]);

        res.json(conversations);
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark messages as read
router.put('/read/:conversationId', auth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        await PrivateMessage.updateMany(
            {
                conversationId,
                to: userId,
                isRead: false
            },
            { isRead: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get recent contacts (users that had conversations with current user)
router.get('/recent-contacts', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Getting recent contacts for user:', userId);

        // Convert string to ObjectId
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Get all users that had conversations with current user
        const recentContacts = await PrivateMessage.aggregate([
            {
                $match: {
                    $or: [{ from: userObjectId }, { to: userObjectId }]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$from', userObjectId] },
                            '$to',
                            '$from'
                        ]
                    },
                    lastMessageTime: { $first: '$createdAt' },
                    lastMessage: { $first: '$content' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    username: '$user.username',
                    lastMessageTime: 1,
                    lastMessage: 1
                }
            },
            {
                $sort: { lastMessageTime: -1 }
            }
        ]);

        console.log('Recent contacts found:', recentContacts.length);
        res.json(recentContacts);
    } catch (error) {
        console.error('Get recent contacts error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router; 