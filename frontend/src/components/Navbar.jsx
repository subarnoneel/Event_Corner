import React, { useContext, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logos from "../assets/EVENT.png";
import AuthContext from "../providers/AuthContext";

const Navbar = () => {
  const { user, userRole, userData, logOut } = useContext(AuthContext);
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showDropdown]);
  
  const handleLogOut = async () => {
    await logOut();
    setShowDropdown(false);
  };

  const getDashboardLink = (roleName) => {
    // Map role names to dashboard routes
    const dashboardMap = {
      participant: "/participant-dashboard",
      organizer: "/organizer-dashboard",
      institution: "/institution",
      event_organizer: "/organizer-dashboard",
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
     {/* {user && (
        <li>
                  <Link 
          to="/Connect" 
          className={`${isActive("/Connect") ? "bg-red-500 text-white rounded-md" : "text-gray-900 hover:bg-gray-200"} transition-colors duration-200`}
        >
          Connect
        </Link>
        </li>
      )}
      <li>
        <Link 
          to="/events" 
          className={`${isActive("/events") ? "bg-red-500 text-white rounded-md" : "text-gray-900 hover:bg-gray-200"} transition-colors duration-200`}
        >
          Explore Events
        </Link>
      </li>
      {user && (userRole === "organization" || userRole === "organizer") && (
        <li>
                  <Link 
          to="/add-event" 
          className={`${isActive("/add-event") ? "bg-red-500 text-white rounded-md" : "text-gray-900 hover:bg-gray-200"} transition-colors duration-200`}
        >
          Add Event
        </Link>
        </li> 
      )}*/}
    </>
  ); 
  
  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity duration-200">
            <img src={logos} alt="Event Lagbe" className="h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <ul className="flex gap-6 items-center">
              {list}
            </ul>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {navEnd}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle hover:bg-gray-200 transition-colors duration-200">
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
                    d="M4 6h16M4 12h8m-8 6h16"
                  />
                </svg>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-white rounded-box z-[1] w-52 p-2 shadow-lg border border-gray-200"
              >
                {list}
                <li className="border-t border-gray-200 mt-2 pt-2">
                  <Link to="/login" className="text-red-500 font-semibold hover:bg-red-50">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-gray-900 hover:bg-gray-100">
                    Register
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
