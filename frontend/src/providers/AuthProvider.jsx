import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import React, { useEffect, useState } from "react";
import { auth } from "../firebase.init.js";
import AuthContext from "./AuthContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_ENDPOINTS } from "../config/api.js";

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const register = (email, password) => {
    setLoading(true);
    return createUserWithEmailAndPassword(auth, email, password);
  };
  const logIn = (email, password) => {
    setLoading(true);
    return signInWithEmailAndPassword(auth, email, password);
  };
  const logOut = () => {
    setLoading(true);
    return signOut(auth);
  };
  const updateProfileInfo = (info) => {
    return updateProfile(auth.currentUser, info);
  };
  const verifyEmail = () => {
    return sendEmailVerification(auth.currentUser);
  };
  const passReset = (email) => {
    return sendPasswordResetEmail(auth, email);
  };
  const provider = new GoogleAuthProvider();
  
  const signInWithGoogle = () => {
    setLoading(true);
    return signInWithPopup(auth, provider);
  };

  const deleteU = () => {
    const curruser = auth.currentUser;
    return deleteUser(curruser);
  };

  const registerWithFirebaseAndMongo = async (userType, formData) => {
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const firebaseUser = userCredential.user;

      // 2. Prepare data for backend (include Firebase UID)
      const backendData = {
        ...formData,
        firebaseUid: firebaseUser.uid,
      };
      // 3. Send to backend
      const res = await axios.post(
        //`http://localhost:2038/api/auth/register/${userType}`,
        API_ENDPOINTS.REGISTER(userType),
        backendData
      );
      // console.log("########");
      // console.log(res.data); // get user data
      // console.log("########");

      toast.success("Registration successful!");
      return { success: true, data: res.data };
    } catch (err) {
      // If Firebase user was created but backend failed, delete Firebase user
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      toast.error("Registration failed. Please try again later.");
      return { success: false, error: err };
    }
  };

  useEffect(() => {
    const unSubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        setLoading(true);
        // fetch from `http://localhost:2038/api/auth/${currentUser.uid}`,
        fetch(API_ENDPOINTS.GET_USER(currentUser.uid))
          .then((res) => res.json())
          .then((data) => {
            setUserRole(data.role);
            setUser(data.user);
            console.log("---------");
            console.log(data.user);
            console.log("---------");
          })
          .catch(() => {
            setUser(null);
            setUserRole(null);
          })
          .finally(() => {
            setLoading(false);
          });
      }
      else{
        setUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });
    return () => {
      unSubscribe();
    };
  }, []);

  const authInfo = {
    user,
    userRole,
    register,
    logIn,
    logOut,
    updateProfileInfo,
    verifyEmail,
    passReset,
    signInWithGoogle,
    deleteU,
    loading,
    registerWithFirebaseAndMongo,
  };

  return (
    <AuthContext.Provider value={authInfo}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
