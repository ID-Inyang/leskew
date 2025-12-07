// client/src/pages/Shared/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600 mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="space-x-4">
          <Link to="/" className="btn-primary px-6 py-3">
            Go Home
          </Link>
          <button 
            onClick={() => window.history.back()} 
            className="btn-secondary px-6 py-3"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;