// client/src/pages/Shared/Profile.jsx - CLEAN VERSION
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import Avatar from '../../components/Avatar';

const Profile = () => {
  const { user, updateProfile, logout, updateAvatar, removeAvatar } = useAuth();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Maximum 5MB allowed.');
      return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, GIF, or WebP image.');
      return;
    }
    
    setAvatarLoading(true);
    
    try {
      // Use the updateAvatar function from AuthContext if available
      if (updateAvatar) {
        const result = await updateAvatar(file);
        if (result) {
          toast.success('Profile picture updated!');
        }
      } else {
        // Fallback to direct API call
        const formData = new FormData();
        formData.append('avatar', file);
        
        const response = await api.put('/users/avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (response.data.success) {
          toast.success('Profile picture updated!');
        } else {
          toast.error(response.data.message || 'Failed to upload image');
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload image';
      toast.error(errorMessage);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove profile picture?')) return;
    
    try {
      // Use the removeAvatar function from AuthContext if available
      if (removeAvatar) {
        const result = await removeAvatar();
        if (result) {
          toast.success('Profile picture removed');
        }
      } else {
        // Fallback to direct API call
        const response = await api.delete('/users/avatar');
        if (response.data.success) {
          toast.success('Profile picture removed');
        } else {
          toast.error(response.data.message || 'Failed to remove image');
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove image';
      toast.error(errorMessage);
    }
  };

  // Handle form submission with new response format
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Call the updateProfile function from AuthContext
      const result = await updateProfile(profileData);
      
      if (result && result.success) {
        // Success message is already shown by the updateProfile function
        console.log('Profile updated successfully:', result.user);
      } else if (result) {
        // Error message is already shown by the updateProfile function
        console.error('Profile update failed:', result.message);
      }
    } catch (error) {
      // Fallback error handling
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Password change section component
  const PasswordChangeSection = () => {
    const [passwordData, setPasswordData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const handlePasswordChange = async (e) => {
      e.preventDefault();
      setPasswordLoading(true);
      setPasswordError('');

      // Validate passwords match
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match');
        setPasswordLoading(false);
        return;
      }

      // Validate password strength
      if (passwordData.newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters');
        setPasswordLoading(false);
        return;
      }

      try {
        // Direct API call for password change
        const response = await api.put('/users/profile', {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        });

        if (response.data.success) {
          toast.success('Password updated successfully!');
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          setPasswordError('');
        } else {
          setPasswordError(response.data.message || 'Failed to update password');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update password';
        setPasswordError(errorMessage);
      } finally {
        setPasswordLoading(false);
      }
    };

    return (
      <div className="card mt-6">
        <h2 className="text-xl font-semibold mb-6">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-6">
          {passwordError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg">
              {passwordError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              required
              className="input-field"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              required
              className="input-field"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            />
            <p className="text-sm text-gray-500 mt-1">
              Must be at least 6 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              className="input-field"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="btn-primary px-6 py-3"
            >
              {passwordLoading ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600 mb-8">Manage your account information</p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Profile Form */}
            <div className="md:col-span-2 space-y-6">
              {/* Avatar Upload Section */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Profile Picture</h2>
                <div className="flex items-center space-x-6">
                  <Avatar user={user} size="xl" />
                  <div className="space-y-3">
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAvatarUpload(e.target.files[0])}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        disabled={avatarLoading}
                        className="btn-primary px-4 py-2"
                      >
                        {avatarLoading ? 'Uploading...' : 'Upload New Picture'}
                      </button>
                      <p className="text-sm text-gray-500 mt-1">
                        JPG, PNG, GIF, WebP up to 5MB
                      </p>
                    </div>
                    {user.avatar?.url && !user.avatar.url.includes('ui-avatars.com') && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove Picture
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information Form */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="input-field"
                      value={profileData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="input-field"
                      value={profileData.email}
                      onChange={handleChange}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      You can change your email (will be verified)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      className="input-field"
                      value={profileData.phone}
                      onChange={handleChange}
                      placeholder="+1234567890"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary px-6 py-3"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Add Password Change Section */}
              <PasswordChangeSection />
            </div>

            {/* Account Info Sidebar */}
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Account Information</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Account Type</div>
                    <div className="font-medium capitalize">{user.role}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Member Since</div>
                    <div className="font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">User ID</div>
                    <div className="font-medium text-sm truncate">{user.id || user._id || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Account Actions</h2>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    Sign Out
                  </button>
                  <button 
                    type="button"
                    onClick={() => toast.info('Account deletion feature coming soon')}
                    className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    Delete Account
                  </button>
                </div>
              </div>

              {user.role === 'vendor' && (
                <div className="mt-6">
                  <a
                    href="/vendor/settings"
                    className="block text-center btn-primary"
                  >
                    Vendor Settings
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap with ProtectedRoute
const ProfileWrapper = () => (
  <ProtectedRoute>
    <Profile />
  </ProtectedRoute>
);

export default ProfileWrapper;