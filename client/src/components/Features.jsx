import React from 'react'
import { assets } from '../assets/assets'

const Features = () => {
  return (
    <div className='py-16'>
                <h2 className='text-center text-3xl font-bold mb-10'>Explore Features like</h2>
              <div className="grid md:grid-cols-3 gap-8 mx-20 mb-16">
          <div className="card text-center">
            <div className="  mb-4 size-[50px] mx-auto flex justify-center items-center"><img src={assets.calendar} alt="" /></div>
            <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
            <p className="text-gray-600">
              Book appointments with your preferred time slots
            </p>
          </div>
          <div className="card text-center">
            <div className="text-primary-600 text-4xl mb-4 size-[50px] mx-auto flex justify-center items-center"><img src={assets.clock} alt="" /></div>
            <h3 className="text-xl font-semibold mb-2">Real-Time Queue</h3>
            <p className="text-gray-600">
              Join virtual queues and track your position in real-time
            </p>
          </div>
          <div className="card text-center">
            <div className="text-primary-600 text-4xl mb-4 size-[50px] mx-auto flex justify-center items-center"><img src={assets.line_chart} alt="" /></div>
            <h3 className="text-xl font-semibold mb-2">Smart Analytics</h3>
            <p className="text-gray-600">
              Vendors get insights to optimize their operations
            </p>
          </div>
        </div>
    </div>
  )
}

export default Features
