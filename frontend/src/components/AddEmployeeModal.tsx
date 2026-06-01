'use client';

import { useState, useEffect } from 'react';
import { FiX, FiSave, FiUser, FiMail, FiLock, FiShield, FiPhone } from 'react-icons/fi';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit?: any;
}

export default function AddEmployeeModal({ isOpen, onClose, onSuccess, employeeToEdit }: AddEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'FIELD_EMPLOYEE',
    phone: '',
    designation: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (employeeToEdit) {
        setFormData({
          firstName: employeeToEdit.firstName || '',
          lastName: employeeToEdit.lastName || '',
          email: employeeToEdit.user?.email || '',
          password: '', // Password is not required when editing
          role: employeeToEdit.user?.role || 'FIELD_EMPLOYEE',
          phone: employeeToEdit.phone || '',
          designation: employeeToEdit.designation || ''
        });
      } else {
        // Reset form for adding new employee
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'FIELD_EMPLOYEE',
          phone: '',
          designation: ''
        });
      }
    }
  }, [isOpen, employeeToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      let res;
      if (employeeToEdit) {
        // Edit mode
        const payload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || null,
          designation: formData.designation || null
        };
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees/${employeeToEdit.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create mode
        const formattedEmail = formData.email.includes('@') ? formData.email.trim() : `${formData.email.trim()}@sonoray.com`;
        const payload = {
          ...formData,
          email: formattedEmail,
          designation: formData.designation || null,
          phone: formData.phone || null,
        };
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.message || (employeeToEdit ? 'Error updating employee' : 'Error adding employee'));
      }
    } catch (error) {
      console.error(error);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FiUser className="text-blue-600" /> {employeeToEdit ? 'Edit Team Member' : 'New Team Member'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <FiX className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">First Name</label>
              <input 
                required
                type="text" 
                placeholder="e.g. John"
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Last Name</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Doe"
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
          </div>

          {!employeeToEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username or Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. john"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required
                    type="password" 
                    placeholder="Minimum 6 chars"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone Number</label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required
                  type="tel" 
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            {!employeeToEdit && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">System Role</label>
                <div className="relative">
                  <FiShield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="FIELD_EMPLOYEE">Field Engineer</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="SERVICE_MANAGER">Service Manager</option>
                    <option value="SALES_MANAGER">Sales Manager</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Designation</label>
            <input 
              type="text" 
              placeholder="e.g. Senior Engineer"
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700"
              value={formData.designation}
              onChange={(e) => setFormData({...formData, designation: e.target.value})}
            />
          </div>

          <div className="pt-6 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all uppercase tracking-wider text-xs"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase tracking-wider text-xs flex items-center justify-center gap-2"
            >
              {loading ? (employeeToEdit ? 'Saving...' : 'Creating...') : <><FiSave /> {employeeToEdit ? 'Save Changes' : 'Add Employee'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
