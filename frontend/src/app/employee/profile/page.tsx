'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiMail, FiPhone, FiLock, FiCheckCircle, FiShield, FiBriefcase } from 'react-icons/fi';

export default function ProfilePage() {
  const [user, setUser] = useState<any>({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(savedUser);
    
    if (savedUser.employee) {
      setFirstName(savedUser.employee.firstName || '');
      setLastName(savedUser.employee.lastName || '');
      setPhone(savedUser.employee.phone || '');
      setProfileImage(savedUser.employee.profileImage || '');
    } else {
      // Fallback for user record without linked employee details
      const nameParts = (savedUser.email || '').split('@')[0].split('.');
      setFirstName(nameParts[0] || 'User');
      setLastName(nameParts[1] || '');
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          profileImage,
          ...(password ? { password } : {})
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Sync local storage so header/sidebar updates in real-time
        const currentSavedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...currentSavedUser,
          employee: {
            ...currentSavedUser.employee,
            firstName: data.user.employee?.firstName || firstName,
            lastName: data.user.employee?.lastName || lastName,
            phone: data.user.employee?.phone || phone,
            profileImage: data.user.employee?.profileImage || profileImage
          }
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Trigger storage event so other components receive the updates immediately
        window.dispatchEvent(new Event('storage'));
        
        setSuccess('Profile updated successfully');
        setPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to update profile');
      }
    } catch {
      setError('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfileImage(data.url);
        setSuccess('Image uploaded! Click "Save Profile Settings" to apply.');
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to upload image');
      }
    } catch (err) {
      setError('Network error during upload');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-[#f8fafc] flex items-center justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .profile-card { animation: fadeUp 0.6s cubic-bezier(.22,1,.36,1) both; }
        .input-group:focus-within { border-color: #3b82f6 !important; box-shadow: 0 0 0 4px rgba(59,130,246,0.1) !important; }
      `}</style>

      <div className="profile-card w-full max-w-2xl bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        {/* Decorative Header Block */}
        <div className="p-8 md:p-10 text-white flex flex-col md:flex-row items-center gap-6" style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
        }}>
          <label 
            className="w-20 h-20 rounded-2xl bg-blue-600/30 border border-blue-500/20 flex items-center justify-center font-black text-2xl shadow-lg shadow-black/10 overflow-hidden cursor-pointer group relative block"
            title="Click to change image"
          >
            {profileImage ? (
              <img 
                src={profileImage} 
                alt="Profile" 
                className="w-full h-full object-cover" 
                onError={() => { setProfileImage(''); }}
              />
            ) : (
              <>{firstName?.[0] || 'U'}{lastName?.[0] || 'R'}</>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Upload</span>
            </div>
            <input 
              type="file" 
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </label>
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{firstName} {lastName}</h1>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1 flex items-center justify-center md:justify-start gap-1.5">
              <FiBriefcase className="w-3.5 h-3.5" />
              {user.employee?.designation || 'Field Specialist'}
            </p>
          </div>
          <div className="md:ml-auto flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/15">
            <FiShield className="text-emerald-400 w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">{user.role}</span>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleUpdate} className="p-8 md:p-10 space-y-6">
          {success && (
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-semibold animate-in fade-in duration-300">
              <FiCheckCircle className="w-5 h-5 shrink-0" />
              {success}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold animate-in fade-in duration-300">
              <FiCheckCircle className="w-5 h-5 shrink-0 rotate-45" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
              <div className="input-group relative flex items-center border border-slate-200 rounded-2xl bg-slate-50/50 transition-all">
                <FiUser className="absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none rounded-2xl text-sm font-bold text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
              <div className="input-group relative flex items-center border border-slate-200 rounded-2xl bg-slate-50/50 transition-all">
                <FiUser className="absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none rounded-2xl text-sm font-bold text-slate-700 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Address - Disabled */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address (Managed)</label>
              <div className="relative flex items-center border border-slate-100 rounded-2xl bg-slate-100/50 pointer-events-none cursor-not-allowed">
                <FiMail className="absolute left-4 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none rounded-2xl text-sm font-bold text-slate-400 outline-none"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
              <div className="input-group relative flex items-center border border-slate-200 rounded-2xl bg-slate-50/50 transition-all">
                <FiPhone className="absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none rounded-2xl text-sm font-bold text-slate-700 outline-none"
                />
              </div>
            </div>
          </div>


          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Profile Image</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="input-group relative flex flex-1 items-center border border-slate-200 rounded-2xl bg-slate-50/50 transition-all">
                <FiUser className="absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="url"
                  value={profileImage}
                  onChange={e => setProfileImage(e.target.value)}
                  placeholder="https://example.com/my-photo.jpg"
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none rounded-2xl text-sm font-bold text-slate-700 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200 disabled:opacity-50 whitespace-nowrap"
              >
                {uploadingImage ? 'Uploading...' : 'Upload from Device'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 my-4"></div>
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-600">Change Password</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* New Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Password</label>
              <div className="input-group relative flex items-center border border-slate-200 rounded-2xl bg-slate-50/50 transition-all">
                <FiLock className="absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none rounded-2xl text-sm font-bold text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
              <div className="input-group relative flex items-center border border-slate-200 rounded-2xl bg-slate-50/50 transition-all">
                <FiLock className="absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-transparent border-none rounded-2xl text-sm font-bold text-slate-700 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 sticky bottom-0 bg-white">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Saving Changes...' : 'Save Profile Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
