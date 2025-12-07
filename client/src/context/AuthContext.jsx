// client/src/context/AuthContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { toast } from "react-toastify";
import api from "../utils/api";

const AuthContext = createContext();

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Auth provider component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to validate token and get user data
  const validateToken = useCallback(async (token) => {
    try {
      // Set the token for the request
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      // Make a request to validate the token and get fresh user data
      // Note: This endpoint might need to be created or use a different one
      const response = await api.get("/users/profile");

      if (response.data) {
        const userData = {
          ...response.data,
          // Ensure we have the id field (some APIs use _id)
          id: response.data._id || response.data.id,
        };

        // Update localStorage with fresh data
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", token);

        return userData;
      }
      return null;
    } catch (err) {
      console.error("Token validation failed:", err);
      // Clear invalid tokens
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete api.defaults.headers.common.Authorization;
      return null;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (token && userData) {
          try {
            // Parse stored user data first
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            
            // Then validate in background
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
            const validatedUser = await validateToken(token);
            
            if (validatedUser) {
              setUser(validatedUser);
            }
          } catch (parseError) {
            console.error("Error parsing user data:", parseError);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setError("Failed to initialize authentication");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [validateToken]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user: userData } = response.data;

      // Ensure user data has required fields
      const completeUserData = {
        ...userData,
        id: userData._id || userData.id,
      };

      // Store in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(completeUserData));

      // Set default authorization header
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      // Update state
      setUser(completeUserData);
      setError(null);

      toast.success("Login successful!");
      return completeUserData;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Login failed. Please check your credentials.";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData, avatarFile = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Append all user data
      Object.keys(userData).forEach(key => {
        if (key === 'serviceCategories' && Array.isArray(userData[key])) {
          userData[key].forEach(item => formData.append(key, item));
        } else if (userData[key] !== null && userData[key] !== undefined) {
          formData.append(key, userData[key]);
        }
      });
      
      // Append avatar file if exists
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      
      const response = await api.post('/auth/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { token, user: userDataResponse } = response.data;
      
      // Ensure user data has required fields
      const completeUserData = {
        ...userDataResponse,
        id: userDataResponse._id || userDataResponse.id
      };
      
      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(completeUserData));
      
      // Set default authorization header
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      
      // Update state
      setUser(completeUserData);
      setError(null);
      
      toast.success('Registration successful!');
      return completeUserData;
    } catch (err) {
      let errorMessage = 'Registration failed';
      
      if (err.response?.data?.errors) {
        // Handle validation errors from express-validator
        errorMessage = err.response.data.errors
          .map((errItem) => errItem.msg)
          .join(', ');
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add avatar upload function
  const updateAvatar = async (avatarFile) => {
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      const response = await api.put('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update user with new avatar
      const updatedUser = {
        ...user,
        avatar: response.data.avatar
      };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      toast.success('Profile picture updated!');
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to upload image';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add function to remove avatar
  const removeAvatar = async () => {
    try {
      const response = await api.delete('/users/avatar');
      
      // Update user with default avatar
      const updatedUser = {
        ...user,
        avatar: response.data.avatar
      };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      toast.success('Profile picture removed');
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to remove image';
      toast.error(errorMessage);
      throw err;
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Clear axios headers
    delete api.defaults.headers.common.Authorization;

    // Reset state
    setUser(null);
    setError(null);

    toast.info("Logged out successfully");

    // Optional: Redirect to home page
    window.location.href = "/";
  };

  const updateProfile = async (profileData) => {
    setLoading(true);

    try {
      const response = await api.put("/users/profile", profileData);

      // Merge updated data with existing user data
      const updatedUser = {
        ...user,
        ...response.data,
        id: response.data._id || response.data.id || user?.id,
      };

      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Update state
      setUser(updatedUser);

      toast.success("Profile updated successfully!");
      return updatedUser;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Update failed";
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Function to check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Function to check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        updateAvatar,
        removeAvatar,
        isAuthenticated: !!user,
        hasRole,
        hasAnyRole,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Named exports
export { AuthProvider, useAuth };