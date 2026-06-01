'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  FiPackage, FiSearch, FiMapPin, FiCalendar, FiPlus,
  FiExternalLink, FiCompass, FiX, FiChevronDown, FiChevronUp,
  FiShield, FiCheckCircle
} from 'react-icons/fi';

const AddMachineModal = dynamic(() => import('@/components/AddMachineModal'), { ssr: false });

interface Machine {
  id: string;
  serialNumber: string;
  machineName: string;
  installationDate: string;
  status: string;
  contractType: string;
  warrantyEndDate: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  imageUrl: string | null;
  customer: {
    companyName: string;
    address: string;
    phone: string;
  } | null;
  manualCustomer: {
    companyName: string;
    address: string;
    phone: string;
  } | null;
}

const CONTRACT_COLORS: Record<string, string> = {
  WARRANTY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  AMC: 'bg-blue-50 text-blue-700 border-blue-200',
  CMC: 'bg-purple-50 text-purple-700 border-purple-200',
  NAMC: 'bg-orange-50 text-orange-700 border-orange-200',
  NONE: 'bg-slate-50 text-slate-500 border-slate-200',
};

export default function EmployeeInstallations() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchMachines(); }, []);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/machines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setMachines(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = machines.filter(m => {
    const q = search.toLowerCase();
    const customer = m.customer || m.manualCustomer;
    return (
      m.serialNumber.toLowerCase().includes(q) ||
      m.machineName.toLowerCase().includes(q) ||
      (customer?.companyName || '').toLowerCase().includes(q) ||
      (m.address || '').toLowerCase().includes(q)
    );
  });

  const customerName = (m: Machine) =>
    m.customer?.companyName || m.manualCustomer?.companyName || 'N/A';
  const customerAddress = (m: Machine) =>
    m.address || m.customer?.address || m.manualCustomer?.address || '';

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Installations</h1>
          <p className="text-slate-500 text-sm mt-1">All machine installations. Updates reflect for admin in real-time.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 shrink-0"
        >
          <FiPlus className="stroke-[3px]" /> Add New
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by serial, model, hospital..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
        {[
          { label: 'Total', count: machines.length, color: 'bg-slate-700' },
          { label: 'Warranty', count: machines.filter(m => m.contractType === 'WARRANTY').length, color: 'bg-emerald-600' },
          { label: 'AMC/CMC', count: machines.filter(m => ['AMC','CMC','NAMC'].includes(m.contractType)).length, color: 'bg-blue-600' },
        ].map(s => (
          <div key={s.label} className={`${s.color} text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold shrink-0`}>
            <FiPackage className="w-3.5 h-3.5" />
            <span>{s.count} {s.label}</span>
          </div>
        ))}
      </div>

      {/* Machine List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
          <FiPackage className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No installations found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(machine => {
            const isExpanded = expandedId === machine.id;
            const customer = customerName(machine);
            const address = customerAddress(machine);
            return (
              <div key={machine.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Collapsed row */}
                <button
                  className="w-full text-left p-4 flex items-center gap-4"
                  onClick={() => setExpandedId(isExpanded ? null : machine.id)}
                >
                  {machine.imageUrl ? (
                    <img src={machine.imageUrl} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100" alt="" />
                  ) : (
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <FiPackage className="text-blue-400 w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${CONTRACT_COLORS[machine.contractType] || CONTRACT_COLORS.NONE}`}>
                        {machine.contractType}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{machine.machineName}</p>
                    <p className="text-xs text-slate-400 font-mono">{machine.serialNumber}</p>
                  </div>

                  <div className="text-right shrink-0 mr-1">
                    <p className="text-xs font-semibold text-slate-700 line-clamp-1 max-w-28">{customer}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(machine.installationDate).toLocaleDateString()}
                    </p>
                  </div>

                  {isExpanded ? (
                    <FiChevronUp className="text-slate-300 w-4 h-4 shrink-0" />
                  ) : (
                    <FiChevronDown className="text-slate-300 w-4 h-4 shrink-0" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-4 space-y-3 bg-slate-50/50 animate-in slide-in-from-top-1 duration-200">

                    {machine.imageUrl && (
                      <img src={machine.imageUrl} className="w-full max-h-48 object-cover rounded-xl border border-slate-100" alt="Machine" />
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hospital / Customer</p>
                        <p className="text-sm font-bold text-slate-800">{customer}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Installed On</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                          <FiCalendar className="text-blue-500 w-3 h-3" />
                          {new Date(machine.installationDate).toLocaleDateString()}
                        </p>
                      </div>
                      {machine.warrantyEndDate && (
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Warranty Ends</p>
                          <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                            <FiShield className="text-emerald-500 w-3 h-3" />
                            {new Date(machine.warrantyEndDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                          <FiCheckCircle className="text-blue-500 w-3 h-3" />
                          {machine.status || 'Active'}
                        </p>
                      </div>
                    </div>

                    {address && (
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <FiMapPin className="text-blue-500" /> Location
                        </p>
                        <p className="text-xs text-slate-700">{address}</p>
                        {machine.latitude && machine.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${Number(machine.latitude).toFixed(6)},${Number(machine.longitude).toFixed(6)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase hover:underline"
                          >
                            <FiCompass /> Get Directions <FiExternalLink />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddMachineModal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); fetchMachines(); }}
        />
      )}
    </div>
  );
}
