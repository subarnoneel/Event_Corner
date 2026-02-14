import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiMessageCircle, FiCheck, FiEdit2, FiLoader } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_ENDPOINTS } from '../../../config/api';

const ConversationalEventCreator = ({ onDataExtracted, onClose }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'll help you create your event. Just describe your event in a few sentences, and I'll extract all the details. What event are you planning?"
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [isComplete, setIsComplete] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');

        // Add user message to chat
        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            // Prepare conversation history for API
            const conversationHistory = newMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await fetch(API_ENDPOINTS.AI_CREATE_EVENT_CONVERSATION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    conversation_history: conversationHistory.slice(0, -1) // Exclude the current message
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to process message');
            }

            const result = data.result;

            // Add AI response
            if (result.needs_clarification) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: result.question,
                    extracted: result.extracted_so_far,
                    missing: result.missing_fields
                }]);

                // Update extracted data preview
                if (result.extracted_so_far && Object.keys(result.extracted_so_far).length > 0) {
                    setExtractedData(result.extracted_so_far);
                }
            } else {
                // Event data is complete!
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: result.message || "Perfect! I've extracted all the event details. Review them below and click 'Use These Details' to proceed.",
                    isComplete: true
                }]);
                setExtractedData(result.event_data);
                setIsComplete(true);
            }

        } catch (error) {
            console.error('Conversation error:', error);
            toast.error(error.message || 'Failed to process your message');
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble processing that. Could you try rephrasing or providing more details?"
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleUseData = () => {
        if (extractedData) {
            onDataExtracted(extractedData);
            onClose();
            toast.success('Event details extracted! Review and adjust as needed.');
        }
    };

    const formatFieldName = (key) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const renderFieldValue = (key, value) => {
        if (Array.isArray(value)) {
            if (key === 'timeslots') {
                return (
                    <div className="space-y-1">
                        {value.map((slot, idx) => (
                            <div key={idx} className="text-xs bg-purple-50 p-2 rounded">
                                <div className="font-semibold">{slot.title || `Session ${idx + 1}`}</div>
                                <div className="text-purple-600">
                                    {new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleTimeString()}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }
            return value.join(', ');
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <FiMessageCircle className="text-blue-600" />
                            AI Event Creation Assistant
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Describe your event and I'll extract all the details
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl p-4 ${message.role === 'user'
                                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                                    : 'bg-white border border-slate-200 text-slate-800'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{message.content}</p>

                                {/* Show extracted fields preview */}
                                {message.extracted && Object.keys(message.extracted).length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                                        <div className="font-semibold text-blue-600 mb-1">Extracted so far:</div>
                                        {Object.entries(message.extracted).map(([key, value]) => (
                                            <div key={key} className="flex gap-2">
                                                <FiCheck className="text-green-500 mt-0.5" />
                                                <span className="font-medium">{formatFieldName(key)}:</span>
                                                <span className="text-slate-600">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-2">
                                <FiLoader className="animate-spin text-blue-600" />
                                <span className="text-slate-600">Thinking...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Extracted Data Preview */}
                {extractedData && Object.keys(extractedData).length > 0 && (
                    <div className="p-6 border-t border-slate-200 bg-gradient-to-br from-blue-50 to-purple-50">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FiEdit2 className="text-blue-600" />
                                Extracted Event Details
                            </h3>
                            {isComplete && (
                                <button
                                    onClick={handleUseData}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2"
                                >
                                    <FiCheck />
                                    Use These Details
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                            {Object.entries(extractedData).map(([key, value]) => (
                                <div key={key} className="bg-white p-3 rounded-lg border border-blue-200">
                                    <div className="text-xs font-semibold text-slate-600 mb-1">
                                        {formatFieldName(key)}
                                    </div>
                                    <div className="text-sm text-slate-800">
                                        {renderFieldValue(key, value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-6 border-t border-slate-200 bg-white">
                    <div className="flex gap-3">
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Describe your event or answer the question above..."
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows="2"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || isLoading}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <FiSend />
                            Send
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        💡 Tip: Include event name, date/time, location type, and venue for best results
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConversationalEventCreator;
