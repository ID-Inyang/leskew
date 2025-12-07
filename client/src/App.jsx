// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Import pages
import HomePage from './pages/Home/HomePage';
import AuthPage from './pages/Auth/AuthPage';
import CustomerDashboard from './pages/Customer/Dashboard';
import VendorDashboard from './pages/Vendor/Dashboard';
import VendorSettings from './pages/Vendor/Settings';
import AdminDashboard from './pages/Admin/Dashboard';
import Profile from './pages/Shared/Profile';
import VendorProfile from './pages/Customer/VendorProfile';
import NotFound from './pages/Shared/NotFound';

// Import layout components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/vendor/:id" element={<VendorProfile />} />
                
                {/* Protected routes */}
                <Route path="/customer/dashboard" element={<CustomerDashboard />} />
                <Route path="/vendor/dashboard" element={<VendorDashboard />} />
                <Route path="/vendor/settings" element={<VendorSettings />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/profile" element={<Profile />} />
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
            <ToastContainer 
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick={true}
              rtl={false}
              pauseOnFocusLoss={true}
              draggable={true}
              pauseOnHover={true}
            />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;