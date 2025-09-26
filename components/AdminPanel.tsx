import React, { useState } from 'react';
import { XMarkIcon } from './Icons';
import { PromptCategory, UserProfile, Plan, PaymentSettings, PlanCountryPrice, Coupon, CreditCostSettings } from '../types';

import UserManagementTab from './admin/UserManagementTab';
import PromptManagementTab from './admin/PromptManagementTab';
import SettingsTab from './admin/SettingsTab';
import PaymentSettingsTab from './admin/PaymentSettingsTab';
import CouponManagementTab from './admin/CouponManagementTab';
import ManualPaymentTab from './admin/ManualPaymentTab';

type AdminTab = 'users' | 'prompts' | 'settings' | 'payments' | 'manual_payments' | 'coupons';

interface AdminPanelProps {
  allUsers: UserProfile[];
  plans: Plan[];
  prompts: PromptCategory[];
  paymentSettings: PaymentSettings | null;
  planCountryPrices: PlanCountryPrice[];
  coupons: Coupon[];
  creditCostSettings: CreditCostSettings | null;
  onAddPrompt: (prompt: { text: string; imageFile: File | null }, categoryTitle: string) => void;
  onRemovePrompt: (promptId: string) => void;
  onUpdatePrompt: (promptId: string, updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean }, originalImageUrl: string | null) => void;
  onUpdateUser: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onUpdatePlan: (planId: number, updates: Partial<Plan>) => Promise<void>;
  onUpdatePaymentSettings: (updates: Partial<PaymentSettings>) => Promise<void>;
  onAddPlanCountryPrice: (price: Omit<PlanCountryPrice, 'id'>) => Promise<void>;
  onUpdatePlanCountryPrice: (priceId: number, updates: Partial<PlanCountryPrice>) => Promise<void>;
  onDeletePlanCountryPrice: (priceId: number) => Promise<void>;
  onUpdateCreditCostSettings: (updates: Partial<Omit<CreditCostSettings, 'id'>>) => Promise<void>;
  onAddCoupon: (couponData: Omit<Coupon, 'id' | 'created_at' | 'times_used'>) => Promise<void>;
  onUpdateCoupon: (couponId: number, updates: Partial<Coupon>) => Promise<void>;
  onDeleteCoupon: (couponId: number) => Promise<void>;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    allUsers,
    plans,
    prompts, 
    paymentSettings,
    planCountryPrices,
    coupons,
    creditCostSettings,
    onAddPrompt, 
    onRemovePrompt, 
    onUpdatePrompt,
    onUpdateUser,
    onDeleteUser,
    onUpdatePlan,
    onUpdatePaymentSettings,
    onAddPlanCountryPrice,
    onUpdatePlanCountryPrice,
    onDeletePlanCountryPrice,
    onUpdateCreditCostSettings,
    onAddCoupon,
    onUpdateCoupon,
    onDeleteCoupon,
    onClose 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-panel rounded-2xl shadow-2xl border border-border w-full max-w-6xl h-[90vh] flex flex-col">
        <header className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Admin Dashboard</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close admin panel"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
        </header>

        <div className="flex flex-shrink-0 border-b border-border overflow-x-auto">
            <TabButton name="Users" tab="users" activeTab={activeTab} onClick={setActiveTab} />
            <TabButton name="Prompts" tab="prompts" activeTab={activeTab} onClick={setActiveTab} />
            <TabButton name="Settings" tab="settings" activeTab={activeTab} onClick={setActiveTab} />
            <TabButton name="Payments" tab="payments" activeTab={activeTab} onClick={setActiveTab} />
            <TabButton name="Manual Payments" tab="manual_payments" activeTab={activeTab} onClick={setActiveTab} />
            <TabButton name="Coupons" tab="coupons" activeTab={activeTab} onClick={setActiveTab} />
        </div>

        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
          {activeTab === 'users' && <UserManagementTab users={allUsers} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} />}
          {activeTab === 'prompts' && <PromptManagementTab prompts={prompts} onAddPrompt={onAddPrompt} onRemovePrompt={onRemovePrompt} onUpdatePrompt={onUpdatePrompt} />}
          {activeTab === 'settings' && <SettingsTab 
                                            plans={plans} 
                                            onUpdatePlan={onUpdatePlan}
                                            planCountryPrices={planCountryPrices}
                                            onAddPlanCountryPrice={onAddPlanCountryPrice}
                                            onUpdatePlanCountryPrice={onUpdatePlanCountryPrice}
                                            onDeletePlanCountryPrice={onDeletePlanCountryPrice}
                                            creditCostSettings={creditCostSettings}
                                            onUpdateCreditCostSettings={onUpdateCreditCostSettings}
                                        />}
          {activeTab === 'payments' && <PaymentSettingsTab settings={paymentSettings} onUpdateSettings={onUpdatePaymentSettings} />}
          {activeTab === 'manual_payments' && <ManualPaymentTab users={allUsers} />}
          {activeTab === 'coupons' && <CouponManagementTab 
                                            coupons={coupons}
                                            onAddCoupon={onAddCoupon}
                                            onUpdateCoupon={onUpdateCoupon}
                                            onDeleteCoupon={onDeleteCoupon}
                                        />}
        </div>
      </div>
    </div>
  );
};

// --- Tab Button Component ---
interface TabButtonProps {
    name: string;
    tab: AdminTab;
    activeTab: AdminTab;
    onClick: (tab: AdminTab) => void;
}
const TabButton: React.FC<TabButtonProps> = ({ name, tab, activeTab, onClick }) => (
    <button
        onClick={() => onClick(tab)}
        className={`px-4 sm:px-6 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 whitespace-nowrap ${
            activeTab === tab 
            ? 'border-brand text-brand'
            : 'border-transparent text-text-secondary hover:text-text-primary'
        }`}
    >
        {name}
    </button>
);

export default AdminPanel;