// client/src/pages/Home/HomePage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import Avatar from '../../components/Avatar';

const HomePage = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await api.get("/vendors");
      setVendors(response.data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-primary-600">Leskew</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Less Queue. More Service. Book appointments and join virtual queues
            for your favorite local businesses.
          </p>
          <div className="space-x-4">
            {!user ? (
              <>
                <Link to="/auth" className="btn-primary text-lg px-8 py-3">
                  Get Started
                </Link>
                <Link
                  to="/auth?tab=login"
                  className="btn-secondary text-lg px-8 py-3"
                >
                  Sign In
                </Link>
              </>
            ) : user.role === "customer" ? (
              <Link
                to="/customer/dashboard"
                className="btn-primary text-lg px-8 py-3"
              >
                Go to Dashboard
              </Link>
            ) : user.role === "vendor" ? (
              <Link
                to="/vendor/dashboard"
                className="btn-primary text-lg px-8 py-3"
              >
                Vendor Dashboard
              </Link>
            ) : (
              <Link
                to="/admin/dashboard"
                className="btn-primary text-lg px-8 py-3"
              >
                Admin Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="card text-center">
            <div className="text-primary-600 text-4xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
            <p className="text-gray-600">
              Book appointments with your preferred time slots
            </p>
          </div>
          <div className="card text-center">
            <div className="text-primary-600 text-4xl mb-4">⏱️</div>
            <h3 className="text-xl font-semibold mb-2">Real-Time Queue</h3>
            <p className="text-gray-600">
              Join virtual queues and track your position in real-time
            </p>
          </div>
          <div className="card text-center">
            <div className="text-primary-600 text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Smart Analytics</h3>
            <p className="text-gray-600">
              Vendors get insights to optimize their operations
            </p>
          </div>
        </div>

        {/* Vendor List */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">
            Featured Businesses
          </h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : vendors.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.map((vendor) => (
                // In the vendors.map section:
                <div
                  key={vendor._id}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center mb-4">
                    <Avatar
                      user={vendor.userId || { name: vendor.businessName }}
                      size="lg"
                      className="mr-4"
                    />
                    <div>
                      <h3 className="text-xl font-semibold">
                        {vendor.businessName}
                      </h3>
                      <p className="text-gray-600">{vendor.address}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    {vendor.serviceCategories?.map((cat, idx) => (
                      <span
                        key={idx}
                        className="inline-block bg-primary-100 text-primary-800 text-sm px-3 py-1 rounded-full mr-2 mb-2"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={`/vendor/${vendor._id}`}
                    className="btn-primary w-full text-center"
                  >
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              No vendors available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
