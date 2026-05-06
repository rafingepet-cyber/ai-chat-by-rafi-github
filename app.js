// =====================
// RFChat - Core App
// =====================

const CONFIG = {
    APP_NAME: 'RFChat',
    OWNER_NUMBER: '625776263259',
    OWNER_NAME: 'Rafi (Owner)',
    PRIMARY_COLOR: '#25d366',
    SECONDARY_COLOR: '#128c7e'
};

// Firebase Config - GANTI DENGAN CONFIG KAMU!
const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "chatstar-ec9bd.firebaseapp.com",
    databaseURL: "https://chatstar-ec9bd-default-rtdb.firebaseio.com",
    projectId: "chatstar-ec9bd",
    storageBucket: "chatstar-ec9bd.appspot.com",
    messagingSenderId: "221969583189",
    appId: "1:221969583189:web:abcdef123456"
};

// Inisialisasi Firebase
let firebaseApp, db, auth;
let currentUser = null;
let currentChat = null;
let messagesRef = null;
let typingTimeout = null;

function initFirebase() {
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    auth = firebase.auth();
}

// ===== USER MANAGEMENT =====
function getCurrentUser() {
    const saved = localStorage.getItem('rfchat_user');
    return saved ? JSON.parse(saved) : null;
}

function setCurrentUser(user) {
    localStorage.setItem('rfchat_user', JSON.stringify(user));
    currentUser = user;
}

function isOwner() {
    const user = getCurrentUser();
    return user && user.phone === CONFIG.OWNER_NUMBER;
}

// ===== AUTH =====
function checkAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    currentUser = user;
    return true;
}

function logout() {
    localStorage.removeItem('rfchat_user');
    if (db && currentUser) {
        db.ref('users/' + currentUser.uid + '/status').set('offline');
    }
    window.location.href = 'index.html';
}

// ===== ONLINE STATUS =====
function setOnline() {
    if (!db || !currentUser) return;
    
    const userRef = db.ref('users/' + currentUser.uid);
    userRef.update({
        status: 'online',
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        name: currentUser.name,
        phone: currentUser.phone
    });
    
    userRef.child('status').onDisconnect().set('offline');
}

// ===== CHAT FUNCTIONS =====
function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
}

function createPrivateChat(phone, name) {
    const chatId = getChatId(currentUser.uid, phone.replace(/\D/g, ''));
    
    // Buat chat untuk current user
    db.ref('userChats/' + currentUser.uid + '/' + chatId).set({
        name: name || phone,
        type: 'private',
        partner: phone.replace(/\D/g, ''),
        lastMsg: '',
        lastTime: '',
        unread: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Buat chat untuk partner
    db.ref('userChats/' + phone.replace(/\D/g, '') + '/' + chatId).set({
        name: currentUser.name,
        type: 'private',
        partner: currentUser.uid,
        lastMsg: '',
        lastTime: '',
        unread: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    return chatId;
}

function createGroup(name) {
    const groupId = 'group_' + Date.now();
    
    db.ref('groups/' + groupId).set({
        name: name,
        createdBy: currentUser.uid,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        members: {
            [currentUser.uid]: {
                role: 'admin',
                joinedAt: firebase.database.ServerValue.TIMESTAMP
            }
        }
    });
    
    db.ref('userChats/' + currentUser.uid + '/' + groupId).set({
        name: name,
        type: 'group',
        lastMsg: 'Grup dibuat',
        lastTime: new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}),
        unread: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    return groupId;
}

// ===== MESSAGE FUNCTIONS =====
function sendMessage(chatId, text, type = 'text') {
    if (!db || !chatId || !text.trim()) return Promise.reject('Invalid');
    
    const msgData = {
        text: text.trim(),
        sender: currentUser.uid,
        senderName: currentUser.name,
        senderPhone: currentUser.phone,
        type: type,
        time: firebase.database.ServerValue.TIMESTAMP,
        read: false,
        readBy: {
            [currentUser.uid]: true
        }
    };
    
    const msgRef = db.ref('messages/' + chatId).push();
    
    return msgRef.set(msgData).then(() => {
        // Update last message
        db.ref('userChats/' + currentUser.uid + '/' + chatId).update({
            lastMsg: text.trim(),
            lastTime: new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})
        });
        
        // Update unread untuk partner
        if (!currentChat || currentChat.id !== chatId) {
            db.ref('userChats').orderByKey().equalTo(chatId).once('value', snap => {
                snap.forEach(child => {
                    const partner = child.key;
                    if (partner !== currentUser.uid) {
                        db.ref('userChats/' + partner + '/' + chatId + '/unread').transaction(val => (val || 0) + 1);
                    }
                });
            });
        }
        
        return msgRef.key;
    });
}

function markAsRead(chatId) {
    if (!db) return;
    
    db.ref('messages/' + chatId).orderByChild('read').equalTo(false).once('value', snap => {
        snap.forEach(child => {
            const msg = child.val();
            if (msg.sender !== currentUser.uid) {
                child.ref.update({
                    read: true,
                    readBy: { ...msg.readBy, [currentUser.uid]: true }
                });
            }
        });
    });
    
    // Reset unread count
    db.ref('userChats/' + currentUser.uid + '/' + chatId + '/unread').set(0);
}

// ===== BROADCAST (OWNER ONLY) =====
function broadcastMessage(text) {
    if (!isOwner()) return Promise.reject('Bukan owner!');
    
    return db.ref('users').once('value').then(snap => {
        const promises = [];
        snap.forEach(child => {
            const userId = child.key;
            if (userId !== currentUser.uid) {
                const chatId = getChatId(currentUser.uid, userId);
                promises.push(sendMessage(chatId, '[📢 Broadcast] ' + text, 'broadcast'));
            }
        });
        return Promise.all(promises);
    });
}

// ===== UTILS =====
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hari ini';
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return date.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== TYPING INDICATOR =====
function setTyping(chatId, isTyping) {
    if (!db || !chatId) return;
    db.ref('typing/' + chatId + '/' + currentUser.uid).set(isTyping ? true : null);
}

function listenTyping(chatId, callback) {
    if (!db || !chatId) return;
    db.ref('typing/' + chatId).on('value', snap => {
        const typers = [];
        snap.forEach(child => {
            if (child.key !== currentUser.uid && child.val()) {
                typers.push(child.key);
            }
        });
        callback(typers.length > 0);
    });
}

// Export
window.CONFIG = CONFIG;
window.initFirebase = initFirebase;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.isOwner = isOwner;
window.checkAuth = checkAuth;
window.logout = logout;
window.setOnline = setOnline;
window.getChatId = getChatId;
window.createPrivateChat = createPrivateChat;
window.createGroup = createGroup;
window.sendMessage = sendMessage;
window.markAsRead = markAsRead;
window.broadcastMessage = broadcastMessage;
window.genId = genId;
window.formatTime = formatTime;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;
window.setTyping = setTyping;
window.listenTyping = listenTyping;
window.db = () => db;
