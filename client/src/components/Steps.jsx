import React from 'react'

const Steps = () => {
  return (

    <div className='px-auto bg-gray-100'>
      <div className="py-20 flex flex-col justify-center items-center">
        <h2 className='font-becomesnote text-center mb-10 text-7xl'>How LesKew Works</h2>
        <div className="flex flex-col flex-wrap md:flex-row gap-4 justify-center mb-10">
      <div className='step-1 text-center'>
        <div className="card flex flex-col gap-7 border p-8 rounded bg-white w-[350px] h-[230px]">
          <h3 className="flex justify-center text-xl font-bold">Step 1: Find & Select</h3>
          <p className="text-lg">Browse local vendors by category or search by name/service.</p>
        </div>
      </div>
        <div className='step-2 text-center'>
        <div className="card flex flex-col gap-7 border p-8 rounded bg-white w-[350px] h-[230px]">
          <h3 className="flex justify-center text-xl font-bold">Step 2: Book or Queue</h3>
          <p className="text-lg">Secure future slots or join live virtual queues instantly.</p>
        </div>
      </div>
          <div className='step-3 text-center'>
        <div className="card flex flex-col gap-7 border p-8 rounded bg-white w-[350px] h-[230px]">
          <h3 className="flex justify-center text-xl font-bold">Step 3: Get Notified</h3>
          <p className="text-lg">Recieve real-time update and alert when the vendor calls you.</p>
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}

export default Steps
