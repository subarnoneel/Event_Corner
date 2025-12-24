import React, { useState, useContext } from 'react';
import AuthContext from '../../../providers/AuthContext';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import {
  FiUser,
  FiHome,
  FiUserCheck,
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi';

const Superadmin = () => {
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
      path: `/superadmin/profile${userData?.id ? `/${userData.id}` : ''}`,
      label: 'Profile Dashboard',
      icon: FiUser,
      description: 'Manage your superadmin profile'
    },
    {
      id: 'institutions',
      path: '/superadmin/institutions',
      label: 'Manage Institutions',
      icon: FiHome,
      description: 'Verify and manage institutions'
    },
    {
      id: 'roles',
      path: '/superadmin/roles',
      label: 'Assign Roles',
      icon: FiUserCheck,
      description: 'Search users and assign roles'
    }
  ];

  const getCurrentMenuItem = () => {
    const currentPath = location.pathname;
    if (currentPath.includes('/profile')) return menuItems[0];
    if (currentPath.includes('/institutions')) return menuItems[1];
    if (currentPath.includes('/roles')) return menuItems[2];
    return menuItems[0]; // Default to profile
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-blue-600 to-blue-800 text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl`}
      >
        {/* Header */}
        <div className="p-6 border-b border-blue-500">
          <div className="flex items-center justify-between">
            {sidebarOpen && <h1 className="text-2xl font-bold">Admin</h1>}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-blue-500 p-2 rounded-lg transition"
            >
              {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.id === 'profile' && location.pathname.includes('/profile'));
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'text-blue-100 hover:bg-blue-500'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && (
                  <div className="text-left">
                    <div className="font-semibold text-sm">{item.label}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-blue-500 p-4">
          {sidebarOpen && user && (
            <div className="mb-4 p-3 bg-blue-500 rounded-lg">
              <p className="text-xs opacity-75">Logged in as</p>
              <p className="font-semibold truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition text-white"
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
          <div className="px-8 py-6">
            <h2 className="text-3xl font-bold text-gray-900">
              {getCurrentMenuItem()?.label}
            </h2>
            <p className="text-gray-500 mt-1">
              {getCurrentMenuItem()?.description}
            </p>
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

export default Superadmin;
