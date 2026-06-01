'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiSearch, FiFilter, FiEdit2, FiTrash2, FiExternalLink, FiPrinter, FiX, FiMapPin, FiCompass, FiInfo, FiCamera } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import AddMachineModal from '../../../components/AddMachineModal';
import EditMachineModal from '../../../components/EditMachineModal';

const MapComponentNoSSR = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface Machine {
  id: string;
  serialNumber: string;
  machineName: string;
  installationDate: string;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  amcStartDate: string | null;
  amcEndDate: string | null;
  customer: {
    companyName: string;
  };
  status: string;
  contractType: string;
  amount: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  imageUrl: string | null;
  probe1Model?: string; probe1Serial?: string;
  probe2Model?: string; probe2Serial?: string;
  probe3Model?: string; probe3Serial?: string;
  probe4Model?: string; probe4Serial?: string;
  probe5Model?: string; probe5Serial?: string;
  otherDevice?: string;
}

export default function MachineManagement() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof Machine | 'customer'>('machineName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [detailMachine, setDetailMachine] = useState<Machine | null>(null);

  useEffect(() => {
    fetchMachines();
  }, []);

  useEffect(() => {
    let result = [...machines];
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => 
        (m.machineName?.toLowerCase() || '').includes(q) ||
        (m.serialNumber?.toLowerCase() || '').includes(q) ||
        (m.customer?.companyName?.toLowerCase() || '').includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal: any = sortKey === 'customer' ? a.customer?.companyName : a[sortKey as keyof Machine];
      let bVal: any = sortKey === 'customer' ? b.customer?.companyName : b[sortKey as keyof Machine];
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredMachines(result);
  }, [search, machines, sortKey, sortOrder]);

  const fetchMachines = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/machines`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMachines(data);
      // Re-sync detailMachine if it is currently open, so Get Directions uses fresh coordinates
      setDetailMachine((prev) => {
        if (!prev) return null;
        const updated = data.find((m: Machine) => m.id === prev.id);
        return updated || prev;
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this installation?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/machines/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchMachines();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsEditModalOpen(true);
  };

  const toggleSort = (key: keyof Machine | 'customer') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (m: Machine) => {
    const isWarrantyExpired = m.warrantyEndDate && new Date(m.warrantyEndDate) < new Date();
    const needsNAMC = isWarrantyExpired && m.contractType === 'WARRANTY';
    
    if (needsNAMC) return <div className="flex flex-col gap-1">
      <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-rose-100">Action Required</span>
      <span className="text-[9px] font-bold text-rose-500 animate-pulse">Convert to NAMC</span>
    </div>;

    if (m.contractType === 'NAMC') return <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-blue-100 italic">NAMC ACTIVE</span>;
    
    return <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
      isWarrantyExpired ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
    }`}>
      {isWarrantyExpired ? 'Standard Support' : 'Active Warranty'}
    </span>;
  };

  const getServiceProgress = (m: any) => {
    const services = m.serviceSchedules || [];
    const completed = services.filter((s: any) => s.status === 'COMPLETED').length;
    return (
      <div className="flex flex-col gap-1 w-24">
        <div className="flex justify-between text-[9px] font-black text-slate-400">
          <span>SERVICE</span>
          <span>{completed}/4</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= completed ? 'bg-emerald-400' : 'bg-slate-100'}`}></div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Installations</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Track and manage all ultrasound machines deployed.</p>
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
            className="flex-1 sm:flex-none bg-blue-600 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-200 font-bold text-xs md:text-sm"
          >
            <FiPlus className="stroke-[3px] w-4 h-4" /> New Installation
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-center no-print">
        <div className="relative flex-1 group">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by serial, machine or hospital..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => toggleSort('serialNumber')}>Serial Number</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => toggleSort('machineName')}>Machine</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => toggleSort('customer')}>Hospital</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => toggleSort('installationDate')}>Install Date</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => toggleSort('warrantyEndDate')}>Warranty Until</th>
                <th className="px-6 py-4">Service Tracker</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 no-print text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Loading machines...</span>
                  </div>
                </td></tr>
              ) : filteredMachines.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">No records found.</td></tr>
              ) : (
                filteredMachines.map((m) => (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-all group">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{m.serialNumber}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{m.machineName}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{m.customer?.companyName || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(m.installationDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{m.warrantyEndDate ? new Date(m.warrantyEndDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4">{getServiceProgress(m)}</td>
                    <td className="px-6 py-4">{getStatusBadge(m)}</td>
                    <td className="px-6 py-4 text-right no-print">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(m)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit Installation"><FiEdit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete Installation"><FiTrash2 className="w-4 h-4" /></button>
                        <button onClick={() => setDetailMachine(m)} className="p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all" title="View Details"><FiExternalLink className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddMachineModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchMachines} 
      />

      <EditMachineModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSuccess={fetchMachines}
        machine={selectedMachine}
      />

      {/* Installation Detail Modal */}
      {detailMachine && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <FiInfo className="text-blue-600 animate-pulse" /> Installation Details
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                  SN: {detailMachine.serialNumber} | {detailMachine.machineName}
                </p>
              </div>
              <button 
                onClick={() => setDetailMachine(null)} 
                className="p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer"
              >
                <FiX className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {/* Photo Banner if exists */}
              {detailMachine.imageUrl ? (
                <div className="relative h-64 rounded-3xl overflow-hidden group shadow-md">
                  <img src={detailMachine.imageUrl} className="w-full h-full object-cover" alt="Installed Machine" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent flex items-end p-6">
                    <div>
                      <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full">Deployed Device</span>
                      <h3 className="text-lg font-bold text-white mt-1">{detailMachine.machineName}</h3>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-40 rounded-3xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <FiCamera className="w-8 h-8 text-slate-300" />
                  <span className="text-xs font-bold">No Installation Image Attached</span>
                </div>
              )}

              {/* Core Details Grid */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer / Hospital</h4>
                  <p className="text-sm font-bold text-slate-700">{detailMachine.customer?.companyName || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sale Amount</h4>
                  <p className="text-sm font-bold text-slate-700">{detailMachine.amount ? `₹${detailMachine.amount.toLocaleString()}` : 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contract Type</h4>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-blue-100 mt-1 inline-block">
                    {detailMachine.contractType}
                  </span>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deployment Date</h4>
                  <p className="text-sm font-bold text-slate-700">{new Date(detailMachine.installationDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Geolocation Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1 uppercase tracking-wider">
                    <FiMapPin className="text-blue-600" /> Physical Coordinates & Address
                  </h3>
                  {detailMachine.latitude && detailMachine.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${Number(detailMachine.latitude).toFixed(6)},${Number(detailMachine.longitude).toFixed(6)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <FiCompass /> Get Directions <FiExternalLink />
                    </a>
                  )}
                </div>

                {detailMachine.latitude && detailMachine.longitude ? (
                  <div className="space-y-3">
                    <div className="h-52 rounded-3xl overflow-hidden border border-slate-100 shadow-sm relative">
                      <MapComponentNoSSR
                        locations={[{
                          id: detailMachine.id,
                          name: detailMachine.machineName,
                          lat: Number(detailMachine.latitude),
                          lng: Number(detailMachine.longitude),
                          address: detailMachine.address
                        }]}
                        center={[Number(detailMachine.latitude), Number(detailMachine.longitude)]}
                        zoom={14}
                      />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-xs font-bold text-slate-500 flex justify-between">
                      <span>Latitude: {detailMachine.latitude}</span>
                      <span>Longitude: {detailMachine.longitude}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-28 rounded-3xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <FiMapPin className="w-6 h-6 text-slate-300" />
                    <span className="text-xs font-bold">No Map Location Pins Found</span>
                  </div>
                )}

                {detailMachine.address && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Manual Address Details</h4>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{detailMachine.address}</p>
                  </div>
                )}
              </div>

              {/* Probes and accessories details */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Device Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5].map(i => {
                    const model = (detailMachine as any)[`probe${i}Model`];
                    const serial = (detailMachine as any)[`probe${i}Serial`];
                    if (!model && !serial) return null;
                    return (
                      <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider mb-1">Probe Slot {i}</span>
                        <span className="text-xs font-bold text-slate-800">{model || 'Unknown Model'}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">SN: {serial || 'N/A'}</span>
                      </div>
                    );
                  })}
                </div>
                {detailMachine.otherDevice && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Other Deployed Accessories</h4>
                    <p className="text-xs font-bold text-slate-700 whitespace-pre-wrap">{detailMachine.otherDevice}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
              <button 
                onClick={() => {
                  setDetailMachine(null);
                  handleEdit(detailMachine);
                }} 
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-100"
              >
                <FiEdit2 /> Edit Record
              </button>
              <button 
                onClick={() => setDetailMachine(null)} 
                className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
