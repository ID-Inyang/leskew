// server/add-test-data.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function addTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🎮 Interactive Test Data Generator');
    console.log('='.repeat(40));
    
    const type = await question('What do you want to create? (1=Customer, 2=Vendor, 3=Both): ');
    
    if (type === '1' || type === '3') {
      const count = await question('How many customers? (1-10): ');
      await createCustomers(parseInt(count) || 3);
    }
    
    if (type === '2' || type === '3') {
      const count = await question('How many vendors? (1-5): ');
      await createVendors(parseInt(count) || 2);
    }
    
    console.log('\n✅ Test data created successfully!');
    console.log('\n🔑 Use these credentials to login:');
    console.log('- Customers: customer1@test.com / test123');
    console.log('- Vendors: vendor1@test.com / test123');
    console.log('- Admin: admin@leskew.com / admin123');
    
    rl.close();
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    process.exit(1);
  }
}

async function createCustomers(count) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('test123', salt);
  
  for (let i = 1; i <= count; i++) {
    const customer = new User({
      name: `Test Customer ${i}`,
      email: `customer${i}@test.com`,
      phone: `+1 (555) 100-${1000 + i}`,
      passwordHash,
      role: 'customer'
    });
    await customer.save();
    console.log(`👤 Created customer${i}@test.com`);
  }
}

async function createVendors(count) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('test123', salt);
  
  const businessTypes = [
    { name: 'Barber Shop', categories: ['Haircut', 'Shave', 'Beard Trim'] },
    { name: 'Beauty Salon', categories: ['Manicure', 'Pedicure', 'Facial'] },
    { name: 'Auto Repair', categories: ['Oil Change', 'Tire Rotation', 'Brake Service'] },
    { name: 'Massage Clinic', categories: ['Swedish Massage', 'Deep Tissue'] },
    { name: 'Dental Clinic', categories: ['Cleaning', 'Checkup', 'Whitening'] }
  ];
  
  for (let i = 1; i <= count; i++) {
    const businessType = businessTypes[i - 1] || businessTypes[0];
    
    // Create user
    const vendorUser = new User({
      name: `Test Vendor ${i}`,
      email: `vendor${i}@test.com`,
      phone: `+1 (555) 200-${1000 + i}`,
      passwordHash,
      role: 'vendor'
    });
    await vendorUser.save();
    
    // Create vendor profile (simplified - you need Vendor model)
    console.log(`🏪 Created vendor${i}@test.com - ${businessType.name}`);
  }
}

addTestData();