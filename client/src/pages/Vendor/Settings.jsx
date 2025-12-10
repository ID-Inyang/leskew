// client/src/pages/Vendor/Settings.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import { toast } from 'react-toastify';

const VendorSettings = () => {
  const { user, refreshVendorProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    contactInfo: '',
    serviceCategories: [],
    maxConcurrentAppointments: 1,
    workingHours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { open: '', close: '' }
    }
  });
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      const response = await api.get('/vendors/profile/me'); // FIXED ENDPOINT
      
      if (response.data.success && response.data.vendor) {
        const vendor = response.data.vendor;
        setFormData({
          businessName: vendor.businessName || '',
          address: vendor.address || '',
          contactInfo: vendor.contactInfo || '',
          serviceCategories: vendor.serviceCategories || [],
          maxConcurrentAppointments: vendor.maxConcurrentAppointments || 1,
          workingHours: vendor.workingHours || {
            monday: { open: '09:00', close: '17:00' },
            tuesday: { open: '09:00', close: '17:00' },
            wednesday: { open: '09:00', close: '17:00' },
            thursday: { open: '09:00', close: '17:00' },
            friday: { open: '09:00', close: '17:00' },
            saturday: { open: '10:00', close: '16:00' },
            sunday: { open: '', close: '' }
          }
        });
      } else {
        toast.error(response.data.message || 'Failed to fetch vendor data');
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
      toast.error('Failed to load vendor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxConcurrentAppointments' ? parseInt(value) || 1 : value
    }));
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value
        }
      }
    }));
  };

  const addCategory = () => {
    if (newCategory.trim() && !formData.serviceCategories.includes(newCategory.trim())) {
      setFormData(prev => ({
        ...prev,
        serviceCategories: [...prev.serviceCategories, newCategory.trim()]
      }));
      setNewCategory('');
    }
  };

  const removeCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      serviceCategories: prev.serviceCategories.filter(c => c !== category)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('Submitting vendor data:', formData);
      
      const response = await api.post('/vendors', formData);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Profile updated successfully!');
        
        // Refresh vendor profile in AuthContext
        if (refreshVendorProfile) {
          await refreshVendorProfile();
        }
        
        // Refresh local data
        fetchVendorData();
      } else {
        toast.error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Save vendor error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Settings</h1>
          <p className="text-gray-600 mb-8">Manage your business profile and settings</p>
          
          {user?.role !== 'vendor' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">
                <strong>Note:</strong> You are logged in as a {user?.role}. Vendor settings are only available to vendors.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    required
                    className="input-field"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="Your Business Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Concurrent Appointments
                  </label>
                  <input
                    type="number"
                    name="maxConcurrentAppointments"
                    min="1"
                    max="10"
                    className="input-field"
                    value={formData.maxConcurrentAppointments}
                    onChange={handleInputChange}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    How many customers can you serve simultaneously?
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    className="input-field"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main St, City, State, ZIP"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Information *
                  </label>
                  <input
                    type="text"
                    name="contactInfo"
                    required
                    className="input-field"
                    value={formData.contactInfo}
                    onChange={handleInputChange}
                    placeholder="Phone: +1234567890, Email: contact@business.com"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Include phone number and/or email
                  </p>
                </div>
              </div>
            </div>

            {/* Service Categories */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-6">Service Categories</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Service Category
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g., Haircut, Massage, Consultation"
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    className="btn-primary whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {formData.serviceCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.serviceCategories.map((category, index) => (
                    <div
                      key={index}
                      className="bg-primary-100 text-primary-800 px-4 py-2 rounded-full flex items-center"
                    >
                      {category}
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        className="ml-2 text-primary-600 hover:text-primary-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No service categories added yet.</p>
              )}
            </div>

            {/* Working Hours */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-6">Working Hours</h2>
              <div className="space-y-4">
                {days.map(day => (
                  <div key={day.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="font-medium w-32">{day.label}</div>
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">Open</label>
                        <input
                          type="time"
                          className="input-field w-32"
                          value={formData.workingHours[day.key].open}
                          onChange={(e) => handleWorkingHoursChange(day.key, 'open', e.target.value)}
                        />
                      </div>
                      <div className="text-gray-400">to</div>
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">Close</label>
                        <input
                          type="time"
                          className="input-field w-32"
                          value={formData.workingHours[day.key].close}
                          onChange={(e) => handleWorkingHoursChange(day.key, 'close', e.target.value)}
                        />
                      </div>
                      <div className="ml-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded text-primary-600"
                            checked={!formData.workingHours[day.key].open && !formData.workingHours[day.key].close}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleWorkingHoursChange(day.key, 'open', '');
                                handleWorkingHoursChange(day.key, 'close', '');
                              } else {
                                handleWorkingHoursChange(day.key, 'open', '09:00');
                                handleWorkingHoursChange(day.key, 'close', '17:00');
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-600">Closed</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-8 py-3"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Wrap with ProtectedRoute
const VendorSettingsWrapper = () => (
  <ProtectedRoute allowedRoles={['vendor']}>
    <VendorSettings />
  </ProtectedRoute>
);

export default VendorSettingsWrapper;