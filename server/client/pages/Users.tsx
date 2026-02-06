import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { userService } from '../services/userService';
import { getDepartments } from '../services/departmentService';

// Helper an toàn để lấy ID
const getUserId = (user: any): string => user?.id || user?._id || '';

export const Users: React.FC = () => {
  const { user: currentUser, allUsers, refreshUsers, logout } = useAuth();
  
  // State quản lý Modal và Form
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // State dữ liệu phòng ban
  const [departments, setDepartments] = useState<any[]>([]);

  // State tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  
  // State expand/collapse từng phòng ban
  const [expandedDepts, setExpandedDepts] = useState<{ [key: string]: boolean }>({});

  const initialFormState = {
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE' as UserRole,
    department: currentUser?.department || '',
    avatar: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // 1. Fetch Departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await getDepartments();
        setDepartments(data || []);
      } catch (err) {
        console.error("Không thể tải danh sách phòng ban:", err);
      }
    };
    fetchDepartments();
  }, []);

  // 2. Set default department for Manager
  useEffect(() => {
    if (departments.length > 0 && currentUser?.role === 'MANAGER' && currentUser.department && !formData.department) {
      setFormData(prev => ({ ...prev, department: currentUser.department }));
    }
  }, [departments, currentUser, formData.department]);

  // 3. Logic Lọc & Tìm kiếm User
  const processedUsers = useMemo(() => {
    // Bước 1: Lọc theo quyền hạn (Admin thấy hết, User/Manager thấy cùng phòng)
    let accessibleUsers = allUsers.filter(u => {
      if (currentUser?.role === 'ADMIN') return true;
      return u.department === currentUser?.department;
    });

    // Bước 2: Lọc theo từ khóa tìm kiếm
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      accessibleUsers = accessibleUsers.filter(u => 
        u.name?.toLowerCase().includes(lowerTerm) ||
        u.email?.toLowerCase().includes(lowerTerm) ||
        u.role?.toLowerCase().includes(lowerTerm) ||
        u.department?.toLowerCase().includes(lowerTerm)
      );
    }

    return accessibleUsers;
  }, [allUsers, currentUser, searchTerm]);

  // 4. Logic Phân nhóm theo Phòng ban
  const groupedUsers = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    processedUsers.forEach(u => {
      const deptName = u.department || 'Chưa phân bổ';
      if (!groups[deptName]) {
        groups[deptName] = [];
      }
      groups[deptName].push(u);
    });

    // Sắp xếp thứ tự các phòng ban (nếu cần)
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [processedUsers]);

  // --- Các hàm xử lý Form (Giữ nguyên logic cũ) ---
  const resetForm = () => {
    setFormData({ ...initialFormState });
    setEditingUserId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (u: any) => {
    setEditingUserId(getUserId(u));
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role as UserRole,
      department: u.department,
      avatar: u.avatar || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUserId) {
        const payload: any = { ...formData };
        if (!payload.password) delete payload.password;
        delete payload.id;
        delete payload._id;
        await userService.updateUser(editingUserId, payload);
      } else {
        if (!formData.password) { alert("Vui lòng nhập mật khẩu."); setIsSubmitting(false); return; }
        if (!formData.department) { alert("Vui lòng chọn phòng ban."); setIsSubmitting(false); return; }
        
        const newUserPayload = {
          ...formData,
          supervisorId: currentUser?.role === 'MANAGER' && formData.role === 'EMPLOYEE' ? currentUser.id : undefined
        };
        await userService.createUser(newUserPayload);
      }
      await refreshUsers();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      alert(err?.message || 'Thao tác thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (u: any) => {
    if (!confirm(`Xóa tài khoản ${u.name}?`)) return;
    const targetId = getUserId(u);
    setDeletingId(targetId);
    try {
      await userService.deleteUser(targetId);
      await refreshUsers();
    } catch (err: any) {
      alert(err?.message || 'Xóa thất bại');
    } finally {
      setDeletingId(null);
    }
  };

  const isRestricted = currentUser?.role === 'EMPLOYEE';

  const toggleDepartment = (deptName: string) => {
    setExpandedDepts(prev => ({
      ...prev,
      [deptName]: !prev[deptName]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Thành viên</h2>
          <p className="text-slate-500 text-sm">
            Tổng số: {processedUsers.length} thành viên {searchTerm && '(Đang lọc)'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* THANH TÌM KIẾM */}
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input 
              type="text" 
              placeholder="Tìm tên, vai trò, phòng..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {!isRestricted && (
            <button 
              onClick={openCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100 transition-colors text-sm"
            >
              <span className="material-icons text-base">person_add</span>
              <span>Thêm mới</span>
            </button>
          )}
        </div>
      </div>

      {/* DANH SÁCH NHÓM THEO PHÒNG BAN */}
      <div className="space-y-4">
        {groupedUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <span className="material-icons text-slate-300 text-5xl mb-2">search_off</span>
            <p className="text-slate-500">Không tìm thấy thành viên nào phù hợp.</p>
          </div>
        ) : (
          groupedUsers.map(([deptName, users]) => {
            const isExpanded = expandedDepts[deptName] !== false; // Mặc định mở rộng
            
            return (
              <div key={deptName} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                {/* Header của từng Phòng ban - có thể click để expand/collapse */}
                <div 
                  onClick={() => toggleDepartment(deptName)}
                  className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-gradient-to-r hover:from-indigo-100 hover:to-blue-100 transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="material-icons text-indigo-600 text-2xl transform transition-transform group-hover:scale-110">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="material-icons text-indigo-500 text-xl">apartment</span>
                        <h3 className="font-bold text-slate-800 text-lg">{deptName}</h3>
                        <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                          {users.length} {users.length === 1 ? 'thành viên' : 'thành viên'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-400 text-sm">{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
                </div>

                {/* Nội dung phòng ban - Hiển thị/Ẩn khi click header */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3">Họ tên</th>
                          <th className="px-6 py-3">Email</th>
                          <th className="px-6 py-3">Vai trò</th>
                          <th className="px-6 py-3">Người quản lý</th>
                          <th className="px-6 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users.map(u => {
                          const uid = getUserId(u);
                          const isMe = currentUser?.email === u.email;
                          const canEdit = currentUser?.role === 'ADMIN' || isMe;
                          const canDelete = currentUser?.role === 'ADMIN' && !isMe;
                          // Tìm tên Supervisor
                          const supervisorName = allUsers.find(sup => getUserId(sup) === u.supervisorId)?.name || '---';

                          return (
                            <tr key={uid} className="hover:bg-indigo-50/40 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                  <img 
                                    src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                                    alt={u.name}
                                    className="w-9 h-9 rounded-full bg-slate-200 object-cover border-2 border-indigo-100 shadow-sm" 
                                  />
                                  <p className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{u.name}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-slate-600">{u.email}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                                  u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                                  u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500">
                                {supervisorName !== '---' ? (
                                  <div className="flex items-center space-x-1">
                                    <span className="material-icons text-xs text-indigo-300">person</span>
                                    <span className="font-medium text-slate-700">{supervisorName}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-xs italic">Không có</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canEdit && (
                                    <button onClick={() => openEditModal(u)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Sửa">
                                      <span className="material-icons text-lg">edit</span>
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button 
                                      onClick={() => handleDelete(u)} 
                                      disabled={deletingId === uid}
                                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xóa"
                                    >
                                      <span className="material-icons text-lg">{deletingId === uid ? 'hourglass_empty' : 'delete'}</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* --- MODAL (Giữ nguyên form nhập liệu như cũ) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800">{editingUserId ? 'Chỉnh sửa hồ sơ' : 'Tạo tài khoản mới'}</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Họ tên <span className="text-red-500">*</span></label>
                <input type="text" required className="w-full p-2 border border-slate-200 rounded outline-none focus:border-indigo-500 mt-1 text-sm"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Email <span className="text-red-500">*</span></label>
                <input type="email" required disabled={!!editingUserId} className="w-full p-2 border border-slate-200 rounded outline-none focus:border-indigo-500 disabled:bg-slate-100 mt-1 text-sm"
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">{editingUserId ? 'Mật khẩu mới' : 'Mật khẩu'} <span className="text-red-500">*</span></label>
                <input type="password" required={!editingUserId} placeholder="••••••••" className="w-full p-2 border border-slate-200 rounded outline-none focus:border-indigo-500 mt-1 text-sm"
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Vai trò</label>
                  <select className="w-full p-2 border border-slate-200 rounded outline-none mt-1 text-sm"
                    value={formData.role} disabled={currentUser?.role !== 'ADMIN'} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                    {currentUser?.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                    {currentUser?.role === 'ADMIN' && <option value="MANAGER">Quản lý</option>}
                    <option value="EMPLOYEE">Nhân viên</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Phòng ban</label>
                  <select required className="w-full p-2 border border-slate-200 rounded outline-none disabled:bg-slate-100 mt-1 text-sm"
                    disabled={currentUser?.role !== 'ADMIN' || departments.length === 0}
                    value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                     <option value="">-- Chọn --</option>
                     {departments.map(dep => (<option key={dep.id || dep._id} value={dep.name}>{dep.name}</option>))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Avatar URL</label>
                <div className="flex gap-2 mt-1">
                  <input type="text" className="flex-1 p-2 border border-slate-200 rounded outline-none text-sm"
                    value={formData.avatar} onChange={e => setFormData({...formData, avatar: e.target.value})} />
                  <button type="button" onClick={() => setFormData({...formData, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name)}`})} 
                    className="px-3 bg-slate-100 border rounded text-xs font-bold hover:bg-slate-200">Random</button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded">Hủy</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold text-sm shadow-lg shadow-indigo-100 disabled:opacity-70">
                {isSubmitting ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};