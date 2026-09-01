import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import './AdminChatbot.css';

const AdminChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('adminChatHistory');
    return saved ? JSON.parse(saved) : [
      { role: 'model', text: 'Hi Admin! I am your AI Assistant. I can update stock, check inventory, and fetch analytics. How can I help you today?' }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    localStorage.setItem('adminChatHistory', JSON.stringify(messages));
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/admin/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          prompt: userMsg.text,
          history: messages 
        })
      });
      
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
        if (data.reply.toLowerCase().includes('stock')) {
           window.dispatchEvent(new Event('refreshInventory'));
        }
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'model', text: `Error: ${data.error}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Error connecting to AI server.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`admin-chatbot-toggle ${isOpen ? 'hidden' : ''}`} onClick={() => setIsOpen(true)}>
        <Bot size={24} color="#fff" />
      </div>

      <div className={`admin-chatbot-window ${isOpen ? 'open' : ''}`}>
        <div className="admin-chatbot-header">
          <div className="admin-chatbot-title">
            <Bot size={20} color="#10b981" />
            <span>AI Admin Assistant</span>
          </div>
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="admin-chatbot-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-bubble ${msg.role}`}>
              <div className="icon">
                {msg.role === 'model' ? <Bot size={14} /> : <User size={14} />}
              </div>
              <div className="text">{msg.text}</div>
            </div>
          ))}
          {loading && (
            <div className="message-bubble model">
              <div className="icon"><Bot size={14} /></div>
              <div className="text typing">AI is thinking<span>.</span><span>.</span><span>.</span></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="admin-chatbot-input">
          <input 
            type="text" 
            placeholder="E.g., Add 10 stock to Haier AC..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminChatbot;
