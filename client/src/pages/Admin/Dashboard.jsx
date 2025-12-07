// client/src/pages/Admin/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import ProtectedRoute from "../../components/ProtectedRoute";
import Avatar from "../../components/Avatar";

const AdminDashboard = () => {
  const { user: _user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [pendingVendors, setPendingVendors] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, vendorsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/vendors/pending"),
      ]);
      setStats(statsRes.data);
      setPendingVendors(vendorsRes.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVendorAction = async (vendorId, action) => {
    try {
      if (action === "approve") {
        await api.put(`/admin/vendors/${vendorId}/approve`);
        alert("Vendor approved successfully");
      } else if (action === "suspend") {
        await api.put(`/admin/vendors/${vendorId}/suspend`);
        alert("Vendor suspended successfully");
      }
      fetchData(); // Refresh data
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update vendor");
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage platform vendors and monitor statistics
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Total Users
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {stats.totalUsers || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">All platform users</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Active Vendors
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {stats.totalVendors || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Approved businesses</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Pending Approval
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {stats.totalPendingVendors || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Awaiting review</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              New Today
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {stats.newUsersToday || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">Users registered today</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              className={`py-3 px-1 font-medium text-sm ${
                activeTab === "overview"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`py-3 px-1 font-medium text-sm ${
                activeTab === "pending"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("pending")}
            >
              Pending Vendors ({pendingVendors.length})
            </button>
            <button
              className={`py-3 px-1 font-medium text-sm ${
                activeTab === "reports"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("reports")}
            >
              Reports
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Platform Overview</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">User Growth</h3>
                  <div className="text-2xl font-bold text-green-600">+12%</div>
                  <p className="text-sm text-gray-500">This month</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Active Bookings</h3>
                  <div className="text-2xl font-bold text-blue-600">1,234</div>
                  <p className="text-sm text-gray-500">Last 7 days</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Queue Usage</h3>
                  <div className="text-2xl font-bold text-purple-600">89%</div>
                  <p className="text-sm text-gray-500">Adoption rate</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab("pending")}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="text-2xl mb-2">👥</div>
                  <h3 className="font-semibold">Review Vendors</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {pendingVendors.length} pending
                  </p>
                </button>
                <button className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold">View Reports</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Platform analytics
                  </p>
                </button>
                <button className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors">
                  <div className="text-2xl mb-2">⚙️</div>
                  <h3 className="font-semibold">System Settings</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Platform configuration
                  </p>
                </button>
                <button className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors">
                  <div className="text-2xl mb-2">📧</div>
                  <h3 className="font-semibold">Send Announcement</h3>
                  <p className="text-sm text-gray-600 mt-1">Notify all users</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Vendors Tab */}
        {activeTab === "pending" && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">
              Pending Vendor Approvals
            </h2>

            {pendingVendors.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-gray-500">No pending vendor approvals</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingVendors.map((vendor) => (
                  <div
                    key={vendor._id}
                    className="border rounded-lg p-6 hover:bg-gray-50"
                  >
                    <div className="flex items-start mb-4">
                      <Avatar
                        user={vendor.userId || { name: vendor.businessName }}
                        size="md"
                        className="mr-4 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {vendor.businessName}
                        </h3>
                        <p className="text-gray-600">{vendor.address}</p>
                        <div className="mt-2">
                          <p className="text-sm">
                            <span className="font-medium">Contact:</span>{" "}
                            {vendor.contactInfo}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Owner:</span>{" "}
                            {vendor.userId?.name} ({vendor.userId?.email})
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Registered:</span>{" "}
                            {new Date(vendor.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            handleVendorAction(vendor._id, "approve")
                          }
                          className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleVendorAction(vendor._id, "suspend")
                          }
                          className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    {vendor.serviceCategories &&
                      vendor.serviceCategories.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">
                            Service Categories:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {vendor.serviceCategories.map((category, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">Platform Reports</h2>
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Usage Statistics</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-2xl font-bold">45,678</div>
                    <div className="text-sm text-gray-600">Total Bookings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">23,456</div>
                    <div className="text-sm text-gray-600">Queue Entries</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">78%</div>
                    <div className="text-sm text-gray-600">Active Users</div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>New vendor registration</div>
                    <div className="text-sm text-gray-500">2 hours ago</div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>10 new customer signups</div>
                    <div className="text-sm text-gray-500">Today</div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>System maintenance completed</div>
                    <div className="text-sm text-gray-500">Yesterday</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap with ProtectedRoute
const AdminDashboardWrapper = () => (
  <ProtectedRoute allowedRoles={["admin"]}>
    <AdminDashboard />
  </ProtectedRoute>
);

export default AdminDashboardWrapper;
