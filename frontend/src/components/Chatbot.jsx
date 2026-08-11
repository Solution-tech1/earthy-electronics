import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, Trash2 } from 'lucide-react';
import './Chatbot.css';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const defaultGreeting = { role: 'model', content: 'Assalam o Alaikum! Welcome to EarthyElectronics AI Assistant. How can I help you find the best energy-efficient home appliances today?' };
  const [messages, setMessages] = useState([defaultGreeting]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
          fetch(`${base}/api/chat/history/${user.id}`)
            .then(r => r.json())
            .then(data => {
              if (data.status === 'success' && data.data && data.data.length > 0) {
                setMessages([defaultGreeting, ...data.data]);
              }
            })
            .catch(err => console.error("Failed to load chat history", err));
        } catch (e) {
          console.error("Invalid user data in localStorage", e);
        }
      }
    }
  }, [isOpen]);

  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to delete your chat history?")) return;
    
    setMessages([defaultGreeting]);
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
        await fetch(`${base}/api/chat/history/${user.id}`, { method: 'DELETE' });
      } catch (e) {
        console.error("Failed to delete chat history on server", e);
      }
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const lowerInput = userMessage.toLowerCase();
      let botResponse = "I'm here to help! Could you specify what you're looking for? (e.g. ACs, TVs, Refrigerators, Delivery, or Warranty)";
      
      if (lowerInput.includes('ac') || lowerInput.includes('air conditioner') || lowerInput.includes('inverter')) {
        botResponse = "We have top-tier DC Inverter ACs from Haier, Dawlance, and Gree! You can check our Air Conditioners category for up to 30% savings on electricity.";
      } else if (lowerInput.includes('tv') || lowerInput.includes('led')) {
        botResponse = "Looking for a TV? We stock 4K Smart LEDs from TCL, Haier, and Samsung with crystal clear displays and Android TV features.";
      } else if (lowerInput.includes('fridge') || lowerInput.includes('refrigerator')) {
        botResponse = "Our Refrigerators from Dawlance and Haier come with No-Frost technology and up to 12 years of compressor warranty.";
      } else if (lowerInput.includes('delivery') || lowerInput.includes('shipping')) {
        botResponse = "Good news! We offer FREE doorstep delivery and installation on orders above Rs.80,000 in Karachi.";
      } else if (lowerInput.includes('warranty') || lowerInput.includes('guarantee')) {
        botResponse = "All our products come with official brand warranties. We are an authorized dealer for major brands.";
      } else if (lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('rs')) {
        botResponse = "Our prices are highly competitive! Use the 'Compare' feature on the Products page to find the best deal for your budget.";
      } else if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('salam')) {
        botResponse = "Walaikum Assalam! How can I assist you in upgrading your home appliances today?";
      }

      setMessages([...newMessages, { role: 'model', content: botResponse }]);
    } catch (error) {
      setMessages([...newMessages, { role: 'model', content: "Sorry, I couldn't process that right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text) => {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n\* (.*?)/g, '<br/>• $1');
    formatted = formatted.replace(/\n- (.*?)/g, '<br/>• $1');
    formatted = formatted.replace(/\n/g, '<br/>');
    return { __html: formatted };
  };

  return (
    <>
      <button 
        className={`chatbot-toggle-btn ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare size={24} />
      </button>

      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <Bot size={20} />
            <div>
              <h4>AI Assistant</h4>
              <p>EarthyElectronics</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="chatbot-close-btn" onClick={handleClearChat} title="Clear Chat">
              <Trash2 size={18} />
            </button>
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)} title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble-wrapper ${msg.role === 'user' ? 'user' : 'model'}`}>
              {msg.role === 'model' && <div className="chat-avatar"><Bot size={16}/></div>}
              <div 
                className="chat-bubble"
                dangerouslySetInnerHTML={formatText(msg.content)}
              />
            </div>
          ))}
          {isLoading && (
            <div className="chat-bubble-wrapper model">
              <div className="chat-avatar"><Bot size={16}/></div>
              <div className="chat-bubble loading"><Loader2 size={16} className="spin-icon" /> Typing...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chatbot-input-area" onSubmit={handleSend}>
          <input 
            type="text" 
            placeholder="Ask about ACs, TVs, Brands..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={!input.trim() || isLoading}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  );
}
