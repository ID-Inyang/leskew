import React from 'react'

const Steps = () => {

  const steps = [
    {
      title: "Step 1: Find & Select",
      description: "Browse local vendors by category or search by name/service.",
    },
    {
      title: "Step 2: Book or Queue",
      description: "Secure future slots or join live virtual queues instantly.",
    },
    {
      title: "Step 3: Get Notified",
      description: "Recieve real-time update and alert when the vendor calls you.",
    },
  ];

  return (

    <div className='px-auto bg-gray-100'>
      <div className="py-20 flex flex-col justify-center items-center">
        <h2 className='font-becomesnote text-center mb-10 text-7xl'>How LesKew Works</h2>
        <div className="flex flex-col flex-wrap md:flex-row gap-4 justify-center mb-10">
        {
        /* Steps Cards */
        steps.map((step, index) => (
          <div key={index}>
            <div className="text-center">
              <div className="card flex flex-col gap-7 border p-8 rounded bg-white w-[350px] h-[230px]">
                <h3 className="flex justify-center text-xl font-bold">{step.title}</h3>
                <p className="text-lg">{step.description}</p>
              </div>
            </div>
          </div>
        ))
        }
        </div>
      </div>
    </div>
  )
}

export default Steps
