'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SonorayLogo from '@/components/SonorayLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // Load saved email on mount
  useEffect(() => {
    const saved = localStorage.getItem('remembered_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formattedEmail = email.trim();
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formattedEmail, password })
      });
      if (res.ok) {
        const data = await res.json();
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('remembered_email', formattedEmail);
        } else {
          localStorage.removeItem('remembered_email');
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.employeeId) {
          localStorage.setItem('employeeId', data.user.employeeId);
        }
        if (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') {
          router.push('/admin');
        } else {
          router.push('/employee/attendance');
        }
      } else {
        const err = await res.json();
        setError(err.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Unable to connect to server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      }}
    >
      {/* Animated background blobs */}
      <div style={{
        position: 'absolute', top: '-120px', left: '-120px',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        borderRadius: '50%', animation: 'pulse 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', right: '-100px',
        width: '450px', height: '450px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
        borderRadius: '50%', animation: 'pulse 8s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '10%',
        width: '200px', height: '200px',
        background: 'radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 70%)',
        borderRadius: '50%', animation: 'pulse 5s ease-in-out infinite',
      }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.15);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .login-card { animation: fadeUp 0.6s cubic-bezier(.22,1,.36,1) both; }
        .input-field:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.15); border-color: #3b82f6 !important; }
        .btn-login:active { transform: scale(0.98); }
        .spinner { animation: spin 0.8s linear infinite; }

        @media (max-width: 480px) {
          .login-card {
            margin-left: 12px !important;
            margin-right: 12px !important;
          }
          .login-card > div {
            padding: 36px 20px !important;
            border-radius: 20px !important;
          }
          .input-field {
            padding-top: 12px !important;
            padding-bottom: 12px !important;
            font-size: 13px !important;
          }
          .btn-login {
            padding: 14px !important;
            font-size: 14px !important;
          }
        }
      `}</style>

      <div className="login-card relative z-10 w-full max-w-md mx-4">
        {/* White Corporate Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '44px 40px',
          boxShadow: '0 20px 40px rgba(15,23,42,0.06)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <SonorayLogo size="md" className="w-full max-w-[160px]" />
            </div>
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Field Service Platform
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
              color: '#dc2626', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Username or Email */}
            <div>
              <label style={{ display: 'block', color: '#475569', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Username or Email
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Username (e.g. admin)"
                  className="input-field"
                  style={{
                    width: '100%', paddingLeft: '44px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '12px', color: '#0f172a', fontSize: '14px', outline: 'none',
                    transition: 'all 0.2s', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', color: '#475569', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••"
                  className="input-field"
                  style={{
                    width: '100%', paddingLeft: '44px', paddingRight: '46px', paddingTop: '14px', paddingBottom: '14px',
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '12px', color: '#0f172a', fontSize: '14px', outline: 'none',
                    transition: 'all 0.2s', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showPass ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <label
                htmlFor="rememberMe"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  style={{
                    width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                    background: rememberMe ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f8fafc',
                    border: rememberMe ? '2px solid #1d4ed8' : '2px solid #cbd5e1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', cursor: 'pointer',
                  }}
                >
                  {rememberMe && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <span style={{ color: '#475569', fontSize: '13px', fontWeight: 600, userSelect: 'none' }}>
                  Remember me
                </span>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-login"
              style={{
                width: '100%', padding: '15px',
                background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontSize: '15px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(37,99,235,0.25)',
                marginTop: '6px',
              }}
            >
              {loading ? (
                <>
                  <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', marginTop: '24px', fontWeight: 600 }}>
            © 2026 Sonoray ERP · Secure Gateway
          </p>
        </div>
      </div>
    </div>
  );
}
