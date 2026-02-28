import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import AuthContext from '../providers/AuthContext';
import API_BASE_URL from '../config/api';

export default function ChatBot({ showOnPublic = false }) {
  const { user, userData } = useContext(AuthContext);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Event Corner AI. How can I help you?", ts: Date.now() }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [intent, setIntent] = useState('general');
  const endRef = useRef(null);

  // Check if user is on dashboard
  const isDashboard = ['/superadmin', '/admin', '/institution', '/organizer', '/participant']
    .some(path => location.pathname.startsWith(path));
  const isPublic = !isDashboard;
  const isAuthenticated = Boolean(user && userData);
  const userRole = userData?.roles?.[0]?.role_name || 'participant';
  const userId = user?.uid || 'anonymous';

  // Reset chat when user changes (e.g., logout/login)
  useEffect(() => {
    setMessages([
      { role: 'assistant', content: "Hi! I'm Event Corner AI. How can I help you?", ts: Date.now() }
    ]);
    setConversationId(null);
    setIntent('general');
  }, [userId]);

  // Generate conversation ID when authenticated
  useEffect(() => {
    if (!conversationId && isAuthenticated && userId !== 'anonymous') {
      setConversationId(`${userId}_${Date.now()}`);
    }
  }, [isAuthenticated, userId, conversationId]);

  // Auto scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Only show on dashboard when authenticated, or on public pages if enabled
  const shouldShow = (isDashboard && isAuthenticated) || (isPublic && showOnPublic && isAuthenticated);
  if (!shouldShow) return null;

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsg = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, ts: Date.now() }]);
    setLoading(true);

    try {
      // Get Firebase token
      const token = await user.getIdToken();

      // Prepare message history (last 4 messages for context)
      const messageHistory = messages
        .slice(-4)
        .map(msg => ({ role: msg.role, content: msg.content }));

      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add JWT token
        },
        body: JSON.stringify({
          message: userMsg,
          userRole: userRole,
          userId: userId,
          conversationId: conversationId,
          messageHistory: messageHistory
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Chat failed');
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        ts: Date.now(),
        intent: data.intent
      }]);

      // Update intent if provided
      if (data.intent) {
        setIntent(data.intent);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`,
        ts: Date.now(),
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col" style={{ height: '500px' }}>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <FaRobot className="text-xl" />
              </div>
              <div>
                <h3 className="font-bold">Event Corner AI</h3>
                <p className="text-xs text-white/80">Role: {userRole} • Intent: {intent}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <FaTimes className="text-xl" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : msg.error
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}>
                  <div className="text-sm prose prose-sm max-w-none">
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                          em: ({ node, ...props }) => <em className="italic" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="font-bold text-base mb-3 mt-3 border-b border-gray-300 pb-1" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="font-bold text-base mb-2 mt-3" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="font-bold text-sm mb-2 mt-2" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 ml-2 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 ml-2 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-0 pl-1" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-3 py-1 mb-2 italic text-gray-600" {...props} />,
                          code: ({ node, inline, ...props }) => inline ? 
                            <code className="bg-gray-100 px-1.5 rounded text-gray-700 text-xs" {...props} /> :
                            <code className="block bg-gray-100 p-2 rounded mb-2 text-gray-700 text-xs overflow-x-auto" {...props} />,
                          hr: () => <hr className="my-3 border-gray-300" />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${
                    msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                  }`}>{formatTime(msg.ts)}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border border-gray-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
              >
                <FaPaperPlane className="text-lg" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        aria-label="Toggle chat"
      >
        {isOpen ? <FaTimes className="text-2xl" /> : <FaRobot className="text-2xl" />}
      </button>
    </div>
  );
}