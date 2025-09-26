import React, { useState, useMemo } from 'react';
import { UserProfile } from '../../types';

interface ManualPaymentTabProps {
    users: UserProfile[];
}

const ManualPaymentTab: React.FC<ManualPaymentTabProps> = ({ users }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const proUsers = useMemo(() =>
        users.filter(user =>
            user.plan === 'pro' && user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(b.credits_reset_at).getTime() - new Date(a.credits_reset_at).getTime()),
    [users, searchTerm]);

    return (
        <div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">Confirm Manual Payments</h3>
            <p className="text-text-secondary mb-6 max-w-3xl">
                This tab lists all users currently on the "Pro" plan. Use this list to verify against your bank transfers or other manual payment records. If you find a user who has not paid, you can downgrade their plan or adjust their credits in the <strong className="text-text-primary">'Users'</strong> tab.
            </p>

            <input
                type="text"
                placeholder="Search Pro users by email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full max-w-md p-2 mb-6 bg-background border border-border rounded-lg"
            />

            <div className="border border-border rounded-lg overflow-x-auto">
                <div className="grid grid-cols-[2fr_1fr] md:grid-cols-[3fr_1fr] gap-4 p-3 bg-panel-light text-xs text-text-secondary uppercase tracking-wider font-bold min-w-[400px]">
                    <div>User Email</div>
                    <div>Pro Since / Last Renewal</div>
                </div>
                <div className="min-w-[400px]">
                    {proUsers.length > 0 ? (
                        proUsers.map(user => (
                            <div key={user.id} className="p-4 border-b border-border last:border-b-0 grid grid-cols-[2fr_1fr] md:grid-cols-[3fr_1fr] gap-4 items-center text-sm">
                                <div className="text-text-primary font-medium break-all">{user.email}</div>
                                <div className="text-text-secondary">
                                    {new Date(user.credits_reset_at).toLocaleString()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-text-secondary">
                            No Pro users found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManualPaymentTab;
