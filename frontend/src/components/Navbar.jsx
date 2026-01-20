import React, { useContext, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logos from "../assets/EVENT.png";
import AuthContext from "../providers/AuthContext";

const Navbar = () => {
  const { user, userRole, userData, logOut } = useContext(AuthContext);
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    };

    if (showDropdown || showMobileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showDropdown, showMobileMenu]);
  
  const handleLogOut = async () => {
    await logOut();
    setShowDropdown(false);
    setShowMobileMenu(false);
  };

  const getDashboardLink = (roleName) => {
    // Map role names to dashboard routes
    const dashboardMap = {
      participant: "/participant",
      organizer: "/organizer",
      institution: "/institution",
      super_admin: "/superadmin",
      admin: "/admin"
    };
    return dashboardMap[roleName] || "/";
  };

  const getRoleBadgeColor = (roleName) => {
    const colorMap = {
      super_admin: "bg-purple-100 text-purple-800",
      admin: "bg-red-100 text-red-800",
      institution: "bg-blue-100 text-blue-800",
      event_organizer: "bg-green-100 text-green-800",
      participant: "bg-gray-100 text-gray-800"
    };
    return colorMap[roleName] || "bg-gray-100 text-gray-800";
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navEnd = (
    <>
      {user ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="btn btn-ghost btn-circle avatar hover:bg-gray-200 transition-colors duration-200 focus:outline-none"
          >
            <div className="w-10 rounded-full overflow-hidden ring-2 ring-gray-300 hover:ring-blue-500 transition-all">
              <img
                alt="Profile"
                src={userData?.profile_picture_url || "https://res.cloudinary.com/dfvwazcdk/image/upload/v1753161431/generalProfilePicture_inxppe.png"}
                className="w-full h-full object-cover"
              />
            </div>
          </button>

          {/* Dropdown Menu with Glassy Effect */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-72 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* User Info */}
              <div className="px-5 py-4 border-b border-white/20 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
                <p className="font-bold text-gray-900 text-sm">{userData?.full_name || "User"}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {userData?.roles && userData.roles.length > 0 ? (
                    userData.roles.map((role) => (
                      <span
                        key={role.role_id}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleBadgeColor(role.role_name)}`}
                      >
                        {role.display_name || role.role_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-600 capitalize font-medium">{userRole || "User"}</span>
                  )}
                </div>
              </div>

              {/* Dashboard Options */}
              <div className="py-2">
                {userData?.roles && userData.roles.length > 0 ? (
                  userData.roles.map((role) => (
                    <Link
                      key={role.role_id}
                      to={getDashboardLink(role.role_name)}
                      onClick={() => setShowDropdown(false)}
                      className="block px-5 py-3 text-gray-700 hover:bg-white/40 transition-all duration-200 font-medium text-sm hover:translate-x-1"
                    >
                      📊 {role.display_name || role.role_name} Dashboard
                    </Link>
                  ))
                ) : (
                  <Link
                    to={getDashboardLink(userRole)}
                    onClick={() => setShowDropdown(false)}
                    className="block px-5 py-3 text-gray-700 hover:bg-white/40 transition-all duration-200 font-medium text-sm hover:translate-x-1"
                  >
                    📊 Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogOut}
                  className="w-full text-left px-5 py-3 text-red-600 hover:bg-red-500/10 transition-all duration-200 border-t border-white/20 font-medium text-sm hover:translate-x-1"
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-3 items-center">
          <Link to="/login" className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors duration-200 border-0">
            Login
          </Link>
          <Link to="/register" className="px-5 py-2 bg-gray-200 text-gray-900 hover:bg-gray-300 font-medium rounded-lg transition-colors duration-200 border-0">
            Register
          </Link>
        </div>
      )}
    </>
  );

  // Check if user has organizer or institution role
  const canAddEvent = userData?.roles && userData.roles.some(role => 
    role.role_name === 'organizer' || role.role_name === 'institution'
  );

  const list = (
    <>
      <li>
        <Link 
          to="/" 
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isActive("/") 
              ? "bg-red-500 text-white shadow-md" 
              : "text-gray-900 hover:bg-gray-100"
          }`}
        >
          Home
        </Link>
     </li>
     <li>
        <Link 
          to="/events" 
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isActive("/events") 
              ? "bg-red-500 text-white shadow-md" 
              : "text-gray-900 hover:bg-gray-100"
          }`}
        >
          Explore Events
        </Link>
      </li>
     {canAddEvent && (
        <li>
          <Link 
            to="/events/create" 
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isActive("/events/create") 
                ? "bg-red-500 text-white shadow-md" 
                : "text-gray-900 hover:bg-gray-100"
            }`}
          >
            Add Event
          </Link>
        </li>
      )}
    </>
  ); 
  
  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left: Hamburger Menu (Mobile Only) + Logo */}
          <div className="flex items-center gap-4">
            {/* Hamburger Menu Button - Only on Mobile */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
              aria-label="Menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-900"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity duration-200">
              <img src={logos} alt="Event Lagbe" className="h-12 w-auto" />
            </Link>
          </div>

          {/* Desktop Navigation - Hidden on Mobile */}
          <div className="hidden lg:flex items-center gap-8">
            <ul className="flex gap-6 items-center">
              {list}
            </ul>
          </div>

          {/* Right: Auth Buttons or Profile */}
          <div className="flex items-center gap-3">
            {navEnd}
          </div>
        </div>
      </div>

      {/* Dropdown Menu - Only for Mobile */}
      {showMobileMenu && (
        <div 
          ref={mobileMenuRef}
          className="lg:hidden absolute left-0 right-0 top-20 bg-white border-b border-gray-200 shadow-xl z-40 animate-in slide-in-from-top duration-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* User Profile Section (if logged in) */}
            {user && userData && (
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={userData?.profile_picture_url || "https://res.cloudinary.com/dfvwazcdk/image/upload/v1753161431/generalProfilePicture_inxppe.png"}
                    alt="Profile"
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-base truncate">{userData?.full_name || "User"}</p>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {userData?.roles && userData.roles.length > 0 ? (
                    userData.roles.map((role) => (
                      <span
                        key={role.role_id}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium ${getRoleBadgeColor(role.role_name)}`}
                      >
                        {role.display_name || role.role_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-600 capitalize font-medium">{userRole || "User"}</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Navigation Links */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">Navigation</h3>
                <ul className="space-y-1">
                  <li>
                    <Link 
                      to="/" 
                      onClick={() => setShowMobileMenu(false)}
                      className={`block px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        isActive("/") 
                          ? "bg-red-500 text-white shadow-md" 
                          : "text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      🏠 Home
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/events" 
                      onClick={() => setShowMobileMenu(false)}
                      className={`block px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        isActive("/events") 
                          ? "bg-red-500 text-white shadow-md" 
                          : "text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      🎯 Explore Events
                    </Link>
                  </li>
                  {canAddEvent && (
                    <li>
                      <Link 
                        to="/events/create" 
                        onClick={() => setShowMobileMenu(false)}
                        className={`block px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                          isActive("/events/create") 
                            ? "bg-red-500 text-white shadow-md" 
                            : "text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        ➕ Add Event
                      </Link>
                    </li>
                  )}
                </ul>
              </div>

              {/* Dashboard Links (if logged in) */}
              {user && userData?.roles && userData.roles.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">Dashboards</h3>
                  <ul className="space-y-1">
                    {userData.roles.map((role) => (
                      <li key={role.role_id}>
                        <Link
                          to={getDashboardLink(role.role_name)}
                          onClick={() => setShowMobileMenu(false)}
                          className="block px-4 py-3 rounded-lg font-medium text-gray-900 hover:bg-blue-50 transition-all duration-200"
                        >
                          📊 {role.display_name || role.role_name} Dashboard
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Auth Actions - Only show if not logged in */}
              {!user && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">Account</h3>
                  <ul className="space-y-1">
                    <li>
                      <Link 
                        to="/login" 
                        onClick={() => setShowMobileMenu(false)}
                        className="block px-4 py-3 rounded-lg font-medium text-red-500 hover:bg-red-50 transition-all duration-200"
                      >
                        🔐 Login
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/register" 
                        onClick={() => setShowMobileMenu(false)}
                        className="block px-4 py-3 rounded-lg font-medium text-gray-900 hover:bg-gray-100 transition-all duration-200"
                      >
                        📝 Register
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
