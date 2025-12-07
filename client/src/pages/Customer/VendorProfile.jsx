// client/src/pages/Customer/VendorProfile.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import Avatar from '../../components/Avatar';

const VendorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("services");
  const [bookingData, setBookingData] = useState({
    date: "",
    timeSlot: "",
    serviceId: "",
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [services] = useState([
    { id: "haircut", name: "Haircut", duration: 30, price: "$25" },
    { id: "beard-trim", name: "Beard Trim", duration: 15, price: "$15" },
    { id: "hair-wash", name: "Hair Wash", duration: 20, price: "$20" },
  ]);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const response = await api.get(`/vendors/${id}`);
        setVendor(response.data);
      } catch (error) {
        console.error("Error fetching vendor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [id]);

  useEffect(() => {
    if (bookingData.date) {
      generateTimeSlots();
    }
  }, [bookingData.date]);

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const endHourValue = minute === 30 ? hour + 1 : hour;
        const endMinute = minute === 30 ? 0 : 30;
        const endTime = `${endHourValue.toString().padStart(2, "0")}:${endMinute
          .toString()
          .padStart(2, "0")}`;

        slots.push({
          start: startTime,
          end: endTime,
          display: `${startTime} - ${endTime}`,
        });
      }
    }

    setAvailableSlots(slots);
  };

  const handleJoinQueue = async () => {
    if (!isAuthenticated) {
      navigate("/auth?tab=login");
      return;
    }

    try {
      await api.post("/queue/join", { vendorId: id });
      alert("Successfully joined the queue!");
      navigate("/customer/dashboard");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to join queue");
    }
  };

  const handleBookAppointment = async () => {
    if (!isAuthenticated) {
      navigate("/auth?tab=login");
      return;
    }

    if (!bookingData.date || !bookingData.timeSlot || !bookingData.serviceId) {
      alert("Please fill in all booking details");
      return;
    }

    try {
      await api.post("/appointments", {
        vendorId: id,
        serviceId: bookingData.serviceId,
        date: bookingData.date,
        timeSlot: availableSlots.find(
          (slot) => slot.display === bookingData.timeSlot
        ),
      });
      alert("Appointment booked successfully!");
      navigate("/customer/dashboard");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to book appointment");
    }
  };

  const formatWorkingHours = () => {
    if (!vendor?.workingHours) return null;

    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    return days.map((day, index) => {
      const hours = vendor.workingHours[day];
      if (!hours?.open || !hours?.close) {
        return (
          <div key={day} className="flex justify-between py-2 border-b">
            <span className="font-medium">{dayNames[index]}</span>
            <span className="text-red-600">Closed</span>
          </div>
        );
      }

      return (
        <div key={day} className="flex justify-between py-2 border-b">
          <span className="font-medium">{dayNames[index]}</span>
          <span>
            {hours.open} - {hours.close}
          </span>
        </div>
      );
    });
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
          <h2 className="text-2xl font-bold mb-4">Vendor Not Found</h2>
          <p className="text-gray-600 mb-6">
            The vendor you're looking for doesn't exist.
          </p>
          <button onClick={() => navigate("/")} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Vendor Header */}
        // Replace the vendor header section with this:
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar and Business Info */}
            <div className="flex items-start space-x-6">
              <Avatar
                user={vendor.userId || { name: vendor.businessName }}
                size="xl"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {vendor.businessName}
                </h1>
                <div className="flex items-center text-gray-600 mb-4">
                  <span className="mr-4">📍 {vendor.address}</span>
                  <span>📞 {vendor.contactInfo}</span>
                </div>
                <p className="text-gray-700 mb-4">
                  {vendor.description || "No description available."}
                </p>
                <div className="text-sm text-gray-500">
                  Owner: {vendor.userId?.name || "Not specified"}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4">
              <button
                onClick={handleJoinQueue}
                className="btn-primary px-8 py-3 text-lg"
              >
                Join Queue
              </button>
              <button
                onClick={() => setActiveTab("book")}
                className="btn-secondary px-8 py-3 text-lg"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Info */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  className={`py-3 px-1 font-medium text-sm ${
                    activeTab === "services"
                      ? "text-primary-600 border-b-2 border-primary-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("services")}
                >
                  Services
                </button>
                <button
                  className={`py-3 px-1 font-medium text-sm ${
                    activeTab === "hours"
                      ? "text-primary-600 border-b-2 border-primary-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("hours")}
                >
                  Working Hours
                </button>
                <button
                  className={`py-3 px-1 font-medium text-sm ${
                    activeTab === "book"
                      ? "text-primary-600 border-b-2 border-primary-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("book")}
                >
                  Book Appointment
                </button>
              </nav>
            </div>

            {/* Services Tab */}
            {activeTab === "services" && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-6">Services Offered</h2>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {service.name}
                          </h3>
                          <p className="text-gray-600 mt-1">
                            {service.duration} minutes
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary-600">
                            {service.price}
                          </div>
                          <button
                            onClick={() => {
                              setActiveTab("book");
                              setBookingData((prev) => ({
                                ...prev,
                                serviceId: service.id,
                              }));
                            }}
                            className="mt-2 px-4 py-2 bg-primary-100 text-primary-800 rounded hover:bg-primary-200 transition-colors"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Working Hours Tab */}
            {activeTab === "hours" && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-6">Working Hours</h2>
                <div className="space-y-2">{formatWorkingHours()}</div>
              </div>
            )}

            {/* Book Appointment Tab */}
            {activeTab === "book" && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-6">Book Appointment</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Service
                    </label>
                    <select
                      className="input-field"
                      value={bookingData.serviceId}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          serviceId: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose a service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - {service.price} ({service.duration}{" "}
                          min)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Date
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={bookingData.date}
                      onChange={(e) =>
                        setBookingData({ ...bookingData, date: e.target.value })
                      }
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  {bookingData.date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Time Slot
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            className={`p-3 border rounded text-center ${
                              bookingData.timeSlot === slot.display
                                ? "border-primary-600 bg-primary-50 text-primary-700"
                                : "border-gray-300 hover:border-primary-500"
                            }`}
                            onClick={() =>
                              setBookingData({
                                ...bookingData,
                                timeSlot: slot.display,
                              })
                            }
                          >
                            {slot.start}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleBookAppointment}
                    disabled={
                      !bookingData.date ||
                      !bookingData.timeSlot ||
                      !bookingData.serviceId
                    }
                    className={`btn-primary w-full py-3 ${
                      !bookingData.date ||
                      !bookingData.timeSlot ||
                      !bookingData.serviceId
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Confirm Booking
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Quick Info */}
          <div>
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">Quick Info</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Queue Status</div>
                  <div className="text-2xl font-bold text-primary-600">
                    5 waiting
                  </div>
                  <div className="text-sm text-gray-500">~50 min wait time</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Next Available</div>
                  <div className="font-semibold">Tomorrow, 10:00 AM</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Rating</div>
                  <div className="flex items-center">
                    <span className="text-yellow-500">★★★★☆</span>
                    <span className="ml-2 font-medium">4.2/5</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Why Book Here?</h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Professional and experienced staff</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Hygiene and safety protocols followed</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Flexible scheduling options</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Affordable pricing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;
