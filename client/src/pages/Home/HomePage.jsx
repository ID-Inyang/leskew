// client/src/pages/Home/HomePage.jsx

import Hero from '../../components/Hero'
import Features from "../../components/Features";
import Vendor from "../../components/Vendor";
import Steps from '../../components/Steps';

const HomePage = () => {
  return (
    <div className="bg-gray-200">
      {/* Hero Section */}
        <Hero />
      <div className="">
        {/* Features */}
        <Features />

        <div className='bg-gray-100'>
          {/* Steps */}
          <Steps />
        </div>

        {/* Vendor List */}
        <Vendor/>
      </div>
    </div>
  );
};

export default HomePage;