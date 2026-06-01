'use client';

import { useState } from 'react';
import { FiX, FiSave, FiPackage, FiMapPin, FiHash, FiGrid } from 'react-icons/fi';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddStockModal({ isOpen, onClose, onSuccess }: AddStockModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    stockId: '',
    machineName: '',
    category: 'MACHINE',
    quantity: '0',
    warehouseLocation: '',
    stockStatus: 'IN_STOCK',
    make: '',
    modelNumber: '',
    serialNumber: '',
    technicalSpecs: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/stock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.message || 'Error adding stock');
      }
    } catch (error) {
      console.error(error);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FiPackage className="text-blue-600" /> New Stock Entry
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <FiX className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Stock ID/SKU</label>
              <div className="relative">
                <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required
                  type="text" 
                  placeholder="e.g. US-800"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={formData.stockId}
                  onChange={(e) => setFormData({...formData, stockId: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Category</label>
              <div className="relative">
                <FiGrid className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="MACHINE">Machine</option>
                  <option value="SPARE_PART">Spare Part</option>
                  <option value="CONSUMABLE">Consumable</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Item Name</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Samsung V8 Ultrasound"
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-800"
              value={formData.machineName}
              onChange={(e) => setFormData({...formData, machineName: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Make / Brand</label>
              <input 
                type="text" 
                placeholder="e.g. Samsung, GE"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={formData.make}
                onChange={(e) => setFormData({...formData, make: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Model Number</label>
              <input 
                type="text" 
                placeholder="e.g. V8-Prime"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={formData.modelNumber}
                onChange={(e) => setFormData({...formData, modelNumber: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Serial Number (SN)</label>
            <input 
              type="text" 
              placeholder="e.g. SN-98234-X"
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-mono"
              value={formData.serialNumber}
              onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Technical Specs / Description</label>
            <textarea 
              placeholder="Technical specifications or additional details..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
              value={formData.technicalSpecs}
              onChange={(e) => setFormData({...formData, technicalSpecs: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Quantity</label>
              <input 
                required
                type="number" 
                min="0"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Warehouse Location</label>
              <div className="relative">
                <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Floor 2, Shelf A"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={formData.warehouseLocation}
                  onChange={(e) => setFormData({...formData, warehouseLocation: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3 sticky bottom-0 bg-white pb-2">
            <button 
              type="button" 
              onClick={onClose}
              className="w-full sm:flex-1 px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full sm:flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Saving...' : <><FiSave className="w-4 h-4" /> Save Stock</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

