import React, { useState } from 'react';
import { X, Send, Bot, User, Loader2, Paperclip, CheckSquare, Square, FileText } from 'lucide-react';
import Markdown from 'react-markdown';

const AIChat = ({ onClose, files: allFiles = [] }) => {
    const [messages, setMessages] = useState([{ role: 'bot', text: 'Hello! I am your AI assistant. Ask me anything about your files!' }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showSelector, setShowSelector] = useState(false);

    const toggleFile = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        
        const userQuery = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userQuery, fileIds: selectedIds })
            });
            const data = await res.json();
            
            if (data.success) {
                setMessages(prev => [...prev, { role: 'bot', text: data.answer }]);
            } else {
                setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I encountered an error.' }]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'bot', text: 'Network error communicating with AI.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="overlay" onClick={onClose} style={{ background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="modal-box chat-modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', margin: 0 }}>
                        <Bot color="var(--accent-primary)" /> Chat with Files
                    </h2>
                    <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.75rem', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            {msg.role === 'bot' && (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent-primary)' }}>
                                    <Bot size={16} />
                                </div>
                            )}
                            <div style={{ maxWidth: '80%', borderRadius: '16px', padding: '1rem', background: msg.role === 'user' ? 'var(--accent-hover)' : 'var(--bg-primary)', color: msg.role === 'user' ? 'var(--text-primary)' : 'var(--text-primary)', border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)', borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px', borderBottomLeftRadius: msg.role === 'bot' ? '4px' : '16px' }}>
                                <div className="prose" style={{ color: 'inherit', maxWidth: 'none' }}>
                                    <Markdown>{msg.text || ''}</Markdown>
                                </div>
                            </div>
                            {msg.role === 'user' && (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-secondary)' }}>
                                    <User size={16} />
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent-primary)' }}>
                                <Bot size={16} />
                            </div>
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', borderBottomLeftRadius: '4px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                <Loader2 className="animate-spin" size={16} /> Thinking...
                            </div>
                        </div>
                    )}
                </div>
                
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', position: 'relative' }}>
                    {showSelector && (
                        <div className="hide-scrollbar" style={{ position: 'absolute', bottom: 'calc(100% + 0.5rem)', left: '1rem', width: '280px', maxHeight: '256px', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-xl)', zIndex: 50, padding: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', padding: '0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Files to Chat With</div>
                            {allFiles.filter(f => !f.isFolder && !f.trashed).length === 0 ? (
                                <div style={{ padding: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No files available.</div>
                            ) : (
                                allFiles.filter(f => !f.isFolder && !f.trashed).map(file => (
                                    <div 
                                        key={file.messageId}
                                        onClick={() => toggleFile(file.messageId)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', background: selectedIds.includes(file.messageId) ? 'var(--bg-tertiary)' : 'transparent', transition: 'var(--transition-fast)' }}
                                    >
                                        <div style={{ color: 'var(--accent-primary)' }}>
                                            {selectedIds.includes(file.messageId) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </div>
                                        <FileText size={16} color="var(--text-secondary)" />
                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{file.filename}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        style={{ display: 'flex', gap: '0.5rem' }}
                    >
                        <button
                            type="button"
                            onClick={() => setShowSelector(!showSelector)}
                            style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedIds.length > 0 ? 'var(--accent-hover)' : 'var(--bg-secondary)', color: selectedIds.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'var(--transition-fast)' }}
                            title="Select files"
                        >
                            <Paperclip size={20} />
                            {selectedIds.length > 0 && <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>{selectedIds.length}</span>}
                        </button>
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onFocus={() => setShowSelector(false)}
                            placeholder="Ask about your documents (e.g. 'Summarize the resume pdf')"
                            style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                        />
                        <button 
                            type="submit"
                            disabled={!input.trim() || loading}
                            style={{ background: (!input.trim() || loading) ? 'var(--border-color)' : 'var(--accent-primary)', color: 'white', padding: '0.75rem', borderRadius: '12px', border: 'none', cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer', transition: 'var(--transition-fast)' }}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
