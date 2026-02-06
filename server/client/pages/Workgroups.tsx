
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { workgroupService, Workgroup } from '../services/workgroupService';
import { userService } from '../services/userService';

export const Workgroups: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [workgroups, setWorkgroups] = useState<Workgroup[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [editingGroup, setEditingGroup] = useState<Workgroup | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewingGroupMembers, setViewingGroupMembers] = useState<Workgroup | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        leaderId: '',
        members: [] as string[]
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [groupsData, usersData] = await Promise.all([
                workgroupService.getWorkgroups(),
                userService.getUsers()
            ]);
            setWorkgroups(groupsData);
            setAllUsers(usersData);
        } catch (err) {
            console.error("Failed to load workgroups data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Sort users: MANAGER first, then others
    const sortedUsers = [...allUsers].sort((a, b) => {
        const rolePriority = (role: string) => {
            if (role === 'MANAGER') return 0;
            if (role === 'ADMIN') return 1;
            return 2;
        };
        return rolePriority(a.role) - rolePriority(b.role);
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingGroup) {
                await workgroupService.updateWorkgroup(editingGroup.id || editingGroup._id!, formData);
            } else {
                await workgroupService.createWorkgroup(formData);
            }
            await loadData();
            setShowModal(false);
            setEditingGroup(null);
            setFormData({ name: '', description: '', leaderId: '', members: [] });
        } catch (err: any) {
            alert(err?.message || 'Không thể lưu nhóm');
        }
    };

    const handleEdit = (group: Workgroup) => {
        setEditingGroup(group);
        setFormData({
            name: group.name,
            description: group.description || '',
            leaderId: group.leaderId?._id || group.leaderId?.id || group.leaderId || '',
            members: group.members?.map((m: any) => m._id || m.id || m) || []
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa nhóm này?')) return;
        setDeletingId(id);
        try {
            await workgroupService.deleteWorkgroup(id);
            await loadData();
        } catch (err: any) {
            alert(err?.message || 'Không thể xóa nhóm');
        } finally {
            setDeletingId(null);
        }
    };

    const toggleMember = (userId: string) => {
        setFormData(prev => {
            const members = [...prev.members];
            const index = members.indexOf(userId);
            if (index > -1) {
                members.splice(index, 1);
            } else {
                members.push(userId);
            }
            return { ...prev, members };
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Nhóm làm việc</h2>
                    <p className="text-slate-500 text-sm">Quản lý các nhóm dự án và phối hợp giữa các thành viên.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingGroup(null);
                        setFormData({ name: '', description: '', leaderId: '', members: [] });
                        setShowModal(true);
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                    <span className="material-icons">group_add</span>
                    <span>Tạo nhóm mới</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workgroups.length === 0 && (
                    <div className="col-span-full p-12 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
                        Chưa có nhóm làm việc nào được tạo.
                    </div>
                )}
                {workgroups.map(group => {
                    const leader = group.leaderId;
                    const leaderName = typeof leader === 'object' ? leader.name : (allUsers.find(u => u.id === leader || u._id === leader)?.name || 'Chưa xác định');

                    return (
                        <div key={group._id || group.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col group hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                                        <span className="material-icons text-indigo-600">groups</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-lg">{group.name}</h4>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{group.description || 'Không có mô tả'}</p>

                            <div className="space-y-3 mb-6">
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Trưởng nhóm</p>
                                    <div className="flex items-center space-x-2">
                                        <span className="material-icons text-indigo-400 text-sm">stars</span>
                                        <span className="text-xs font-bold text-slate-700">{leaderName}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Thành viên ({group.members?.length || 0})</p>
                                    <div
                                        className="flex -space-x-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setViewingGroupMembers(group)}
                                    >
                                        {group.members?.slice(0, 5).map((m: any, idx: number) => (
                                            <img
                                                key={idx}
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name || m}`}
                                                className="w-8 h-8 rounded-full border-2 border-white bg-slate-100"
                                                title={m.name || m}
                                                alt={m.name || m}
                                            />
                                        ))}
                                        {(group.members?.length || 0) > 5 && (
                                            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                +{(group.members?.length || 0) - 5}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setViewingGroupMembers(group)}
                                        className="text-[10px] font-bold text-indigo-600 mt-2 hover:underline text-left"
                                    >
                                        Xem danh sách thành viên
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t flex justify-end items-center space-x-3">
                                <button onClick={() => handleEdit(group)} className="text-indigo-600 text-sm font-bold hover:underline py-1 px-2 hover:bg-indigo-50 rounded-md transition-all">Sửa</button>
                                <button
                                    onClick={() => handleDelete(group.id || group._id!)}
                                    disabled={deletingId === (group.id || group._id)}
                                    className="text-rose-600 text-sm font-bold hover:underline py-1 px-2 hover:bg-rose-50 rounded-md transition-all"
                                >
                                    {deletingId === (group.id || group._id) ? 'Đang xóa…' : 'Xóa'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-2xl p-8 space-y-6 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="text-xl font-bold text-slate-800">{editingGroup ? 'Chỉnh sửa nhóm' : 'Tạo nhóm mới'}</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên nhóm làm việc</label>
                                <input
                                    required
                                    placeholder="Nhập tên nhóm..."
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả mục tiêu</label>
                                <textarea
                                    placeholder="Mô tả ngắn gọn về nhóm..."
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Trưởng nhóm (Ưu tiên Quản lý)</label>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                                    {sortedUsers.map(u => (
                                        <div
                                            key={u.id || u._id}
                                            onClick={() => setFormData({ ...formData, leaderId: u.id || u._id! })}
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${formData.leaderId === (u.id || u._id) ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white bg-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} className="w-8 h-8 rounded-full border border-slate-200" alt="" />
                                                <div>
                                                    <p className="text-sm font-bold">{u.name}</p>
                                                    <p className={`text-[10px] uppercase font-bold ${formData.leaderId === (u.id || u._id) ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                        {u.role} • {u.department}
                                                    </p>
                                                </div>
                                            </div>
                                            {formData.leaderId === (u.id || u._id) && <span className="material-icons text-sm">check_circle</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Thanh chọn nhân viên (Thành viên nhóm)</label>
                                <p className="text-[10px] text-slate-400 mb-2 italic">* Bạn có thể chọn nhiều nhân viên tham gia nhóm này.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                    {sortedUsers.map(u => (
                                        <div
                                            key={u.id || u._id}
                                            onClick={() => toggleMember(u.id || u._id!)}
                                            className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer border transition-all ${formData.members.includes(u.id || u._id!)
                                                ? 'bg-indigo-50 border-indigo-200'
                                                : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${formData.members.includes(u.id || u._id!) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'
                                                }`}>
                                                {formData.members.includes(u.id || u._id!) && <span className="material-icons text-xs">check</span>}
                                            </div>
                                            <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} className="w-8 h-8 rounded-full border border-slate-200" alt="" />
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-black text-slate-800 truncate">{u.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{u.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-6 border-t mt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingGroup(null);
                                    setFormData({ name: '', description: '', leaderId: '', members: [] });
                                }}
                                className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-2"
                            >
                                <span className="material-icons text-sm">save</span>
                                <span>{editingGroup ? 'Lưu thay đổi' : 'Tạo nhóm'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {viewingGroupMembers && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="text-xl font-bold text-slate-800">Thành viên: {viewingGroupMembers.name}</h3>
                            <button onClick={() => setViewingGroupMembers(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <p className="text-[10px] font-black text-indigo-500 uppercase mb-2 tracking-widest">Trưởng nhóm</p>
                                <div className="flex items-center space-x-3">
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${typeof viewingGroupMembers.leaderId === 'object' ? viewingGroupMembers.leaderId.name : allUsers.find(u => u.id === viewingGroupMembers.leaderId || u._id === viewingGroupMembers.leaderId)?.name}`}
                                        className="w-10 h-10 rounded-full border border-indigo-200"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{typeof viewingGroupMembers.leaderId === 'object' ? viewingGroupMembers.leaderId.name : allUsers.find(u => u.id === viewingGroupMembers.leaderId || u._id === viewingGroupMembers.leaderId)?.name}</p>
                                        <p className="text-xs text-indigo-600 font-medium">{typeof viewingGroupMembers.leaderId === 'object' ? viewingGroupMembers.leaderId.role : (allUsers.find(u => u.id === viewingGroupMembers.leaderId || u._id === viewingGroupMembers.leaderId)?.role || 'MANAGER')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Các thành viên khác ({viewingGroupMembers.members?.length || 0})</p>
                                {viewingGroupMembers.members?.map((m: any, idx: number) => {
                                    const memberData = typeof m === 'object' ? m : allUsers.find(u => u.id === m || u._id === m);
                                    if (!memberData) return null;
                                    return (
                                        <div key={idx} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${memberData.name}`} className="w-8 h-8 rounded-full border border-slate-100" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{memberData.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{memberData.role} • {memberData.department}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!viewingGroupMembers.members || viewingGroupMembers.members.length === 0) && (
                                    <p className="text-center py-4 text-slate-400 text-xs italic">Chưa có thành viên nào khác.</p>
                                )}
                            </div>
                        </div>
                        <div className="pt-4 border-t">
                            <button
                                onClick={() => setViewingGroupMembers(null)}
                                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
