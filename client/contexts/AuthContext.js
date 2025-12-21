import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { config } from "../config";
import { getToken } from "../services/getToken";

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "@env";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [user, setUser] = useState({});

  useEffect(() => {
    setAuthError("");
    setAuthMessage("");
  }, []);

  const register = async (userData) => {
    setAuthLoading(true);

    try {
      const response = await axios.post(
        `${config.API_BASE_URL}/api/user/register`,
        userData,
        { timeout: 10000 }
      );

      setAuthMessage(response.data.message);

      await AsyncStorage.setItem("token", response.data.accessToken);
      await AsyncStorage.setItem("userId", response.data.id);

      setTimeout(() => {
        setAuthMessage("");

        router.replace(`/profile-picture-upload?role=${response.data.role}`);
      }, 3000);
    } catch (err) {
      console.log("Register Error:", err);
      const message =
        err.response?.data?.message || err.message || "Registration failed";
      setAuthError(message);

      setTimeout(() => {
        setAuthError("");
      }, 3000);
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async (credentials) => {
    setAuthLoading(true);

    try {
      const response = await axios.post(
        `${config.API_BASE_URL}/api/user/login`,
        credentials,
        { timeout: 10000 }
      );

      setAuthMessage(response.data.message);

      await AsyncStorage.setItem("token", response.data.accessToken);
      await AsyncStorage.setItem("role", response.data.role);
      await AsyncStorage.setItem("userId", response.data.id);

      setTimeout(() => {
        setAuthMessage("");

        response.data.role === "individual-agent" ||
        response.data.role === "company-agent"
          ? router.replace("/agent/dashboard")
          : router.replace("/user/home");
      }, 3000);
    } catch (err) {
      console.log("Login Error:", err);
      const message =
        err.response?.data?.message || err.message || "Login failed";
      setAuthError(message);

      setTimeout(() => {
        setAuthError("");
      }, 3000);
    } finally {
      setAuthLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    setAuthLoading(true);

    try {
      const response = await axios.post(
        `${config.API_BASE_URL}/api/user/forgot-password`,
        { email }
      );

      setAuthMessage(response.data.message);

      setTimeout(() => {
        setAuthMessage("");

        router.replace(`/verify-otp?email=${email}`);
      }, 3000);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to send OTP";
      setAuthError(message);

      setTimeout(() => {
        setAuthError("");
      }, 3000);
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    setAuthLoading(true);

    try {
      const response = await axios.post(
        `${config.API_BASE_URL}/api/user/verify-otp`,
        { email, otp }
      );

      setAuthMessage(response.data.message);

      setTimeout(() => {
        setAuthMessage("");

        router.replace(`/reset-password?email=${email}`);
      }, 3000);
    } catch (err) {
      const message = err.response?.data?.message || "Verification failed";
      setAuthError(message);

      setTimeout(() => {
        setAuthError("");
      }, 3000);
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (email, password) => {
    setAuthLoading(true);

    try {
      const response = await axios.post(
        `${config.API_BASE_URL}/api/user/reset-password`,
        { email, password }
      );

      setAuthMessage(response.data.message);

      setTimeout(() => {
        setAuthMessage("");

        router.replace("/login");
      }, 3000);
    } catch (err) {
      const message = err.response?.data?.message || "Reset password failed";
      setAuthError(message);

      setTimeout(() => {
        setAuthError("");
      }, 3000);
    } finally {
      setAuthLoading(false);
    }
  };

  const uploadProfilePicture = async (role, image) => {
    setAuthLoading(true);

    try {
      const token = await getToken();

      if (!token) {
        return router.replace("/login");
      }

      const formData = new FormData();
      formData.append("file", {
        uri: image,
        type: "image/jpeg",
        name: "upload.jpg",
      });
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const imgResponse = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const response = await axios.put(
        `${config.API_BASE_URL}/api/user/update`,
        { profilePicture: imgResponse.data.url },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAuthMessage(response.data.message);
      await AsyncStorage.setItem("role", role);

      setTimeout(() => {
        setAuthMessage("");

        role === "individual-agent" || role === "company-agent"
          ? router.replace("/agent/dashboard")
          : router.replace("/user/home");
      }, 3000);
    } catch (error) {
      const message = error.response?.data?.message || "Upload failed";
      setAuthError(message);

      setTimeout(() => {
        setAuthError("");
      }, 3000);
    } finally {
      setAuthLoading(false);
    }
  };

  const getUser = async () => {
    try {
      const token = await getToken();

      if (!token) {
        return router.replace("/login");
      }

      const response = await axios.get(`${config.API_BASE_URL}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data.user);
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch user";
      setAuthError(message);

      setTimeout(() => {
        setAuthError("");
      }, 3000);
    }
  };

  const updateProfile = async (user) => {
    setAuthLoading(true);

    try {
      const token = await getToken();

      if (!token) {
        return router.replace("/login");
      }

      const response = await axios.put(
        `${config.API_BASE_URL}/api/user/update`,
        user,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAuthMessage(response.data.message);

      setTimeout(() => {
        setAuthMessage("");

        user.role === "individual-agent" || user.role === "company-agent"
          ? router.replace("/agent/profile")
          : router.replace("/user/profile");
      }, 3000);
    } catch (error) {
      const message = error.response?.data?.message || "Update failed";
      setAuthError(message);

      setTimeout(() => {
        setAuthError("");
      }, 3000);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        authLoading,
        setAuthError,
        authError,
        setAuthMessage,
        authMessage,
        register,
        login,
        forgotPassword,
        verifyOtp,
        resetPassword,
        uploadProfilePicture,
        getUser,
        user,
        setUser,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
