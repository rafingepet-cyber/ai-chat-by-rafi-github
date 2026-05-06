// =====================
// Rafi AI - Core Functions
// =====================

const GROQ_API_KEY = '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';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// USER FUNCTIONS
function getUsers() {
    try {
        const data = localStorage.getItem('rafi_users');
        return data ? JSON.parse(data) : [];
    } catch(e) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem('rafi_users', JSON.stringify(users));
}

function getCurrentUser() {
    try {
        const data = localStorage.getItem('rafi_current_user');
        return data ? JSON.parse(data) : null;
    } catch(e) {
        return null;
    }
}

function saveCurrentUser(user) {
    localStorage.setItem('rafi_current_user', JSON.stringify(user));
}

// CHAT FUNCTIONS
function getChatKey() {
    const user = getCurrentUser();
    return 'rafi_chats_' + (user ? user.id : 'guest');
}

function getAllChats() {
    try {
        const data = localStorage.getItem(getChatKey());
        return data ? JSON.parse(data) : [];
    } catch(e) {
        return [];
    }
}

function saveAllChats(chats) {
    localStorage.setItem(getChatKey(), JSON.stringify(chats));
}

// UTILITIES
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function genTitle(text) {
    const clean = text.replace(/[#*`]/g, '').trim();
    return clean.length > 25 ? clean.substring(0, 25) + '...' : clean || 'Chat Baru';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessage(content) {
    let html = escapeHtml(content);
    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return '<pre><code>' + code.trim() + '</code></pre>';
    });
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
}

// AI API
async function askAI(messages) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + GROQ_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: 'Kamu adalah AI Chat Assistant bernama "Rafi AI". Kamu pintar, ramah, dan profesional.\n\nKemampuan:\n1. Ngobrol & Chat - Bisa diajak ngobrol santai, diskusi, tanya jawab\n2. Coding & Programming - Bikin kode JS, Python, PHP, React, dll. Kode harus clean dan well-commented\n3. Problem Solving - Bantu debug error, jelaskan konsep\n\nRules:\n- Jawab dalam Bahasa Indonesia kecuali diminta bahasa lain\n- Untuk kode, pakai markdown code block\n- Jelaskan kode dengan detail\n- Selalu ramah dan helpful'
                },
                ...messages.map(m => ({
                    role: m.role === 'ai' ? 'assistant' : m.role,
                    content: m.content
                }))
            ],
            temperature: 0.7,
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        throw new Error('Gagal response dari AI');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa memproses.';
}

// Export semua fungsi ke window biar bisa dipake di HTML
window.GROQ_API_KEY = GROQ_API_KEY;
window.API_URL = API_URL;
window.getUsers = getUsers;
window.saveUsers = saveUsers;
window.getCurrentUser = getCurrentUser;
window.saveCurrentUser = saveCurrentUser;
window.getAllChats = getAllChats;
window.saveAllChats = saveAllChats;
window.getChatKey = getChatKey;
window.genId = genId;
window.genTitle = genTitle;
window.escapeHtml = escapeHtml;
window.formatMessage = formatMessage;
window.askAI = askAI;
