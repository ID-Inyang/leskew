import React, { useState, useEffect } from "react";
import api from "../utils/api"
import { Link } from "react-router-dom";
import Avatar from '../components/Avatar';

const Vendor = () => {
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
    <div className="bg-gray-50">
        <div className="container py-20 px-4 mx-auto">

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
  )
}

export default Vendor
