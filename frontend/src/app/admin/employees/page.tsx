'use client';

import { useEffect, useState } from 'react';
import { FiUserPlus, FiMail, FiPhone, FiTag, FiMoreVertical, FiSearch, FiCalendar, FiClock, FiTrash2, FiEdit2 } from 'react-icons/fi';
import AddEmployeeModal from '../../../components/AddEmployeeModal';
import EmployeeProfileModal from '../../../components/EmployeeProfileModal';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  department?: {
    id: string;
    name: string;
  };
  phone: string;
  user: {
    id: string;
    email: string;
    role: string;
  }
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<any>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (search) {
      const q = search.toLowerCase();
      setFilteredEmployees(employees.filter(emp => 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
        emp.user.email.toLowerCase().includes(q) ||
        (emp.department?.name.toLowerCase() || '').includes(q)
      ));
    } else {
      setFilteredEmployees(employees);
    }
  }, [search, employees]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) fetchEmployees();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteEmployee = async (employeeId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${name}? This will remove all their data, attendance, and records.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEmployees();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete employee');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting employee');
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">HR & Employee Directory</h1>
          <p className="text-slate-500 mt-1">Manage team roles, access, and performance tracking.</p>
        </div>
        <button 
          onClick={() => {
            setEmployeeToEdit(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-200 font-bold"
        >
          <FiUserPlus className="stroke-[3px]" /> Add Employee
        </button>
      </div>

      <div className="relative group max-w-md">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Search by name, email or department..." 
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/5 transition-all outline-none text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50 h-64 animate-pulse flex flex-col gap-4">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-full bg-slate-100"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                </div>
              </div>
              <div className="space-y-3 pt-4">
                <div className="h-4 bg-slate-50 rounded"></div>
                <div className="h-4 bg-slate-50 rounded"></div>
              </div>
            </div>
          ))
        ) : filteredEmployees.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest">No Employees Found</div>
        ) : (
          filteredEmployees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all relative group overflow-hidden">
              <button className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors">
                <FiMoreVertical className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl border border-blue-100">
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{emp.firstName} {emp.lastName}</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-blue-600 text-white rounded-md uppercase tracking-tighter shadow-sm">{emp.user.role.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <FiMail className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="truncate">{emp.user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <FiPhone className="w-4 h-4 text-blue-500" />
                  </div>
                  {emp.phone || 'Contact Missing'}
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <FiTag className="w-4 h-4 text-blue-500" />
                  </div>
                  {emp.department?.name || 'General Staff'}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex gap-3">
                <button 
                  onClick={() => handleDeleteEmployee(emp.id, `${emp.firstName} ${emp.lastName}`)}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm shrink-0"
                  title="Delete Employee"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setEmployeeToEdit(emp);
                    setIsModalOpen(true);
                  }}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm shrink-0"
                  title="Edit Profile Details"
                >
                  <FiEdit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setSelectedEmployeeId(emp.id);
                    setIsProfileModalOpen(true);
                  }}
                  className="flex-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white py-3 rounded-xl transition-all uppercase tracking-wider text-center"
                >
                  View
                </button>
                <button 
                  onClick={() => handleRoleUpdate(emp.user.id, emp.user.role === 'ADMIN' ? 'FIELD_EMPLOYEE' : 'ADMIN')}
                  className={`flex-1 text-xs font-bold py-3 rounded-xl transition-all uppercase tracking-wider ${
                    emp.user.role === 'ADMIN' 
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' 
                      : 'bg-slate-800 text-white hover:bg-black shadow-lg shadow-slate-200'
                  }`}
                >
                  {emp.user.role === 'ADMIN' ? 'Demote Staff' : 'Make Admin'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddEmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEmployeeToEdit(null);
        }} 
        onSuccess={fetchEmployees} 
        employeeToEdit={employeeToEdit}
      />

      {selectedEmployeeId && (
        <EmployeeProfileModal 
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedEmployeeId(null);
          }}
          employeeId={selectedEmployeeId}
        />
      )}
    </div>
  );
}
