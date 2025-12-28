import React from 'react'
import { useAuth } from "../context/AuthContext"
import { assets } from '../assets/assets';
import { Link } from "react-router-dom";

const Hero = () => {
    const { user } = useAuth();

  return (
    <div>
        <div className="flex flex-col md:flex-row flex-wrap bg-gradient-to-r from-[#1F518C] to-[#26BBBF] text-white px-6 md:px-10 lg:px-20 w-full">
          {/* Left Side */}
          <div className='md:w-1/2 flex flex-col  gap-4 py-10 md:py-[10vw] md:mb-[-30px] text-3xl'>
          <h1 className="text-5xl font-bold mb-4">
            Welcome to <span className="font-stars ">Leskew</span>
          </h1>
          <p className="text-xl  mb-8 max-w-2xl mx-auto">
            Book appointments and join real-time virtual queues
            for your favorite local businesses from anywhere.
          </p>
          <div className="space-x-6 ">
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
          {/* -------- Right Side -------- */}
            <div className='md:w-1/2  flex justify-center relative'>
                <img className='md:absolute right-0 bottom-5 w-[220px] md:w-[250px] md:h-[400px] rounded-lg' src={assets.phone_forward} alt="" />
            </div>
        
        </div></div>
  )
}

export default Hero