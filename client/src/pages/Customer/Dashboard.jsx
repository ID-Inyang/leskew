// client/src/pages/Customer/Dashboard.jsx - FIXED VERSION
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import api from "../../utils/api";
import ProtectedRoute from "../../components/ProtectedRoute";
import Avatar from "../../components/Avatar";
import { toast } from "react-toastify";

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { joinVendorQueueRoom, leaveVendorQueueRoom } = useSocket();
  const [activeTab, setActiveTab] = useState("queue");
  const [appointments, setAppointments] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Join queue rooms for all vendors where user is in queue
    if (Array.isArray(queueEntries)) {
      queueEntries.forEach((entry) => {
        if (entry && entry.vendorId) {
          joinVendorQueueRoom(entry.vendorId);
        }
      });
    }

    return () => {
      if (Array.isArray(queueEntries)) {
        queueEntries.forEach((entry) => {
          if (entry && entry.vendorId) {
            leaveVendorQueueRoom(entry.vendorId);
          }
        });
      }
    };
  }, [queueEntries, joinVendorQueueRoom, leaveVendorQueueRoom]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [appointmentsRes, queueRes] = await Promise.all([
        api.get("/appointments/user"),
        api.get("/queue/user"),
      ]);
      
      // Handle appointments response - check for success flag
      let appointmentsData = [];
      if (appointmentsRes.data) {
        if (appointmentsRes.data.success && appointmentsRes.data.appointments) {
          appointmentsData = appointmentsRes.data.appointments;
        } else if (Array.isArray(appointmentsRes.data)) {
          appointmentsData = appointmentsRes.data;
        }
      }
      setAppointments(appointmentsData);
      
      // Handle queue response - check for success flag
      let queueData = [];
      if (queueRes.data) {
        if (queueRes.data.success && queueRes.data.queueEntries) {
          queueData = queueRes.data.queueEntries;
        } else if (Array.isArray(queueRes.data)) {
          queueData = queueRes.data;
        } else if (queueRes.data.queueEntries) {
          queueData = queueRes.data.queueEntries;
        }
      }
      
      console.log("Queue data received:", queueData);
      setQueueEntries(queueData);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load dashboard data");
      toast.error("Failed to load your dashboard");
    } finally {
      setLoading(false);
    }
  };

// Updated leaveQueue function
const leaveQueue = async (queueId) => {
  try {
    // Use the CUSTOMER-specific endpoint
    const response = await api.put(`/queue/${queueId}/leave`);
    
    if (response.data.success) {
      // Update local state
      setQueueEntries((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.filter((entry) => entry._id !== queueId);
      });
      
      toast.success(response.data.message || "Left queue successfully");
    } else {
      toast.error(response.data.message || "Failed to leave queue");
    }
  } catch (error) {
    console.error('Leave queue error:', error);
    
    // Show user-friendly error
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        "Failed to leave queue";
    toast.error(errorMessage);
    
    // If it's a 403 error, explain it to the user
    if (error.response?.status === 403) {
      toast.info("Please use the 'Leave Queue' button instead of the vendor controls");
    }
  }
};

