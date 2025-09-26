import React from 'react';

interface FooterProps {
  onContactClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ onContactClick }) => (
  <footer className="text-center mt-12 py-6 text-text-tertiary border-t border-border">
    <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
      <p>&copy; {new Date().getFullYear()} BestAI Portrait Generator. Powered By 🇵🇰.</p>
      <nav className="flex gap-4 mt-4 sm:mt-0">
          <button onClick={onContactClick} className="hover:text-text-secondary transition-colors text-sm font-medium">Contact Us</button>
      </nav>
    </div>
  </footer>
);

export default Footer;