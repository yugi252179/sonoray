'use client';

import { useEffect, useState } from 'react';
import AddStockModal from '../../../components/AddStockModal';
import EditStockModal from '../../../components/EditStockModal';
import { FiPlus, FiSearch, FiAlertTriangle, FiArrowUpRight, FiArrowDownRight, FiEdit2, FiPrinter, FiTrash2 } from 'react-icons/fi';

interface StockItem {
  id: string;
  machineName: string;
  make?: string;
  modelNumber?: string;
  serialNumber?: string;
  category: string;
  quantity: number;
  warehouseLocation: string;
  stockStatus: string;
}

export default function StockManagement() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [filteredStock, setFilteredStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof StockItem; direction: 'asc' | 'desc' } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'low'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetchStock();
  }, []);

  useEffect(() => {
    let result = [...stock];

    // Search Logic (with Null Checks)
    if (searchQuery) {
      result = result.filter(item =>
        (item.machineName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.make?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.modelNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.serialNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.category?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.warehouseLocation?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
    }

    // Filter Logic
    if (activeFilter === 'low') {
      result = result.filter(item => item.quantity < 5);
    }

    // Sort Logic
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = (a[sortConfig.key] || '').toString().toLowerCase();
        const bValue = (b[sortConfig.key] || '').toString().toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredStock(result);
  }, [searchQuery, stock, sortConfig, activeFilter]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/stock`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setStock(data);
      } else {
        console.error('Expected array but got:', data);
        setStock([]);
      }
    } catch (error) {
      console.error('Error fetching stock:', error);
      setStock([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof StockItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEdit = (item: StockItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/stock/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchStock();
      } else {
        const err = await res.json();
        alert(err.message || 'Error deleting item');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Network error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Machine & Spare Stock</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Live inventory tracking for Ultrasound systems and parts.</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-none px-3 md:px-5 py-2 md:py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all font-bold text-xs md:text-sm"
          >
            <FiPrinter className="w-4 h-4" /> <span className="hidden xs:inline">Print Report</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-200 font-medium text-xs md:text-sm"
          >
            <FiPlus className="stroke-[3px] w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => setActiveFilter('all')}
          className={`cursor-pointer p-6 rounded-2xl border transition-all ${activeFilter === 'all' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'}`}
        >
          <p className={`text-sm font-medium mb-1 ${activeFilter === 'all' ? 'text-blue-100' : 'text-slate-500'}`}>Total SKU Items</p>
          <p className="text-3xl font-bold">{stock.length}</p>
        </div>
        <div
          onClick={() => setActiveFilter('low')}
          className={`cursor-pointer p-6 rounded-2xl border transition-all ${activeFilter === 'low' ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white border-slate-100 shadow-sm hover:border-orange-200'}`}
        >
          <p className={`text-sm font-medium mb-1 ${activeFilter === 'low' ? 'text-orange-100' : 'text-slate-500'}`}>Low Stock Alerts</p>
          <p className="text-3xl font-bold">{stock.filter(s => s.quantity < 5).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
          <div className="relative w-full max-w-md group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, category or warehouse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            />
          </div>
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              className="text-sm text-blue-600 font-medium hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* ... keep table content same ... */}
            <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('machineName')}>Equipment Details</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('make')}>Make / Model</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('category')}>Category</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('warehouseLocation')}>Warehouse</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('quantity')}>Qty</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 no-print text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Loading inventory...</span>
                  </div>
                </td></tr>
              ) : filteredStock.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">No items match your search.</td></tr>
              ) : (
                filteredStock.map((s) => (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{s.machineName}</span>
                        <div className="flex gap-2 mt-0.5">
                          {s.serialNumber && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">SN: {s.serialNumber}</span>}
                          <span className="text-[9px] text-slate-400 uppercase">ID: {s.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{s.make || 'N/A'}</span>
                        <span className="text-[11px] text-slate-400">{s.modelNumber || 'Standard'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{s.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{s.warehouseLocation}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-lg ${s.quantity < 5 ? 'text-red-600' : 'text-slate-900'}`}>{s.quantity}</span>
                        {s.quantity < 5 && <FiAlertTriangle className="text-orange-500 w-4 h-4 animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tighter ${s.quantity > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                        {s.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right no-print">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(s)} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"><FiEdit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"><FiTrash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading...</div>
          ) : filteredStock.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No items found.</div>
          ) : (
            filteredStock.map((s) => (
              <div key={s.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">{s.machineName}</span>
                    <span className="text-[10px] text-slate-400">{s.make} | {s.modelNumber}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${s.quantity > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                    {s.quantity > 0 ? 'In Stock' : 'Out'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-400 uppercase font-bold text-[9px]">Warehouse</span>
                    <span className="text-slate-600">{s.warehouseLocation}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-slate-400 uppercase font-bold text-[9px]">Quantity</span>
                    <span className={`font-bold ${s.quantity < 5 ? 'text-red-600' : 'text-slate-900'}`}>{s.quantity} units</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => handleEdit(s)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><FiEdit2 className="w-3 h-3" /> Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="flex-1 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><FiTrash2 className="w-3 h-3" /> Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AddStockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchStock}
      />

      <EditStockModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchStock}
        item={selectedItem}
      />
    </div>
  );
}
