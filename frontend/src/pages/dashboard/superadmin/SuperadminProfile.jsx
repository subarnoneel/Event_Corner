import React, { useState, useContext, useEffect } from "react";
import AuthContext from "../../../providers/AuthContext";
import toast from "react-hot-toast";
import { FiEdit2, FiSave, FiX } from "react-icons/fi";
import { API_ENDPOINTS } from "../../../config/api";

const SuperadminProfile = () => {
  const { user, userData } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    username: "",
    institution: "",
    profile_picture_url: "",
    banner_url: "",
  });

  // Initialize profile from userData when userData is available
  useEffect(() => {
    if (userData) {
      setProfile({
        full_name: userData.full_name || "",
        email: userData.email || "",
        username: userData.username || "",
        institution: userData.institution || "",
        profile_picture_url: userData.profile_picture_url || "",
        banner_url: userData.banner_url || "",
      });
    }
  }, [userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    const targetUserId = userData?.user_id;
    if (!targetUserId) return;

    try {
      setLoading(true);
      const response = await fetch(
        API_ENDPOINTS.SUPERADMIN_UPDATE_PROFILE(targetUserId),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        }
      );
      if (!response.ok) throw new Error("Failed to update profile");
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Profile Header Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        {/* Gradient Banner */}
        <div className="h-32 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 relative">
          {profile.banner_url && (
            <img
              src={profile.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Profile Info Section */}
        <div className="px-8 py-6">
          <div className="flex items-start justify-between">
            {/* Left: Profile Picture and Info */}
            <div className="flex items-center gap-6">
              {/* Profile Picture */}
              <div className="relative -mt-12">
                <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
                  {profile.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {(profile.full_name || user?.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Name and Username */}
              <div className="pt-2">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {profile.full_name || "Unnamed User"}
                </h1>
                <p className="text-gray-600 text-lg mb-4">
                  @{profile.username || "no-username"}
                </p>

                {/* Role Badges */}
                <div className="flex gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    ⭐ Admin Role
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    🛡️ Super Admin Type
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Edit Button */}
            <div className="pt-4">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-medium shadow-md"
                >
                  <FiEdit2 size={18} />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition font-medium"
                  >
                    <FiSave size={18} />
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      // Reset profile to original userData values
                      setProfile({
                        full_name: userData.full_name || "",
                        email: userData.email || "",
                        username: userData.username || "",
                        institution: userData.institution || "",
                        profile_picture_url: userData.profile_picture_url || "",
                        banner_url: userData.banner_url || "",
                      });
                    }}
                    className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition font-medium"
                  >
                    <FiX size={18} />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Basic Information Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <FiEdit2 className="text-blue-600" size={18} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
        </div>

        <div className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">
              📧 Email
            </label>
            <p className="text-gray-900 text-lg font-medium">
              {profile.email || user?.email || "No email set"}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">
              👤 Name
            </label>
            {isEditing ? (
              <input
                type="text"
                name="full_name"
                value={profile.full_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Enter your full name"
              />
            ) : (
              <p className="text-gray-900 text-lg font-medium">
                {profile.full_name || "Not set"}
              </p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">
              🏷️ Username
            </label>
            {isEditing ? (
              <input
                type="text"
                name="username"
                value={profile.username}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Enter your username"
              />
            ) : (
              <p className="text-gray-900 text-lg font-medium">
                {profile.username || "Not set"}
              </p>
            )}
          </div>

          {/* Institution */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">
                🏢 Institution
              </label>
              <input
                type="text"
                name="institution"
                value={profile.institution}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Enter your institution"
              />
            </div>
          )}
        </div>
      </div>

      {/* Admin Status Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <span className="text-orange-600 text-lg">⭐</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Admin Status</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Access Level</h3>
            <p className="text-blue-600 font-medium">Super Administrator</p>
            <p className="text-sm text-gray-600 mt-1">
              Full system access and control
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Account Status</h3>
            <p className="text-green-600 font-medium">Active & Verified</p>
            <p className="text-sm text-gray-600 mt-1">All privileges enabled</p>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 space-y-4">
            {/* Profile Picture URL */}
            <div>
              <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">
                🖼️ Profile Picture URL
              </label>
              <input
                type="url"
                name="profile_picture_url"
                value={profile.profile_picture_url}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter profile picture URL"
              />
            </div>

            {/* Banner URL */}
            <div>
              <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">
                🎨 Banner URL
              </label>
              <input
                type="url"
                name="banner_url"
                value={profile.banner_url}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter banner image URL"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperadminProfile;
