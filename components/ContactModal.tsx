import React, { useState, useEffect } from 'react';
import { Session, UserProfile } from '../types';
import * as adminService from '../services/adminService';
import { XMarkIcon, MailIcon } from './Icons';

interface ContactModalProps {
  onClose: () => void;
  session: Session | null;
  profile: UserProfile | null;
}

const ContactModal: React.FC<ContactModalProps> = ({ onClose, session, profile }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (profile?.email) {
            setEmail(profile.email);
            // Pre-fill name from email if name field is empty
            if (!name) {
                const nameFromEmail = profile.email.split('@')[0]
                    .replace(/[._0-9]/g, ' ') // Replace dots, underscores, numbers with space
                    .trim()
                    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
                setName(nameFromEmail);
            }
        }
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !subject.trim() || !message.trim()) {
            setError("Please fill out all required fields.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            await adminService.submitContactForm({ name, email, subject, message });
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-panel rounded-2xl shadow-2xl border border-border w-full max-w-lg relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors"
                    aria-label="Close contact form"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-block p-3 bg-brand/10 rounded-full">
                           <MailIcon className="w-10 h-10 text-brand" />
                        </div>
                        <h2 className="text-3xl font-bold text-text-primary">Contact Us</h2>
                        <p className="text-text-secondary">
                            Have a question or feedback? We'd love to hear from you.
                            <br />
                            You can also email us directly at{' '}
                            <a href="mailto:support@bestai.website" className="font-medium text-brand hover:underline">
                                support@bestai.website
                            </a>.
                        </p>
                    </div>

                    {success ? (
                        <div className="text-center p-6 bg-green-900/30 rounded-lg border border-green-700">
                            <h3 className="text-xl font-bold text-green-300">Message Sent!</h3>
                            <p className="text-green-400 mt-2">Thank you for reaching out. We'll get back to you as soon as possible.</p>
                            <button onClick={onClose} className="mt-4 px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover">Close</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="contact-name" className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                                    <input id="contact-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand" />
                                </div>
                                <div>
                                    <label htmlFor="contact-email" className="block text-sm font-medium text-text-secondary mb-1">Email <span className="text-red-400">*</span></label>
                                    <input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="contact-subject" className="block text-sm font-medium text-text-secondary mb-1">Subject <span className="text-red-400">*</span></label>
                                <input id="contact-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="How can we help?" required className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand" />
                            </div>
                            <div>
                                <label htmlFor="contact-message" className="block text-sm font-medium text-text-secondary mb-1">Message <span className="text-red-400">*</span></label>
                                <textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message..." required rows={5} className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand resize-y"></textarea>
                            </div>
                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-wait"
                            >
                                {loading ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactModal;