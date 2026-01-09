
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavLink: React.FC<{ to: string, children: React.ReactNode, icon: string }> = ({ to, children, icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
          : 'text-slate-600 hover:bg-slate-100'
        }`}
    >
      <span className="material-icons text-xl">{icon}</span>
      <span className="font-semibold text-sm">{children}</span>
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, selectedPeriod, setSelectedPeriod, updateAvatar } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [showAvatarModal, setShowAvatarModal] = React.useState(false);
  const [avatarInput, setAvatarInput] = React.useState('');
  const [isSavingAvatar, setIsSavingAvatar] = React.useState(false);

  React.useEffect(() => {
    setAvatarInput(user?.avatar || '');
  }, [user]);

  const handleGenerateAvatar = () => {
    const seed = user?.name || user?.email || 'user';
    setAvatarInput(`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`);
  };

  const handleSaveAvatar = async () => {
    if (!user) return;
    setIsSavingAvatar(true);
    try {
      const uid = (user as any).id || (user as any)._id;
      await updateAvatar(uid, avatarInput);
      setShowAvatarModal(false);
    } catch (err) {
      alert((err as any)?.message || 'Không thể cập nhật avatar');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const years = [2023, 2024, 2025, 2026];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Inter']">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-2xl">O</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">OKR Pro</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavLink to="/" icon="dashboard">Bảng điều khiển</NavLink>
          <NavLink to="/okrs" icon="track_changes">Mục tiêu OKR</NavLink>
          <NavLink to="/myOkrs" icon="track_changes">OKR cá nhân</NavLink>
          <NavLink to="/kpis/department" icon="bar_chart">KPI Phòng ban</NavLink>
          <NavLink to="/kpis/personal" icon="person_pin">KPI Cá nhân</NavLink>

          {user?.role !== 'EMPLOYEE' && <NavLink to="/users" icon="group">Thành viên</NavLink>}
          <NavLink to="/tasks" icon="assignment">Công việc</NavLink>
          <NavLink to="/reports" icon="analytics">Báo cáo</NavLink>
          <NavLink to="/teams" icon="corporate_fare">Phòng ban</NavLink>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center space-x-3 mb-4 p-2 bg-slate-50 rounded-xl">
            <button onClick={() => setShowAvatarModal(true)} className="rounded-full p-0 border-2 border-white hover:opacity-90">
              <img src={user?.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-slate-200 bg-white" />
            </button>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{user?.role} • {user?.department}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <span className="material-icons text-base">logout</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center md:hidden">
            <span className="material-icons text-slate-600">menu</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm mục tiêu..."
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64 md:w-80"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="relative p-2 text-slate-500 hover:text-indigo-600 transition-colors">
              <span className="material-icons">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-8 w-px bg-slate-200 mx-1"></div>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
              <select
                value={selectedPeriod.quarter}
                onChange={(e) => setSelectedPeriod({ ...selectedPeriod, quarter: e.target.value })}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none px-2 py-1 cursor-pointer hover:text-indigo-600 transition-colors"
              >
                {quarters.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <div className="h-4 w-px bg-slate-300"></div>
              <select
                value={selectedPeriod.year}
                onChange={(e) => setSelectedPeriod({ ...selectedPeriod, year: parseInt(e.target.value) })}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none px-2 py-1 cursor-pointer hover:text-indigo-600 transition-colors"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>

      {showAvatarModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">Cập nhật Avatar</h3>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL Avatar</label>
              <div className="flex items-center space-x-3">
                <input value={avatarInput} onChange={(e) => setAvatarInput(e.target.value)} className="flex-1 p-2 border rounded-lg" />
                <button onClick={handleGenerateAvatar} className="px-3 py-2 bg-slate-50 border rounded-lg">Tạo</button>
              </div>
              {avatarInput && <img src={avatarInput} className="w-20 h-20 rounded-full mt-3 border" />}
            </div>

            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowAvatarModal(false)} className="px-4 py-2 text-slate-600">Hủy</button>
              <button onClick={handleSaveAvatar} disabled={isSavingAvatar} className={`px-4 py-2 rounded-lg font-bold ${isSavingAvatar ? 'bg-slate-300 text-slate-700' : 'bg-indigo-600 text-white'}`}>
                {isSavingAvatar ? 'Đang lưu…' : 'Lưu Avatar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    </div>
  );
};
