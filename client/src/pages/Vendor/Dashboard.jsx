// client/src/pages/Vendor/Dashboard.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import api from "../../utils/api";
import ProtectedRoute from "../../components/ProtectedRoute";
import Avatar from "../../components/Avatar";
import { toast } from "react-toastify";

const VendorDashboard = () => {
  const { user: _user, vendorProfile: _vendorProfile } = useAuth();
  const { socket, queueUpdates } = useSocket();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState(null);
  const [callingCustomer, setCallingCustomer] = useState(false);

  // Fetch all initial data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get vendor profile
      const vendorRes = await api.get("/vendors/profile/me");
      
      if (vendorRes.data.success && vendorRes.data.vendor) {
        const vendorData = vendorRes.data.vendor;
        setVendor(vendorData);

        // Get appointments for today
        const today = new Date().toISOString().split("T")[0];
        const appointmentsRes = await api.get(
          `/vendors/${vendorData._id}/appointments?date=${today}`
        );
        setAppointments(appointmentsRes.data);

        // Get queue
        const queueRes = await api.get(`/vendors/${vendorData._id}/queue`);
        setQueue(queueRes.data);

        // Get analytics/stats
        try {
          const statsRes = await api.get(`/vendors/${vendorData._id}/analytics`);
          if (statsRes.data) {
            setStats(statsRes.data);
          }
        } catch (statsError) {
          console.warn("Could not fetch analytics:", statsError);
          // Don't fail if analytics fail
        }
      } else {
        throw new Error(vendorRes.data.message || 'Failed to load vendor profile');
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Socket room management
  useEffect(() => {
    if (vendor && socket) {
      console.log('Joining vendor queue room:', vendor._id);
      socket.emit("join-vendor-queue", vendor._id);
    }

    return () => {
      if (vendor && socket) {
        console.log('Leaving vendor queue room:', vendor._id);
        socket.emit("leave-vendor-queue", vendor._id);
      }
    };
  }, [vendor, socket]);

  // Listen for queue updates - FIXED
  useEffect(() => {
    if (vendor && queueUpdates[vendor._id]) {
      console.log('Queue update received:', queueUpdates[vendor._id]);
      // Fetch queue directly to avoid dependency issues
      const fetchQueueUpdate = async () => {
        try {
          const res = await api.get(`/vendors/${vendor._id}/queue`);
          console.log('Queue fetched from update:', res.data.length, 'entries');
          setQueue(res.data);
        } catch (error) {
          console.error("Error fetching queue update:", error);
        }
      };
      fetchQueueUpdate();
    }
  }, [queueUpdates, vendor]);

  // Call next customer
  const callNextCustomer = async () => {
    if (queue.length === 0 || callingCustomer) {
      toast.info("Queue is empty");
      return;
    }

    const nextCustomer = queue[0];
    if (!nextCustomer || !nextCustomer._id) {
      toast.error("Invalid queue entry");
      return;
    }

    setCallingCustomer(true);
    
    try {
      console.log('Calling customer:', nextCustomer._id);
      
      // Call the API
      const response = await api.put(`/queue/${nextCustomer._id}/call`);
      
      if (response.data) {
        toast.success(`Called ${nextCustomer.customerId?.name || 'customer'}`);
        
        // Optimistic update: remove the called customer from queue
        setQueue(prevQueue => prevQueue.filter(entry => entry._id !== nextCustomer._id));
        
        // Fetch fresh queue data after a short delay
        setTimeout(() => {
          // Direct API call to refresh queue
          api.get(`/vendors/${vendor._id}/queue`)
            .then(res => setQueue(res.data))
            .catch(err => console.error("Error refreshing queue:", err));
        }, 1000);
        
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Call customer error:', error);
      
      // Show user-friendly error
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          "Failed to call customer";
      toast.error(errorMessage);
      
      // Revert optimistic update on error
      if (vendor) {
        api.get(`/vendors/${vendor._id}/queue`)
          .then(res => setQueue(res.data))
          .catch(err => console.error("Error reverting queue:", err));
      }
    } finally {
      setCallingCustomer(false);
    }
  };

  // Update queue status (served, skipped, left)
  const updateQueueStatus = async (queueId, status) => {
    if (!queueId) return;
    
    try {
      console.log(`Updating queue ${queueId} to ${status}`);
      
      const response = await api.put(`/queue/${queueId}/status`, { status });
      
      if (response.data) {
        toast.success(`Customer marked as ${status}`);
        
        // Optimistic update
        if (status === 'served' || status === 'left' || status === 'skipped') {
          setQueue(prevQueue => prevQueue.filter(entry => entry._id !== queueId));
        }
        
        // Refresh queue after a delay
        setTimeout(() => {
          if (vendor) {
            api.get(`/vendors/${vendor._id}/queue`)
              .then(res => setQueue(res.data))
              .catch(err => console.error("Error refreshing queue:", err));
          }
        }, 500);
      }
    } catch (error) {
      console.error('Update queue status error:', error);
      toast.error(error.response?.data?.message || "Failed to update status");
      // Revert on error
      if (vendor) {
        api.get(`/vendors/${vendor._id}/queue`)
          .then(res => setQueue(res.data))
          .catch(err => console.error("Error reverting queue:", err));
      }
    }
  };

  // Update appointment status - FIXED
  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      if (status === "canceled") {
        // Use the correct endpoint
        const response = await api.put(`/appointments/${appointmentId}/cancel`);
        
        if (response.data && response.data.success) {
          toast.success(response.data.message || "Appointment canceled");
          
          // ✅ FIXED: Use fetchAllData instead of fetchData
          fetchAllData(); // Refresh dashboard
          
          // Also update local state immediately
          setAppointments(prev => 
            prev.map(appt => 
              appt._id === appointmentId 
                ? { ...appt, status: 'canceled' } 
                : appt
            )
          );
        } else {
          toast.error(response.data?.message || "Failed to cancel appointment");
        }
      }
    } catch (error) {
      console.error('Update appointment error:', error);
      toast.error(error.response?.data?.message || "Failed to update appointment");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchAllData}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No vendor profile
  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Vendor Profile Not Found</h2>
          <p className="text-gray-600 mb-6">
            Please complete your vendor profile setup to access the dashboard.
          </p>
          <a href="/vendor/settings" className="btn-primary">
            Complete Profile Setup
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Note: Your vendor profile needs admin approval before it appears publicly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {vendor.businessName}
              </h1>
              <p className="text-gray-600">Vendor Dashboard</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {vendor.serviceCategories?.map((category, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                    {category}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                  vendor.isApproved
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {vendor.isApproved ? "Approved" : "Pending Approval"}
              </span>
              <p className="text-sm text-gray-500 mt-2">
                {vendor.isApproved 
                  ? "Your profile is visible to customers" 
                  : "Your profile will be visible after admin approval"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Queue Length
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {queue.length}
            </p>
            <p className="text-sm text-gray-500 mt-2">Customers waiting</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Today's Appointments
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {appointments.filter((a) => a.status === "booked").length}
            </p>
            <p className="text-sm text-gray-500 mt-2">Booked slots</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Avg Wait Time
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {stats.todayStats?.queue?.avgWaitTime?.toFixed(1) || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Minutes</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Total Served
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {stats.todayStats?.queue?.totalServed || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Today</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Queue Management */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Current Queue</h2>
              <button
                onClick={callNextCustomer}
                disabled={queue.length === 0 || callingCustomer}
                className={`btn-primary ${
                  (queue.length === 0 || callingCustomer) ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {callingCustomer ? "Calling..." : "Call Next Customer"}
              </button>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-500">No customers in queue</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((entry, index) => (
                  <div
                    key={entry._id || index}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        {/* Show queue position */}
                        <div className="w-8 h-8 bg-primary-100 text-primary-800 rounded-full flex items-center justify-center font-bold mr-3">
                          {index + 1}
                        </div>
                        <Avatar
                          user={entry.customerId || { name: "Customer" }}
                          size="sm"
                          className="mr-3"
                        />
                        <div>
                          <h3 className="font-semibold">
                            {entry.customerId?.name || "Unknown Customer"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {entry.customerId?.phone || "No phone"}
                          </p>
                          <div className="text-sm text-gray-500">
                            Joined:{" "}
                            {new Date(entry.joinTime).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary-600">
                          {entry.estimatedWaitTime || 0} min
                        </div>
                        <div className="text-sm text-gray-500">Est. wait</div>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => updateQueueStatus(entry._id, "served")}
                        className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded hover:bg-green-200 transition-colors"
                      >
                        Mark Served
                      </button>
                      <button
                        onClick={() => updateQueueStatus(entry._id, "skipped")}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded hover:bg-yellow-200 transition-colors"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => updateQueueStatus(entry._id, "left")}
                        className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200 transition-colors"
                      >
                        Mark Left
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Appointments */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Today's Appointments</h2>

            {appointments.filter((a) => a.status === "booked").length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-gray-500">No appointments today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments
                  .filter((a) => a.status === "booked")
                  .sort((a, b) =>
                    a.timeSlot?.start?.localeCompare(b.timeSlot?.start || '') || 0
                  )
                  .map((appointment) => (
                    <div
                      key={appointment._id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      {/* Appointment Info with Avatar */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <Avatar
                            user={
                              appointment.customerId || { name: "Customer" }
                            }
                            size="sm"
                            className="mr-3"
                          />
                          <div>
                            <h3 className="font-semibold">
                              {appointment.customerId?.name ||
                                "Unknown Customer"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {appointment.customerId?.phone || "No phone"}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Service: {appointment.serviceId || 'General'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {appointment.timeSlot?.start || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">Time</div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() =>
                            updateAppointmentStatus(appointment._id, "canceled")
                          }
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <a href="/vendor/settings" className="btn-primary">
            Edit Profile
          </a>
          <button 
            onClick={fetchAllData}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Refresh Dashboard
          </button>
        </div>
        
        {/* Debug info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p>Vendor ID: {vendor?._id}</p>
            <p>Queue length: {queue?.length}</p>
            <p>Socket connected: {socket?.connected ? 'Yes' : 'No'}</p>
            <p>Calling customer: {callingCustomer ? 'Yes' : 'No'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap with ProtectedRoute
const VendorDashboardWrapper = () => (
  <ProtectedRoute allowedRoles={["vendor"]}>
    <VendorDashboard />
  </ProtectedRoute>
);

export default VendorDashboardWrapper;