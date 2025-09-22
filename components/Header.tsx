
import React from 'react';
import { Session, UserProfile, VisitorProfile, Plan } from '../types';
import { supabase } from '../services/supabaseClient';
import { CreditIcon, LogoutIcon, UserIcon, StarIcon, KeyIcon } from './Icons';

interface HeaderProps {
  session: Session | null;
  profile: UserProfile | null;
  visitorProfile: VisitorProfile | null;
  proPlan: Plan | undefined;
  onSignUpClick: () => void;
  onLoginClick: () => void;
  onUpgradeClick: () => void;
  onAdminPanelClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  session,
  profile,
  visitorProfile,
  proPlan,
  onSignUpClick,
  onLoginClick,
  onUpgradeClick,
  onAdminPanelClick,
}) => {
  return (
    <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 md:mb-12 gap-6">
      <div className="text-center md:text-left">
        <div className="inline-flex flex-col items-center md:items-start">
            <img 
                src="https://zsdecor.pk/wp-content/uploads/2025/09/1.png" 
                alt="BestAI Logo" 
                className="h-16 w-auto"
            />
            <p className="mt-1 text-lg text-brand font-medium">Portrait Generator</p>
        </div>
        <p className="mt-4 text-lg text-text-secondary">Create professional headshots and sci-fi characters from your photos.</p>
      </div>
      {session && profile ? (
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-panel p-3 rounded-lg border border-border self-center text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3 px-2">
            <CreditIcon className="w-8 h-8 text-brand-secondary" />
            <div>
              <p className="text-xs text-text-secondary font-semibold">CREDITS</p>
              <p className="text-2xl font-bold text-text-primary">{profile.credits}</p>
            </div>
          </div>
          <div className="w-full sm:w-px h-px sm:h-10 bg-border"></div>
          <div className="px-2">
            <p className="text-xs text-text-secondary font-semibold">PLAN</p>
            <p className={`text-lg font-bold capitalize ${profile.plan === 'pro' ? 'text-brand-secondary' : 'text-text-primary'}`}>{profile.plan}</p>
          </div>
          {profile.plan === 'free' && proPlan && (
            <button
              onClick={onUpgradeClick}
              className="flex items-center justify-center px-4 py-2 bg-brand-secondary/20 text-brand-secondary font-semibold rounded-md hover:bg-brand-secondary/30 transition-colors text-sm"
              aria-label="Upgrade to Pro"
              title="Upgrade to Pro Plan"
            >
              <StarIcon className="w-4 h-4 mr-2" />
              Upgrade
            </button>
          )}
          {profile.role === 'admin' && (
            <button
              onClick={onAdminPanelClick}
              className="flex items-center justify-center px-4 py-2 bg-panel-light text-text-primary font-semibold rounded-md hover:bg-border transition-colors text-sm"
              aria-label="Open Admin Panel"
              title="Open Admin Panel (Ctrl+Alt+A)"
            >
              <KeyIcon className="w-4 h-4 mr-2" />
              Admin
            </button>
          )}
          <div className="w-full sm:w-px h-px sm:h-10 bg-border"></div>
          <div className="flex items-center justify-center sm:justify-start gap-3 px-2">
            <div className="flex-grow">
              <p className="text-xs text-text-secondary font-semibold truncate max-w-28" title={profile.email ?? 'No Email'}>{profile.email}</p>
              <button onClick={() => supabase.auth.signOut()} className="text-sm text-brand font-semibold hover:underline">
                Logout
              </button>
            </div>
            <LogoutIcon className="w-7 h-7 text-text-secondary" />
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center gap-3 self-center">
          <div className="flex items-center gap-2 bg-panel p-2 rounded-lg border border-border w-full sm:w-auto justify-center">
            <CreditIcon className="w-6 h-6 text-brand-secondary" />
            <p className="font-semibold text-text-primary">{visitorProfile?.credits ?? 0} <span className="text-text-secondary text-sm">Daily Credits</span></p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onLoginClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-panel-light text-text-primary font-semibold rounded-lg hover:bg-border transition-colors"
            >
              <UserIcon className="w-5 h-5" />
              Login
            </button>
            <button
              onClick={onSignUpClick}
              className="w-full sm:w-auto px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover transition-colors"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
