import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Get backend URL from environment variable
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('suckdsa_token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/auth/me`);
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      });

      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('suckdsa_token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || 'Login failed!' 
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name,
        email,
        password
      });

      // Check if registration is complete (production mode)
      if (response.data.token) {
        // Auto-login user
        const token = response.data.token;
        localStorage.setItem('suckdsa_token', token);
        setToken(token);
        setUser(response.data.user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        return { 
          success: true, 
          message: response.data.message,
          autoLogin: true
        };
      }

      // OTP flow (development mode)
      return { 
        success: true, 
        message: response.data.message,
        email: response.data.email 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || 'Registration failed!' 
      };
    }
  };

  const verifyOTP = async (email, otp, name, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, {
        email,
        otp,
        name,
        password
      });

      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('suckdsa_token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || 'OTP verification failed!' 
      };
    }
  };

  const resendOTP = async (email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/resend-otp`, {
        email
      });

      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to resend OTP!' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('suckdsa_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    loading,
    login,
    register,
    verifyOTP,
    resendOTP,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
