

import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { XMarkIcon } from './Icons';
import { countryList } from '../constants';


interface AuthProps {
  initialView: 'sign_in' | 'sign_up';
  onClose: () => void;
  selectedPlan?: string | null;
}

type AuthView = 'sign_in' | 'sign_up';

const Auth: React.FC<AuthProps> = ({ initialView, onClose, selectedPlan }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);


  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (view === 'sign_in') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) {
          // This can happen if the user has not confirmed their email.
          throw new Error("Login failed. Please check your credentials and confirm your email.");
        }
        onClose();
      } else { // Sign Up
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    phone,
                    country,
                }
            }
        });
        if (error) throw error;
        
        // Profile creation is handled by a database trigger.
        setMessage("Success! Please check your email for a confirmation link.");
      }
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-panel rounded-2xl shadow-2xl border border-border w-full max-w-sm relative">
        <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close authentication form"
        >
            <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="p-8 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-center text-text-primary">
              {view === 'sign_in' ? 'Welcome Back' : `Create ${selectedPlan === 'pro' ? 'a Pro' : 'an'} Account`}
            </h2>
            <p className="text-center text-text-secondary mt-2">
              {view === 'sign_in' ? 'Sign in to continue.' : `Sign up to get started with your ${selectedPlan === 'pro' ? 'Pro' : 'Free'} plan.`}
            </p>
          </div>

          <div className="flex bg-background rounded-lg p-1 border border-border">
            <button
              onClick={() => { setView('sign_in'); setError(null); setMessage(null); }}
              className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'sign_in' ? 'bg-brand text-white' : 'text-text-secondary hover:bg-panel-light'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setView('sign_up'); setError(null); setMessage(null); }}
              className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'sign_up' ? 'bg-brand text-white' : 'text-text-secondary hover:bg-panel-light'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-text-secondary sr-only">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition duration-200 placeholder-text-secondary"
                required
              />
            </div>
            <div>
              <label htmlFor="password"className="text-sm font-medium text-text-secondary sr-only">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 characters)"
                className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition duration-200 placeholder-text-secondary"
                required
              />
            </div>
            {view === 'sign_up' && (
                <>
                    <div>
                        <label htmlFor="country" className="sr-only">Country</label>
                        <select
                            id="country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition duration-200 text-text-primary"
                            required
                        >
                            <option value="" disabled>Select your country...</option>
                            {countryList.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="phone" className="sr-only">Phone Number</label>
                        <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Phone number (optional)"
                            className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition duration-200 placeholder-text-secondary"
                        />
                    </div>
                </>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {loading ? 'Processing...' : (view === 'sign_in' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {message && <p className="text-green-400 text-sm text-center">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default Auth;