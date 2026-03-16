const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const userSockets = new Map(); // userId -> Set of socket IDs (to support multiple tabs)

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // In production, restrict this to your frontend URL
            methods: ['GET', 'POST']
        }
    });

    // JWT Authentication Middleware for Socket.io
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.onlineUsers = {}; // Global presence map

    io.on('connection', (socket) => {
        const userId = socket.user.id;
        console.log(`[socket] User connected: ${userId} (Socket: ${socket.id})`);

        // Add socket to user's set
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
            io.onlineUsers[userId] = true;

            // Broadcast online status to others
            socket.broadcast.emit('alumni:connection:online', { userId });
        }
        userSockets.get(userId).add(socket.id);

        // Join a private room for this user
        socket.join(`user:${userId}`);

        // --- ALUMNI CIRCLE PRESENCE ---
        socket.on('alumni:status:ping', () => {
            socket.emit('alumni:status:list', io.onlineUsers);
        });

        // --- CHAT LOGIC ---
        socket.on('chat:join', ({ conversationId }) => {
            if (!conversationId) return;
            socket.join(`conversation:${conversationId}`);
            console.log(`[socket] User ${userId} joined conversation: ${conversationId}`);
        });

        socket.on('chat:typing', ({ conversationId, isTyping }) => {
            if (!conversationId) return;
            socket.to(`conversation:${conversationId}`).emit('chat:typing', {
                userId,
                isTyping
            });
        });

        socket.on('chat:send', async (data) => {
            try {
                const now = Date.now();
                if (now - (socket.lastMsgAt || 0) < 500) {
                    return socket.emit('chat:error', { message: 'Too fast!' });
                }

                // Rate limit: max 20 messages per 10 seconds
                socket.msgBuffer = socket.msgBuffer || [];
                socket.msgBuffer = socket.msgBuffer.filter(t => now - t < 10000);
                if (socket.msgBuffer.length >= 20) {
                    return socket.emit('chat:error', { message: 'Rate limit exceeded. Slow down.' });
                }
                socket.msgBuffer.push(now);
                socket.lastMsgAt = now;

                const { conversationId, text, clientMessageId, attachments } = data;
                if (!conversationId || !text) return;

                const Message = require('../models/Message');
                const Conversation = require('../models/Conversation');

                // Check if conversation exists and its status
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) return;

                // If it's a direct chat and status is declined, block message
                if (conversation.type === 'direct' && conversation.status === 'declined') {
                    return socket.emit('chat:error', { message: 'Conversation request declined.' });
                }

                // Deduplication
                if (clientMessageId) {
                    const existing = await Message.findOne({ clientMessageId }).lean();
                    if (existing) {
                        return socket.emit('chat:new-message', existing);
                    }
                }

                const message = await Message.create({
                    conversationId,
                    sender: userId,
                    text,
                    clientMessageId,
                    attachments,
                    readBy: [userId],
                    createdAt: new Date()
                });

                // Update conversation and increment unread counts for others
                if (conversation) {
                    conversation.lastMessage = { text, sender: userId, createdAt: message.createdAt };
                    conversation.lastMessageAt = message.createdAt;

                    // Increment unread counts for all participants EXCEPT sender
                    conversation.participants.forEach(p => {
                        const pid = p.toString();
                        if (pid !== userId) {
                            const current = conversation.unreadCounts.get(pid) || 0;
                            conversation.unreadCounts.set(pid, current + 1);
                        }
                    });

                    await conversation.save();

                    io.to(`conversation:${conversationId}`).emit('chat:new-message', message);

                    conversation.participants.forEach(p => {
                        const pid = p.toString();
                        io.to(`user:${pid}`).emit('chat:update-list', {
                            conversationId,
                            lastMessage: text,
                            unreadCount: conversation.unreadCounts.get(pid) || 0,
                            status: conversation.status
                        });
                    });
                }
            } catch (err) {
                console.error('[socket] chat:send error:', err.message);
            }
        });

        // --- CALL SIGNALING (READY LAYER) ---
        socket.on('call:offer', (data) => {
            // data: { toUserId, offer, conversationId, callType }
            socket.to(`user:${data.toUserId}`).emit('call:offer', {
                fromUserId: userId,
                offer: data.offer,
                conversationId: data.conversationId,
                callType: data.callType
            });
        });

        socket.on('call:answer', (data) => {
            socket.to(`user:${data.toUserId}`).emit('call:answer', {
                fromUserId: userId,
                answer: data.answer
            });
        });

        socket.on('call:ice-candidate', (data) => {
            socket.to(`user:${data.toUserId}`).emit('call:ice-candidate', {
                fromUserId: userId,
                candidate: data.candidate
            });
        });

        socket.on('call:reject', (data) => {
            socket.to(`user:${data.toUserId}`).emit('call:reject', { fromUserId: userId });
        });

        socket.on('chat:read', async ({ conversationId, messageId }) => {
            try {
                if (!conversationId) return;
                const Message = require('../models/Message');
                const Conversation = require('../models/Conversation');

                // Mark messages as read
                const updateQuery = { conversationId, sender: { $ne: userId }, readBy: { $ne: userId } };
                if (messageId) updateQuery._id = messageId;
                await Message.updateMany(updateQuery, { $addToSet: { readBy: userId } });

                // Reset unread count in DB
                const conversation = await Conversation.findById(conversationId);
                if (conversation) {
                    conversation.unreadCounts.set(userId, 0);
                    await conversation.save();

                    // Notify partner
                    const partnerId = conversation.participants.find(p => p.toString() !== userId);
                    if (partnerId) {
                        io.to(`user:${partnerId.toString()}`).emit('chat:partner-read', { conversationId, userId, messageId });
                    }

                    // Sync unread status across own tabs
                    io.to(`user:${userId}`).emit('chat:update-unread', { conversationId, unreadCount: 0 });
                }
            } catch (err) {
                console.error('[socket] chat:read error:', err.message);
            }
        });

        socket.on('chat:leave', ({ conversationId }) => {
            if (conversationId) socket.leave(`conversation:${conversationId}`);
        });

        socket.on('disconnect', () => {
            const userSet = userSockets.get(userId);
            if (userSet) {
                userSet.delete(socket.id);
                if (userSet.size === 0) {
                    userSockets.delete(userId);
                    delete io.onlineUsers[userId];
                    socket.broadcast.emit('alumni:connection:offline', { userId });
                }
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

const emitNotification = (userId, payload) => {
    if (!io) return;
    io.to(`user:${userId.toString()}`).emit('notification:new', payload);
};

module.exports = { initSocket, getIO, emitNotification };
