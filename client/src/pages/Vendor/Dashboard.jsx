// client/src/pages/Vendor/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import api from "../../utils/api";
import ProtectedRoute from "../../components/ProtectedRoute";
import Avatar from "../../components/Avatar";

const VendorDashboard = () => {
  const { user: _user } = useAuth();
  const { socket, queueUpdates } = useSocket();
  const [loading, setLoading] = useState(true);
  const [stats, _setStats] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [vendor, setVendor] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (vendor && socket) {
      socket.emit("join-vendor-queue", vendor._id);
    }

    return () => {
      if (vendor && socket) {
        socket.emit("leave-vendor-queue", vendor._id);
      }
    };
  }, [vendor, socket]);

  const fetchQueue = useCallback(async () => {
    if (!vendor) return;
    try {
      const res = await api.get(`/vendors/${vendor._id}/queue`);
      setQueue(res.data);
    } catch (error) {
      console.error("Error fetching queue:", error);
    }
  }, [vendor]);

  useEffect(() => {
    if (vendor && queueUpdates[vendor._id]) {
      fetchQueue();
    }
  }, [queueUpdates, vendor, fetchQueue]);

  const fetchData = async () => {
    try {
      // Get vendor profile
      const vendorRes = await api.get("/vendors/profile");
      setVendor(vendorRes.data);

      // Get appointments for today
      const today = new Date().toISOString().split("T")[0];
      const appointmentsRes = await api.get(
        `/vendors/${vendorRes.data._id}/appointments?date=${today}`
      );
      setAppointments(appointmentsRes.data);

      // Get queue
      const queueRes = await api.get(`/vendors/${vendorRes.data._id}/queue`);
      setQueue(queueRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const callNextCustomer = async () => {
    if (queue.length === 0) {
      alert("Queue is empty");
      return;
    }

    const nextCustomer = queue[0];
    try {
      await api.put(`/queue/${nextCustomer._id}/call`);
      alert(`Called ${nextCustomer.customerId.name}`);
      fetchQueue();
      fetchData(); // Refresh all data
    } catch (error) {
      alert(error.response?.data?.message || "Failed to call customer");
    }
  };

  const updateQueueStatus = async (queueId, status) => {
    try {
      await api.put(`/queue/${queueId}/status`, { status });
      fetchQueue();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status");
    }
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      if (status === "canceled") {
        await api.put(`/appointments/${appointmentId}/cancel`);
      }
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update appointment");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Vendor Profile Not Found</h2>
          <p className="text-gray-600 mb-6">
            Please complete your vendor profile setup.
          </p>
          <a href="/vendor/settings" className="btn-primary">
            Complete Profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {vendor.businessName}
              </h1>
              <p className="text-gray-600">Vendor Dashboard</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  vendor.isApproved
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {vendor.isApproved ? "Approved" : "Pending Approval"}
              </span>
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
              {stats.queueStats?.avgWaitTime?.toFixed(1) || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Minutes</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Total Served
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {stats.queueStats?.totalQueue || 0}
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
                disabled={queue.length === 0}
                className={`btn-primary ${
                  queue.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Call Next Customer
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
                    key={entry._id}
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
                          {entry.estimatedWaitTime} min
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
                    a.timeSlot.start.localeCompare(b.timeSlot.start)
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
                              Service: {appointment.serviceId}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {appointment.timeSlot.start}
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

        {/* Quick Stats */}
        <div className="mt-8 card">
          <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Peak Hours
              </h3>
              <p className="text-2xl font-semibold">10 AM - 12 PM</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Service Completion
              </h3>
              <p className="text-2xl font-semibold">92%</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Customer Satisfaction
              </h3>
              <p className="text-2xl font-semibold">4.5/5</p>
            </div>
          </div>
        </div>
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
