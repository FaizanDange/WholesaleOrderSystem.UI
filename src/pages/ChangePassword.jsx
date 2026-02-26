import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const ChangePassword = () => {
    const { logout } = useAuth();
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        if (passwords.newPassword !== passwords.confirmPassword) {
            setStatus({ type: 'error', message: 'Passwords do not match' });
            return;
        }

        if (passwords.newPassword.length < 6) {
            setStatus({ type: 'error', message: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        try {
            await api.post('/Auth/change-password', {
                newPassword: passwords.newPassword
            });

            setStatus({ type: 'success', message: 'Password updated! Redirecting to login...' });

            // Wait 2 seconds so user can see the success message, then force logout to re-login
            setTimeout(() => {
                logout();
            }, 2000);

        } catch (err) {
            setStatus({
                type: 'error',
                message: err.response?.data?.message || 'Failed to update password'
            });
            setLoading(false);
        }
    };

    return (
        <div className="main-content" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Security Settings</h1>
                <p style={{ color: 'var(--secondary)' }}>Enter your new password below. You will be logged out after update.</p>
            </header>

            <div className="glass-card" style={{ padding: '2.5rem', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: 'var(--primary)' }}>
                    <ShieldCheck size={24} />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Reset Account Password</h2>
                </div>

                {status.message && (
                    <div style={{
                        background: status.type === 'error' ? '#fee2e2' : '#dcfce7',
                        color: status.type === 'error' ? '#b91c1c' : '#166534',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                        <span>{status.message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>New Secure Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type={showNewPassword ? "text" : "password"}
                                className="form-input"
                                style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                                placeholder="Enter new password"
                                value={passwords.newPassword}
                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                {showNewPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                className="form-input"
                                style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                                placeholder="Repeat new password"
                                value={passwords.confirmPassword}
                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                {showConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : 'Set New Password & Logout'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
