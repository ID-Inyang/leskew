// client/src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">Leskew</h3>
            <p className="text-gray-400">
              Less Queue. More Service. Transforming how small businesses manage appointments and queues.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">For Customers</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Find Businesses</Link></li>
              <li><Link to="/auth" className="text-gray-400 hover:text-white transition-colors">Book Appointments</Link></li>
              <li><Link to="/auth" className="text-gray-400 hover:text-white transition-colors">Join Queues</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">For Businesses</h4>
            <ul className="space-y-2">
              <li><Link to="/auth?tab=register&role=vendor" className="text-gray-400 hover:text-white transition-colors">Register Business</Link></li>
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Features</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>© {new Date().getFullYear()} Leskew. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;