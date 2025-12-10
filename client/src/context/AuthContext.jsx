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
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to validate token and get user data
  const validateToken = useCallback(async (token) => {
    try {
      // Set the token for the request
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      // Use the new auth/me endpoint
      const response = await api.get("/auth/me");

      if (response.data.success) {
        const userData = {
          ...response.data.user,
          id: response.data.user._id || response.data.user.id,
        };

        // Update localStorage with fresh data
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", token);

        // Update vendor profile if exists
        if (response.data.vendorProfile) {
          setVendorProfile(response.data.vendorProfile);
          localStorage.setItem("vendorProfile", JSON.stringify(response.data.vendorProfile));
        } else {
          setVendorProfile(null);
          localStorage.removeItem("vendorProfile");
        }

        return userData;
      }
      return null;
    } catch (err) {
      console.error("Token validation failed:", err);
      
      // Clear invalid tokens
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("vendorProfile");
      
      delete api.defaults.headers.common.Authorization;
      setVendorProfile(null);
      
      return null;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        const vendorProfileData = localStorage.getItem("vendorProfile");

        if (token && userData) {
          try {
            // Parse stored user data first
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            
            // Parse vendor profile if exists
            if (vendorProfileData) {
              const parsedVendorProfile = JSON.parse(vendorProfileData);
              setVendorProfile(parsedVendorProfile);
            }
            
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
            localStorage.removeItem("vendorProfile");
            setUser(null);
            setVendorProfile(null);
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

  // Login function - updated for new backend response format
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // Call the updated backend endpoint
      const response = await api.post("/auth/login", { email, password });
      
      // Check if response has success flag (new format)
      if (!response.data.success) {
        throw new Error(response.data.message || "Login failed");
      }
      
      const { token, user: userData, vendorProfile: vendorData } = response.data;

      // Ensure user data has required fields
      const completeUserData = {
        ...userData,
        id: userData._id || userData.id,
      };

      // Store in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(completeUserData));
      
      // If vendor, store vendor profile info
      if (userData.role === 'vendor' && vendorData) {
        setVendorProfile(vendorData);
        localStorage.setItem("vendorProfile", JSON.stringify(vendorData));
      } else {
        setVendorProfile(null);
        localStorage.removeItem("vendorProfile");
      }

      // Set default authorization header
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      // Update state
      setUser(completeUserData);
      setError(null);

      toast.success("Login successful!");
      
      // Return the complete response including vendor profile
      return {
        success: true,
        user: completeUserData,
        vendorProfile: vendorData
      };
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Login failed. Please check your credentials.";
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Return failure response
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // Register function
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
      
      // Check for success flag
      if (!response.data.success) {
        throw new Error(response.data.message || "Registration failed");
      }
      
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
      return {
        success: true,
        user: completeUserData
      };
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
      
      return {
        success: false,
        message: errorMessage
      };
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

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("vendorProfile");

    // Clear axios headers
    delete api.defaults.headers.common.Authorization;

    // Reset state
    setUser(null);
    setVendorProfile(null);
    setError(null);

    toast.info("Logged out successfully");

    // Redirect to home page
    window.location.href = "/";
  };

  // Update profile function
// In your AuthContext.jsx - Update the updateProfile function
const updateProfile = async (profileData) => {
  setLoading(true);

  try {
    const response = await api.put("/users/profile", profileData);

    // Check for success flag
    if (!response.data.success) {
      throw new Error(response.data.message || "Update failed");
    }

    // Merge updated data with existing user data
    const updatedUser = {
      ...user,
      ...response.data.user,
      id: response.data.user._id || response.data.user.id || user?.id,
    };

    // Update localStorage
    localStorage.setItem("user", JSON.stringify(updatedUser));

    // Update state
    setUser(updatedUser);

    toast.success(response.data.message || "Profile updated successfully!");
    
    return {
      success: true,
      user: updatedUser
    };
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message || "Update failed";
    toast.error(errorMessage);
    
    return {
      success: false,
      message: errorMessage
    };
  } finally {
    setLoading(false);
  }
};

  // Function to refresh vendor profile
  const refreshVendorProfile = async () => {
    if (user?.role !== 'vendor') return null;
    
    try {
      const response = await api.get('/vendors/profile/me');
      
      if (response.data.success) {
        const vendorData = response.data.vendor;
        setVendorProfile(vendorData);
        localStorage.setItem("vendorProfile", JSON.stringify(vendorData));
        return vendorData;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing vendor profile:', error);
      return null;
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

  // Function to check if vendor profile is approved
  const isVendorApproved = () => {
    return vendorProfile?.isApproved === true;
  };

  // Function to check if vendor has completed profile
  const hasVendorProfile = () => {
    return vendorProfile?.hasProfile !== false && vendorProfile?.businessName;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        vendorProfile,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        updateAvatar,
        removeAvatar,
        refreshVendorProfile,
        isAuthenticated: !!user,
        isVendor: user?.role === 'vendor',
        isVendorApproved,
        hasVendorProfile,
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