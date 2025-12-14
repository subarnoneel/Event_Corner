import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import logos from "../assets/EVENT.png";
//import AuthContext from "../providers/AuthContext";

const Navbar = () => {
  //const { user, userRole, logOut } = useContext(AuthContext);
  const location = useLocation();
  
  const handleLogOut = () => {
    logOut();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

 /* const navEnd = (
    <>
      {user ? (
        <div className="navbar-end">
          
          
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar hover:bg-gray-200 transition-colors duration-200"
            >
              <div className="w-10 rounded-full">
                <img
                  alt="Tailwind CSS Navbar component"
                  src={user?.profilePictureUrl || "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"}
                />
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-white rounded-box z-[1] mt-3 w-52 p-2 shadow-lg border border-gray-200"
            >
              <li>
                <a className="justify-between text-gray-900 hover:bg-gray-100">
                  {user?.name ? `${user.name} (${userRole || "User"})` : userRole || "User"}
                </a>
              </li>
              <li>
                <Link to={`/${userRole}Dashboard`} className="text-gray-900 hover:bg-gray-100">Profile</Link>
              </li>
              <li>
                <a onClick={handleLogOut} className="text-gray-900 hover:bg-gray-100">Logout</a>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="navbar-end gap-2">
          
          <Link to="/login" className="btn bg-red-500 hover:bg-red-600 text-white border-0">
            Login
          </Link>
          <Link to="/register" className="btn bg-gray-200 text-gray-900 hover:bg-gray-300 border-0">
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
          className={`${isActive("/") ? "bg-red-500 text-white rounded-md" : "text-gray-900 hover:bg-gray-200"} transition-colors duration-200`}
        >
          Home
        </Link>
      </li>
      {user && (
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
      )}
    </>
  ); */
  
  return (
    <div className="bg-white shadow-lg rounded-md border-b border-gray-200 transition-colors duration-300">
      <div className="navbar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden hover:bg-gray-200 transition-colors duration-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-900"
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
              className="menu menu-sm dropdown-content bg-white rounded-box z-[1] mt-3 w-52 p-2 shadow-lg border border-gray-200"
            >
              {/* {list} */}
            </ul>
          </div>
          <Link to="/" className="btn btn-ghost text-xl hover:bg-gray-200 transition-colors duration-200">
            <img src={logos} alt="Event Lagbe" className="h-12" />
          </Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 gap-6"></ul>
        </div>

      </div>
    </div>
  );
};

export default Navbar;
