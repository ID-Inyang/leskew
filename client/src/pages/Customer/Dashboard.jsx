// client/src/pages/Customer/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import api from "../../utils/api";
import ProtectedRoute from "../../components/ProtectedRoute";
import Avatar from "../../components/Avatar";

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { joinVendorQueueRoom, leaveVendorQueueRoom } = useSocket();
  const [activeTab, setActiveTab] = useState("queue");
  const [appointments, setAppointments] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Join queue rooms for all vendors where user is in queue
    queueEntries.forEach((entry) => {
      joinVendorQueueRoom(entry.vendorId);
    });

    return () => {
      queueEntries.forEach((entry) => {
        leaveVendorQueueRoom(entry.vendorId);
      });
    };
  }, [queueEntries, joinVendorQueueRoom, leaveVendorQueueRoom]);

  const fetchData = async () => {
    try {
      const [appointmentsRes, queueRes] = await Promise.all([
        api.get("/appointments/user"),
        api.get("/queue/user"),
      ]);
      setAppointments(appointmentsRes.data);
      setQueueEntries(queueRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const leaveQueue = async (queueId) => {
    try {
      await api.put(`/queue/${queueId}/status`, { status: "left" });
      setQueueEntries((prev) => prev.filter((entry) => entry._id !== queueId));
      alert("Left queue successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to leave queue");
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      // Mark appointment as canceled on the server
      await api.put(`/appointments/${appointmentId}/status`, {
        status: "canceled",
      });

      // Update local state to reflect cancellation
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === appointmentId ? { ...a, status: "canceled" } : a
        )
      );

      alert("Appointment canceled");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to cancel appointment");
    }
  };

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
        {/* Header */}
        // Replace the header section with this:
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
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Current Queue Position
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {queueEntries.filter((q) => q.status === "waiting").length}
            </p>
            <p className="text-sm text-gray-500 mt-2">Active queues</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Upcoming Appointments
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {appointments.filter((a) => a.status === "booked").length}
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
              Active Queues
            </button>
            <button
              className={`py-3 px-1 font-medium text-sm ${
                activeTab === "appointments"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("appointments")}
            >
              Appointments
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
            {queueEntries.filter((q) => q.status === "waiting").length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-500 mb-4">You're not in any queues</p>
                <Link to="/" className="btn-primary">
                  Find Businesses
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {queueEntries
                  .filter((q) => q.status === "waiting")
                  .map((entry) => (
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
                              {entry.vendorId?.businessName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {entry.vendorId?.address}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary-600">
                            #{entry.position}
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
                            {entry.estimatedWaitTime} min
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Joined</div>
                          <div className="font-semibold">
                            {new Date(entry.joinTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
            {appointments.filter((a) => a.status === "booked").length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-gray-500 mb-4">No upcoming appointments</p>
                <Link to="/" className="btn-primary">
                  Book Now
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments
                  .filter((a) => a.status === "booked")
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
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
                              {appointment.vendorId?.businessName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {appointment.vendorId?.address}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {appointment.vendorId?.businessName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {appointment.vendorId?.address}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {new Date(appointment.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.timeSlot.start} -{" "}
                            {appointment.timeSlot.end}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          {appointment.status}
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
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((appointment) => (
                    <div
                      key={appointment._id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">
                            {appointment.vendorId?.businessName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {appointment.vendorId?.address}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(appointment.date).toLocaleDateString()} •{" "}
                            {appointment.timeSlot.start}
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
                          {appointment.status}
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
