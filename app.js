// =====================
// Rafi AI - Shared Functions
// =====================

const GROQ_API_KEY = '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';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// User Management
function getUsers() {
    const data = localStorage.getItem('rafi_users');
    return data ? JSON.parse(data) : [];
}

function saveUsers(users) {
    localStorage.setItem('rafi_users', JSON.stringify(users));
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('rafi_current_user') || 'null');
}

function setCurrentUser(user) {
    localStorage.setItem('rafi_current_user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('rafi_current_user');
    window.location.href = 'login.html';
}

// Chat Management
function getStorageKey() {
    const user = getCurrentUser();
    return 'rafi_chats_' + (user?.id || 'guest');
}

function getChats() {
    const data = localStorage.getItem(getStorageKey());
    return data ? JSON.parse(data) : [];
}

function saveChats(chats) {
    localStorage.setItem(getStorageKey(), JSON.stringify(chats));
}

// Utilities
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function genTitle(text) {
    return text.replace(/[#*`]/g, '').trim().slice(0, 30) || 'Chat Baru';
}

function esc(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function fmt(c) {
    let h = esc(c);
    h = h.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, l, code) => `<pre><code>${code.trim()}</code></pre>`);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.*?)\*/g, '<em>$1</em>');
    h = h.replace(/\n/g, '<br>');
    return h;
}

// Export for global access
window.GROQ_API_KEY = GROQ_API_KEY;
window.API_URL = API_URL;
window.getUsers = getUsers;
window.saveUsers = saveUsers;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.logout = logout;
window.getStorageKey = getStorageKey;
window.getChats = getChats;
window.saveChats = saveChats;
window.genId = genId;
window.genTitle = genTitle;
window.esc = esc;
window.fmt = fmt;
