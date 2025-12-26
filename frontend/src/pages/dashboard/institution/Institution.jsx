import React, { useState, useContext } from 'react';
import AuthContext from '../../../providers/AuthContext';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import {
  FiUser,
  FiUsers,
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi';

const Institution = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, userData, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      id: 'profile',
      path: `/institution/profile`,
      label: 'Profile Dashboard',
      icon: FiUser,
      description: 'Manage your institution profile'
    },
    {
      id: 'organizers',
      path: '/institution/organizers',
      label: 'Manage Organizers',
      icon: FiUsers,
      description: 'View and manage event organizers'
    }
  ];

  const getCurrentMenuItem = () => {
    const currentPath = location.pathname;
    if (currentPath.includes('/profile')) return menuItems[0];
    if (currentPath.includes('/organizers')) return menuItems[1];
    return menuItems[0]; // Default to profile
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col relative`}
        style={{
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 opacity-5 rounded-full -mr-16 -mt-16" />
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 relative z-10">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Institution Panel</h1>
                <p className="text-gray-500 text-xs mt-1">Institution Dashboard</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-gray-100 p-2 rounded-xl transition-all duration-200 text-gray-700"
            >
              {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-3 relative z-10">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.id === 'profile' && location.pathname.includes('/profile'));
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`group relative w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:translate-x-1'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon size={22} className="flex-shrink-0 relative z-10" />
                {sidebarOpen && (
                  <div className="text-left relative z-10">
                    <div className="font-semibold text-sm leading-tight">{item.label}</div>
                    <div className={`text-xs mt-0.5 ${isActive ? 'text-white opacity-90' : 'text-gray-500'}`}>
                      {item.description}
                    </div>
                  </div>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-300 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-200 p-4 relative z-10">
          {sidebarOpen && user && (
            <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500">Logged in as</p>
              <p className="font-semibold truncate mt-1 text-gray-900">{user.email}</p>
              {userData?.institution && (
                <p className="text-xs text-blue-600 mt-1 truncate">{userData.institution}</p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-200 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105"
          >
            <FiLogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {getCurrentMenuItem()?.label}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {getCurrentMenuItem()?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Institution;
