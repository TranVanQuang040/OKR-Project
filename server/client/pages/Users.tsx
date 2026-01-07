import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { userService } from '../services/userService';
import { getDepartments } from '../services/departmentService'; // <--- Import service phòng ban

// Helper an toàn để lấy ID dù backend trả về _id hay id
const getUserId = (user: any): string => user?.id || user?._id || '';

export const Users: React.FC = () => {
  const { user: currentUser, allUsers, createUser, refreshUsers, logout } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // State lưu danh sách phòng ban fetch từ API
  const [departments, setDepartments] = useState<any[]>([]);

  const initialFormState = {
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE' as UserRole,
    department: currentUser?.department || '',
    avatar: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Load danh sách phòng ban khi component mount
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

  // Filter users: Admin thấy hết, Manager/Employee chỉ thấy cùng phòng
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      if (currentUser?.role === 'ADMIN') return true;
      return u.department === currentUser?.department;
    });
  }, [allUsers, currentUser]);

  const resetForm = () => {
    setFormData({ ...initialFormState, department: currentUser?.department || '' });
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
      password: '', // Không hiển thị password cũ
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
        // --- SỬA USER ---
        const payload: any = { ...formData };
        if (!payload.password) delete payload.password;
        
        await userService.updateUser(editingUserId, payload);
      } else {
        // --- TẠO MỚI USER ---
        if (!formData.password) {
          alert("Vui lòng nhập mật khẩu cho tài khoản mới.");
          setIsSubmitting(false);
          return;
        }

        const newUserPayload = {
          ...formData,
          supervisorId: currentUser?.id
        };

        if (currentUser?.role === 'ADMIN') {
          // Admin gọi trực tiếp service
          await userService.createUser(newUserPayload);
        } else {
          // Dùng hàm từ context
          await createUser(newUserPayload);
        }
      }

      await refreshUsers();
      setShowModal(false);
      resetForm();

    } catch (err: any) {
      console.error(err);
      if (err?.status === 401 || err?.status === 403) {
        alert('Phiên đăng nhập hết hạn hoặc không đủ quyền. Vui lòng đăng nhập lại.');
        logout();
      } else {
        alert(err?.message || (editingUserId ? 'Cập nhật thất bại' : 'Tạo mới thất bại'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (u: any) => {
    if (!confirm(`Bạn có chắc muốn xóa tài khoản ${u.name}?`)) return;
    
    const targetId = getUserId(u);
    if (!targetId) {
      alert('Không tìm thấy ID người dùng.');
      return;
    }

    setDeletingId(targetId);
    try {
      await userService.deleteUser(targetId);
      await refreshUsers();
    } catch (err: any) {
      alert(err?.message || 'Xóa thất bại');
      if (err?.status === 401 || err?.status === 403) logout();
    } finally {
      setDeletingId(null);
    }
  };

  const isRestricted = currentUser?.role === 'EMPLOYEE';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Thành viên</h2>
          <p className="text-slate-500 text-sm">
            {currentUser?.role === 'ADMIN' ? 'Quản lý toàn bộ nhân sự hệ thống.' : `Quản lý thành viên phòng ${currentUser?.department}.`}
          </p>
          {isRestricted && (
            <div className="mt-2 inline-block px-2 py-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded">
              Chế độ xem hạn chế
            </div>
          )}
        </div>
        {!isRestricted && (
          <button 
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 shadow-lg shadow-indigo-100 transition-colors"
          >
            <span className="material-icons">person_add</span>
            <span>Thêm thành viên</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Họ tên</th>
              <th className="px-6 py-4">Vai trò</th>
              <th className="px-6 py-4">Phòng ban</th>
              <th className="px-6 py-4">Người quản lý</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(u => {
              const uid = getUserId(u) || u.email;
              const isMe = currentUser?.email === u.email;
              const canEdit = currentUser?.role === 'ADMIN' || isMe;
              const canDelete = currentUser?.role === 'ADMIN' && !isMe;
              const supervisorName = allUsers.find(sup => getUserId(sup) === u.supervisorId)?.name || '---';

              return (
                <tr key={uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                        alt={u.name}
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random` }}
                        className="w-8 h-8 rounded-full bg-slate-200 object-cover" 
                      />
                      <div>
                        <p className="font-semibold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                       u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                       u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                     }`}>
                       {u.role}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{u.department}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{supervisorName}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center space-x-2">
                      {canEdit && (
                        <button onClick={() => openEditModal(u)} className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded text-sm transition-colors">Sửa</button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={() => handleDelete(u)} 
                          disabled={deletingId === getUserId(u)}
                          className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 rounded text-sm transition-colors disabled:opacity-50"
                        >
                          {deletingId === getUserId(u) ? '...' : 'Xóa'}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800">{editingUserId ? 'Chỉnh sửa hồ sơ' : 'Tạo tài khoản mới'}</h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ tên</label>
              <input 
                type="text" 
                required
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input 
                type="email" 
                required
                disabled={!!editingUserId}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {editingUserId ? 'Mật khẩu mới (Bỏ trống nếu giữ nguyên)' : 'Mật khẩu khởi tạo'}
              </label>
              <input 
                type="password" 
                required={!editingUserId}
                placeholder="••••••••"
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vai trò</label>
                <select 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  value={formData.role}
                  disabled={currentUser?.role !== 'ADMIN'}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                >
                  {currentUser?.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                  {currentUser?.role === 'ADMIN' && <option value="MANAGER">Quản lý</option>}
                  <option value="EMPLOYEE">Nhân viên</option>
                </select>
              </div>
              
              {/* --- ĐÃ SỬA: Dùng Select Box thay vì Input --- */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phòng ban</label>
                <select 
                  required
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none disabled:bg-slate-100"
                  disabled={currentUser?.role !== 'ADMIN'}
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                >
                   <option value="">-- Chọn phòng --</option>
                   {departments.map(dep => {
                     // Sử dụng getUserId để lấy ID phòng ban an toàn nếu cần, hoặc dùng _id/id trực tiếp
                     const depId = dep.id || dep._id;
                     return (
                       <option key={depId} value={dep.name}>{dep.name}</option>
                     )
                   })}
                   {/* Fallback nếu danh sách rỗng hoặc đang load mà user có sẵn department */}
                   {departments.length === 0 && formData.department && (
                     <option value={formData.department}>{formData.department}</option>
                   )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avatar URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 p-2 border border-slate-200 rounded-lg outline-none text-sm"
                  value={formData.avatar}
                  onChange={e => setFormData({...formData, avatar: e.target.value})}
                />
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name || 'user')}`})} 
                  className="px-3 bg-slate-100 border rounded-lg text-xs font-bold"
                >
                  Random
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 mt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg">Hủy</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-100 disabled:opacity-70">
                {isSubmitting ? 'Đang xử lý...' : (editingUserId ? 'Lưu thay đổi' : 'Tạo tài khoản')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};