import React from 'react'
import { assets } from '../assets/assets'

const Features = () => {

  const cardContent = [
    {
      img: assets.calendar,
      title: "Easy Booking",
      description: "Book appointments with your preferred time slots", },
    {
      img: assets.clock,
      title: "Real-Time Queue",
      description: "Join virtual queues and track your position in real-time", },
    {
      img: assets.line_chart,
      title: "Smart Analytics",
      description: "Vendors get insights to optimize their operations", },
  ];
  return (
    <div className='py-16 md:py-20'>
              <h2 className='text-center text-3xl font-bold mb-10'>Explore Features like 
              </h2>
              <div className="grid md:grid-cols-3 gap-8 mx-20 mb-16">
                {cardContent.map((card, index) => (
          <div key={index} className="card text-center">
            <div className="  mb-4 size-[50px] mx-auto flex justify-center items-center"><img src={card.img} alt="" /></div>
            <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
            <p className="text-gray-600">
              {card.description}
            </p>
          </div>
        )
                )}
        </div>
    </div>
  )
}

export default Features
