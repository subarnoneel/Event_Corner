import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import React, { useEffect, useState } from "react";
import AuthContext from "./AuthContext";
import axios from "axios";
import { auth } from "../../firebase.init.js";
import { toast } from "react-hot-toast";
import { API_ENDPOINTS } from "../config/api.js";

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Register a new user
   * 1. Create user in Firebase Auth
   * 2. Call our backend API to save user to Supabase with stored procedure
   */
  const register = async (email, password, registrationData) => {
    try {
      setLoading(true);

      // Step 1: Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Step 2: Update Firebase profile with full name
      if (registrationData.fullName) {
        await updateProfile(firebaseUser, {
          displayName: registrationData.fullName,
        });
      }

      // Step 3: Send registration data to backend with Firebase UID
      const backendData = {
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email,
        username: registrationData.username,
        full_name: registrationData.fullName,
        role: registrationData.role,
        institution: registrationData.institution || null,
        institution_id: registrationData.institution_id || null,
        institution_type: registrationData.institution_type || null,
        eiin_number: registrationData.eiin_number || null,
        verification_documents: registrationData.verification_documents || null,
      };

      const response = await axios.post(API_ENDPOINTS.REGISTER, backendData);

      if (response.data.success) {
        toast.success("Registration successful! Please log in.");
        return { success: true, data: response.data };
      } else {
        throw new Error(response.data.error || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      toast.error(
        err.response?.data?.error || err.message || "Registration failed"
      );
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user with email and password
   * 1. Authenticate with Firebase
   * 2. Fetch user data from backend using Firebase UID
   */
  const logIn = async (email, password) => {
    try {
      setLoading(true);

      // Step 1: Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Step 2: Fetch user data from backend using Firebase UID
      const response = await axios.post(API_ENDPOINTS.LOGIN, {
        firebase_uid: firebaseUser.uid,
      });

      console.log("//////////////////////////////////");
      console.log(response);
      console.log("//////////////////////////////////");

      if (response.data.success) {
        setUser(firebaseUser);
        setUserData(response.data);

        // Extract primary role from roles array
        if (response.data.roles && response.data.roles.length > 0) {
          setUserRole(response.data.roles[0].role_name);
        }

        toast.success("Login successful!");
        return { success: true, data: response.data };
      } else {
        throw new Error(response.data.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.response?.data?.error || err.message || "Login failed");
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out user from both Firebase and app state
   */
  const logOut = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setUserRole(null);
      setUserData(null);
      toast.success("Logged out successfully!");
      return { success: true };
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Logout failed");
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user profile information
   */
  const updateProfileInfo = async (info) => {
    try {
      setLoading(true);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, info);
        setUser(auth.currentUser);
        toast.success("Profile updated successfully!");
        return { success: true };
      }
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("Profile update failed");
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
      return { success: true };
    } catch (err) {
      console.error("Password reset error:", err);
      toast.error("Failed to send password reset email");
      return { success: false, error: err };
    }
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      // Try to fetch user from backend, if not found they'll need to complete registration
      const response = await axios.post(API_ENDPOINTS.LOGIN, {
        firebase_uid: firebaseUser.uid,
      });

      if (response.data.success) {
        setUser(firebaseUser);
        setUserData(response.data);
        if (response.data.roles && response.data.roles.length > 0) {
          setUserRole(response.data.roles[0].role_name);
        }
        toast.success("Google sign-in successful!");
        return { success: true, data: response.data };
      } else {
        // User exists in Firebase but not in our database
        setUser(firebaseUser);
        return {
          success: false,
          error: "User profile not found. Please complete registration.",
          user: firebaseUser,
        };
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      // User might be new, return the Firebase user for registration
      if (err.response?.status === 401) {
        setUser(auth.currentUser);
        return {
          success: false,
          error: "Please complete your profile registration",
          user: auth.currentUser,
        };
      }
      toast.error("Google sign-in failed");
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Monitor Firebase auth state changes
   * When user logs in/out, update our app state
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          setLoading(true);

          // Fetch user data from backend
          const response = await axios.post(API_ENDPOINTS.LOGIN, {
            firebase_uid: currentUser.uid,
          });

          console.log("//////////////////////////////////");
          console.log(response);
          console.log("//////////////////////////////////");

          if (response.data.success) {
            setUserData(response.data);
            if (response.data.roles && response.data.roles.length > 0) {
              setUserRole(response.data.roles[0].role_name);
            }
          }
          else{
            // If backend does not recognize the user, log them out from Firebase
            await signOut(auth);
            setUser(null);
            setUserRole(null);
            setUserData(null);
          }
        } else {
          setUser(null);
          setUserRole(null);
          setUserData(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        // Log out from Firebase if backend fails
        await signOut(auth);
        setUser(null);
        setUserRole(null);
        setUserData(null);
      } finally {
        setLoading(false);

        console.log("//////////////////////////////////");
        console.log(userData);
        console.log("//////////////////////////////////");
      }
    });

    return () => unsubscribe();
  }, []);

  const authInfo = {
    user,
    userRole,
    userData,
    loading,
    register,
    logIn,
    logOut,
    updateProfileInfo,
    resetPassword,
    signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={authInfo}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
