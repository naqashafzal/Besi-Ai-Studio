import React, { useState, useEffect } from 'react';
import { KeyIcon } from '../Icons';
import { PaymentSettings } from '../../types';

interface PaymentSettingsTabProps {
    settings: PaymentSettings | null;
    onUpdateSettings: (updates: Partial<PaymentSettings>) => Promise<void>;
}

const PaymentSettingsTab: React.FC<PaymentSettingsTabProps> = ({ settings, onUpdateSettings }) => {
    const [stripePublicKey, setStripePublicKey] = useState('');
    const [stripeSecretKey, setStripeSecretKey] = useState('');
    const [paypalClientId, setPaypalClientId] = useState('');
    const [manualInstructions, setManualInstructions] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (settings) {
            setStripePublicKey(settings.stripe_public_key || '');
            setStripeSecretKey(settings.stripe_secret_key || '');
            setPaypalClientId(settings.paypal_client_id || '');
            setManualInstructions(settings.manual_payment_instructions_pk || '');
        }
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdateSettings({
                stripe_public_key: stripePublicKey,
                stripe_secret_key: stripeSecretKey,
                paypal_client_id: paypalClientId,
                manual_payment_instructions_pk: manualInstructions,
            });
            alert("Payment settings updated successfully!");
        } catch (error) {
            alert("Failed to update payment settings. See console for details.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                 <KeyIcon className="w-8 h-8 text-brand" />
                 <h3 className="text-2xl font-bold text-text-primary">Payment Integration</h3>
            </div>
            
            <div className="space-y-8">
                {/* PayPal Settings */}
                <div className="bg-background p-6 rounded-lg border border-border">
                    <h4 className="text-xl font-semibold text-text-primary mb-1">PayPal Configuration</h4>
                    <p className="text-sm text-text-secondary mb-4">
                        Enable payments for international users. Find keys on the <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="text-brand underline">PayPal Developer Dashboard</a>.
                    </p>
                    <label htmlFor="paypal-client-id" className="block text-sm font-medium text-text-secondary mb-1">Client ID</label>
                    <input
                        id="paypal-client-id"
                        type="text"
                        value={paypalClientId}
                        onChange={e => setPaypalClientId(e.target.value)}
                        placeholder="AbC123..."
                        className="w-full p-2 bg-panel-light border border-border rounded-lg"
                    />
                </div>

                {/* Manual Payment for Pakistan */}
                <div className="bg-background p-6 rounded-lg border border-border">
                    <h4 className="text-xl font-semibold text-text-primary mb-1">Manual Payments (Pakistan)</h4>
                     <p className="text-sm text-text-secondary mb-4">
                        Provide instructions for users in Pakistan to pay manually (e.g., bank transfer, local payment apps).
                    </p>
                    <label htmlFor="manual-instructions-pk" className="block text-sm font-medium text-text-secondary mb-1">Payment Instructions</label>
                    <textarea
                        id="manual-instructions-pk"
                        value={manualInstructions}
                        onChange={e => setManualInstructions(e.target.value)}
                        placeholder="e.g., Please transfer to Bank Account: ... and send screenshot to ..."
                        className="w-full p-2 h-32 bg-panel-light border border-border rounded-lg resize-y"
                    />
                </div>
                
                 {/* Stripe Settings */}
                 <div className="bg-background p-6 rounded-lg border border-border">
                    <h4 className="text-xl font-semibold text-text-primary mb-1">Stripe Configuration</h4>
                    <p className="text-sm text-text-secondary mb-4">
                        Enter your Stripe API keys. You can find your keys on the <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-brand underline">Stripe Dashboard</a>.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="stripe-public-key" className="block text-sm font-medium text-text-secondary mb-1">Public Key</label>
                            <input
                                id="stripe-public-key"
                                type="text"
                                value={stripePublicKey}
                                onChange={e => setStripePublicKey(e.target.value)}
                                placeholder="pk_test_..."
                                className="w-full p-2 bg-panel-light border border-border rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="stripe-secret-key" className="block text-sm font-medium text-text-secondary mb-1">Secret Key</label>
                            <input
                                id="stripe-secret-key"
                                type="password"
                                value={stripeSecretKey}
                                onChange={e => setStripeSecretKey(e.target.value)}
                                placeholder="sk_test_..."
                                className="w-full p-2 bg-panel-light border border-border rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-right">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save All Payment Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSettingsTab;