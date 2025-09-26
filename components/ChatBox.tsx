

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserProfile } from '../types';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon } from './Icons';

interface ChatBoxProps {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    profile: UserProfile;
    onClose: () => void;
    onSendMessage: (message: string) => void;
    chatCreditCost: number;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, isLoading, error, profile, onClose, onSendMessage, chatCreditCost }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading && profile.credits > 0) {
            onSendMessage(input);
            setInput('');
        }
    };

    const hasEnoughCredits = profile.credits > 0;

    return (
        <div className="fixed bottom-24 right-6 w-[90vw] max-w-md h-[70vh] max-h-[600px] z-50 flex flex-col animate-fade-in">
            <div className="bg-panel rounded-2xl shadow-2xl border border-border w-full h-full flex flex-col">
                {/* Header */}
                <header className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6 text-brand" />
                        <h2 className="text-lg font-bold text-text-primary">AI Assistant</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                        aria-label="Close chat"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Messages */}
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-brand flex-shrink-0 flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-white" /></div>}
                            <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl text-text-primary ${msg.role === 'user' ? 'bg-brand rounded-br-none' : 'bg-panel-light rounded-bl-none'}`}>
                                <p className="text-sm break-words">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-end gap-2 justify-start">
                            <div className="w-8 h-8 rounded-full bg-brand flex-shrink-0 flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-white animate-pulse" /></div>
                            <div className="max-w-sm px-4 py-2 rounded-2xl bg-panel-light rounded-bl-none text-text-primary">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-pulse"></span>
                                    <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-pulse [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-pulse [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border flex-shrink-0">
                    {error && <p className="text-red-400 text-xs text-center mb-2">{error}</p>}
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={hasEnoughCredits ? "Ask a question..." : "Out of credits"}
                            disabled={isLoading || !hasEnoughCredits}
                            className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand placeholder-text-secondary disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim() || !hasEnoughCredits}
                            className="p-3 bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Send message"
                        >
                            <PaperAirplaneIcon className="w-6 h-6" />
                        </button>
                    </form>
                     <p className="text-xs text-text-tertiary text-center mt-2">Each message costs {chatCreditCost} credit{chatCreditCost === 1 ? '' : 's'}.</p>
                </div>
            </div>
        </div>
    );
};

export default ChatBox;