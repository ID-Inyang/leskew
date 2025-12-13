// client/src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#1F518C] to-[#26BBBF] text-white ">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-stars font-bold mb-4">Leskew</h3>
            <p className="">
              Less Queue, More Service. Transforming how small businesses manage appointments and queues.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">For Customers</h4>
            <ul className="space-y-2">
              <li><Link to="/" className=" hover:text-blue-950 transition-colors">Find Businesses</Link></li>
              <li><Link to="/auth" className=" hover:text-blue-950 transition-colors">Book Appointments</Link></li>
              <li><Link to="/auth" className="hover:text-blue-950 transition-colors">Join Queues</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">For Businesses</h4>
            <ul className="space-y-2">
              <li><Link to="/auth?tab=register&role=vendor" className="hover:text-blue-950 transition-colors">Register Business</Link></li>
              <li><Link to="/" className="hover:text-blue-950 transition-colors">Pricing</Link></li>
              <li><Link to="/" className="hover:text-blue-950 transition-colors">Features</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="hover:text-blue-950 transition-colors">About Us</Link></li>
              <li><Link to="/" className="hover:text-blue-950 transition-colors">Contact</Link></li>
              <li><Link to="/" className="hover:text-blue-950 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/" className="hover:text-blue-950 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center ">
          <p>© {new Date().getFullYear()} Leskew. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;