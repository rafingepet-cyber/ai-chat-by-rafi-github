const GROQ_API_KEY = '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';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
let chats = [];
let activeChat = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', () => {
    loadChats();
    setupInput();
});

function setupInput() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    input.addEventListener('input', () => {
        sendBtn.disabled = !input.value.trim();
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateTitle(content) {
    return content.length > 30 ? content.substring(0, 30) + '...' : content || 'Chat Baru';
}

function newChat() {
    const chat = { id: generateId(), title: 'Chat Baru', messages: [], timestamp: new Date() };
    chats.unshift(chat);
    activeChat = chat.id;
    saveChats();
    renderChatList();
    showChat();
    document.getElementById('messageInput').focus();
}

function showChat() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('chatContainer').classList.remove('hidden');
    renderMessages();
}

function selectChat(id) {
    activeChat = id;
    renderChatList();
    showChat();
}

function deleteChat(id) {
    chats = chats.filter(c => c.id !== id);
    if (activeChat === id) activeChat = chats.length > 0 ? chats[0].id : null;
    saveChats();
    renderChatList();
    if (!activeChat) {
        document.getElementById('welcomeScreen').classList.remove('hidden');
        document.getElementById('chatContainer').classList.add('hidden');
    }
}

function renderChatList() {
    const list = document.getElementById('chatList');
    if (chats.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>💬</p><p>Belum ada chat</p><p class="sub">Mulai chat baru!</p></div>';
        return;
    }
    list.innerHTML = chats.map(chat => `
        <div class="chat-item ${chat.id === activeChat ? 'active' : ''}" onclick="selectChat('${chat.id}')">
            <span class="icon">💬</span>
            <div class="info">
                <div class="title">${escapeHtml(chat.title)}</div>
                <div class="date">${new Date(chat.timestamp).toLocaleDateString('id-ID')}</div>
            </div>
            <button class="delete" onclick="event.stopPropagation(); deleteChat('${chat.id}')">🗑️</button>
        </div>
    `).join('');
}

function renderMessages() {
    const chat = chats.find(c => c.id === activeChat);
    if (!chat) return;
    const container = document.getElementById('messages');
    container.innerHTML = chat.messages.map(msg => `
        <div class="message ${msg.role}">
            <div class="message-avatar">${msg.role === 'user' ? '👤' : '🤖'}</div>
            <div class="message-content">
                <div class="message-text">${formatMessage(msg.content)}</div>
                <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</div>
                ${msg.role === 'ai' ? `<div class="message-actions"><button class="btn-copy" onclick="copyMessage(this, '${escapeHtml(msg.content.replace(/'/g, "\\'"))}')">📋</button></div>` : ''}
            </div>
        </div>
    `).join('');
    scrollToBottom();
}

function formatMessage(content) {
    let html = escapeHtml(content);
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => `<pre><code>${code.trim()}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content || isLoading) return;
    if (!activeChat) newChat();
    const chat = chats.find(c => c.id === activeChat);
    const userMsg = { id: generateId(), role: 'user', content: content, timestamp: new Date() };
    chat.messages.push(userMsg);
    chat.title = chat.title === 'Chat Baru' ? generateTitle(content) : chat.title;
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;
    saveChats();
    renderChatList();
    renderMessages();
    isLoading = true;
    document.getElementById('typingIndicator').classList.remove('hidden');
    scrollToBottom();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Kamu adalah AI Chat Assistant bernama "Rafi AI". Kamu pintar, ramah, dan profesional. Kemampuan: 1. Ngobrol & Chat - Bisa diajak ngobrol santai, diskusi, tanya jawab 2. Coding & Programming - Bikin kode JS, Python, PHP, React, dll. Kode harus clean dan well-commented 3. Problem Solving - Bantu debug error, jelaskan konsep Rules: - Jawab dalam Bahasa Indonesia kecuali diminta bahasa lain - Untuk kode, pakai markdown code block - Jelaskan kode dengan detail - Selalu ramah dan helpful' },
                    ...chat.messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content }))
                ],
                temperature: 0.7,
                max_tokens: 4096
            })
        });
        if (!response.ok) throw new Error('Gagal mendapatkan response dari AI');
        const data = await response.json();
        const aiContent = data.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa memproses pesanmu.';
        const aiMsg = { id: generateId(), role: 'ai', content: aiContent, timestamp: new Date() };
        chat.messages.push(aiMsg);
        saveChats();
    } catch (error) {
        const errorMsg = { id: generateId(), role: 'ai', content: `❌ **Error:** ${error.message}\n\nPastikan:\n- Koneksi internet stabil\n- API key masih valid\n- Coba lagi nanti`, timestamp: new Date() };
        chat.messages.push(errorMsg);
        saveChats();
    } finally {
        isLoading = false;
        document.getElementById('typingIndicator').classList.add('hidden');
        renderMessages();
    }
}

function copyMessage(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅';
        setTimeout(() => btn.textContent = '📋', 2000);
    });
}

function scrollToBottom() {
    const container = document.getElementById('chatContainer');
    container.scrollTop = container.scrollHeight;
}

function saveChats() {
    localStorage.setItem('rafi-ai-chats', JSON.stringify(chats));
}

function loadChats() {
    const saved = localStorage.getItem('rafi-ai-chats');
    if (saved) {
        chats = JSON.parse(saved);
        renderChatList();
    }
}