const cancelAppointment = async (appointmentId) => {
  try {
    // CORRECT: Use the /cancel endpoint
    const response = await api.put(`/appointments/${appointmentId}/cancel`);
    
    // Check for success response
    if (response.data) {
      // Update local state to reflect cancellation
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === appointmentId ? { ...a, status: "canceled" } : a
        )
      );
      
      toast.success(response.data.message || "Appointment canceled successfully");
    } else {
      toast.error("Failed to cancel appointment");
    }
  } catch (error) {
    console.error('Cancel appointment error:', error);
    
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        "Failed to cancel appointment";
    toast.error(errorMessage);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={fetchData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Ensure queueEntries is always an array for safe filtering
  const safeQueueEntries = Array.isArray(queueEntries) ? queueEntries : [];
  const waitingQueueEntries = safeQueueEntries.filter((q) => q && q.status === "waiting");
  const bookedAppointments = Array.isArray(appointments) ? 
    appointments.filter((a) => a && a.status === "booked") : [];

  // Check if we're in development mode - works with Vite and Create React App
  const isDevelopment = import.meta.env?.DEV || import.meta.env?.MODE === 'development';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <Avatar user={user} size="xl" />
            <div className="ml-6">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600">
                Manage your appointments and queues
              </p>
            </div>
          </div>
        </div>
        
        {/* Debug info - only shown in development */}
        {isDevelopment && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm">
            <p>Queue entries: {safeQueueEntries.length} items</p>
            <p>Appointments: {appointments.length} items</p>
            <button 
              onClick={() => console.log('Queue data:', safeQueueEntries)}
              className="mt-1 text-blue-600 hover:text-blue-800"
            >
              Log queue data
            </button>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Current Queue Position
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {waitingQueueEntries.length}
            </p>
            <p className="text-sm text-gray-500 mt-2">Active queues</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Upcoming Appointments
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {bookedAppointments.length}
            </p>
            <p className="text-sm text-gray-500 mt-2">Booked services</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Total Services
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {appointments.length}
            </p>
            <p className="text-sm text-gray-500 mt-2">All time</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              className={`py-3 px-1 font-medium text-sm ${
                activeTab === "queue"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("queue")}
            >
              Active Queues ({waitingQueueEntries.length})
            </button>
            <button
              className={`py-3 px-1 font-medium text-sm ${
                activeTab === "appointments"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("appointments")}
            >
              Appointments ({bookedAppointments.length})
            </button>
            <button
              className={`py-3 px-1 font-medium text-sm ${
                activeTab === "history"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("history")}
            >
              History
            </button>
          </nav>
        </div>
        
        {/* Queue Tab */}
        {activeTab === "queue" && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Active Queues</h2>
            {waitingQueueEntries.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-500 mb-4">You're not in any queues</p>
                <Link to="/" className="btn-primary">
                  Find Businesses
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {waitingQueueEntries.map((entry) => (
                  <div
                    key={entry._id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <Avatar
                          user={
                            entry.vendorId?.userId || {
                              name: entry.vendorId?.businessName,
                            }
                          }
                          size="md"
                          className="mr-4"
                        />
                        <div>
                          <h3 className="font-semibold">
                            {entry.vendorId?.businessName || "Unknown Business"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {entry.vendorId?.address || "No address"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">
                          #{entry.position || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">Position</div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">
                          Estimated Wait Time
                        </div>
                        <div className="font-semibold">
                          {entry.estimatedWaitTime || 0} min
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Joined</div>
                        <div className="font-semibold">
                          {entry.joinTime ? 
                            new Date(entry.joinTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            }) : "N/A"
                          }
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => leaveQueue(entry._id)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Leave Queue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Appointments Tab */}
        {activeTab === "appointments" && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">
              Upcoming Appointments
            </h2>
            {bookedAppointments.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-gray-500 mb-4">No upcoming appointments</p>
                <Link to="/" className="btn-primary">
                  Book Now
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookedAppointments
                  .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
                  .map((appointment) => (
                    <div
                      key={appointment._id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <Avatar
                            user={
                              appointment.vendorId?.userId || {
                                name: appointment.vendorId?.businessName,
                              }
                            }
                            size="md"
                            className="mr-4"
                          />
                          <div>
                            <h3 className="font-semibold">
                              {appointment.vendorId?.businessName || "Unknown Business"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {appointment.vendorId?.address || "No address"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {appointment.date ? 
                              new Date(appointment.date).toLocaleDateString() : "No date"
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.timeSlot?.start || "N/A"} -{" "}
                            {appointment.timeSlot?.end || "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          {appointment.status || "unknown"}
                        </span>
                        <button
                          onClick={() => cancelAppointment(appointment._id)}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === "history" && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Service History</h2>
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-500">No service history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments
                  .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                  .map((appointment) => (
                    <div
                      key={appointment._id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">
                            {appointment.vendorId?.businessName || "Unknown Business"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {appointment.vendorId?.address || "No address"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {appointment.date ? 
                              new Date(appointment.date).toLocaleDateString() : "No date"
                            } • {appointment.timeSlot?.start || "N/A"}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-sm rounded-full ${
                            appointment.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : appointment.status === "canceled"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {appointment.status || "unknown"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="mt-8 card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              to="/"
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="font-semibold">Find Businesses</h3>
              <p className="text-sm text-gray-600 mt-1">
                Browse and book services
              </p>
            </Link>
            <Link
              to="/profile"
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div className="text-3xl mb-2">👤</div>
              <h3 className="font-semibold">Profile Settings</h3>
              <p className="text-sm text-gray-600 mt-1">
                Update your information
              </p>
            </Link>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-semibold">Get Notifications</h3>
              <p className="text-sm text-gray-600 mt-1">
                Enable browser notifications
              </p>
            </div>
          </div>
        </div>
        
        {/* Refresh button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchData}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ↻ Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

// Wrap with ProtectedRoute
const CustomerDashboardWrapper = () => (
  <ProtectedRoute allowedRoles={["customer"]}>
    <CustomerDashboard />
  </ProtectedRoute>
);

export default CustomerDashboardWrapper;