// server/seed-data.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";
import Vendor from "./models/Vendor.js";
import Appointment from "./models/Appointment.js";
import QueueEntry from "./models/QueueEntry.js";

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Vendor.deleteMany({});
    await Appointment.deleteMany({});
    await QueueEntry.deleteMany({});
    console.log("✅ Cleared existing data");

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("admin123", salt);
    const vendorPassword = await bcrypt.hash("vendor123", salt);
    const customerPassword = await bcrypt.hash("customer123", salt);

    // 1. Create Admin User
    const adminUser = new User({
      name: "Admin User",
      email: "admin@leskew.com",
      phone: "+1234567890",
      passwordHash: adminPassword,
      role: "admin",
    });
    await adminUser.save();
    console.log("👑 Created admin: admin@leskew.com / admin123");

    // 2. Create Vendor Users with Businesses
    const vendorsData = [
      {
        name: "John Smith",
        email: "john@premiumbarber.com",
        avatar:
          "https://images.unsplash.com/photo-1562788869-4ed32648eb72?w=400&h=400&fit=crop",
        businessName: "Premium Barber Shop",
        address: "123 Main Street, New York, NY 10001",
        contactInfo: "+1 (555) 123-4567 | premium@barber.com",
        serviceCategories: ["Haircut", "Beard Trim", "Shave", "Hair Styling"],
        description:
          "Professional barber shop with 10+ years experience. Specializing in modern haircuts and traditional shaves.",
        isApproved: true,
      },
      {
        name: "Sarah Johnson",
        email: "sarah@beautysalon.com",
        businessName: "Sarah Beauty Salon",
        address: "456 Park Avenue, Chicago, IL 60601",
        contactInfo: "+1 (555) 987-6543 | info@beautysalon.com",
        serviceCategories: [
          "Manicure",
          "Pedicure",
          "Facial",
          "Makeup",
          "Waxing",
        ],
        description:
          "Full-service beauty salon offering premium treatments in a relaxing environment.",
        isApproved: true,
      },
      {
        name: "Mike Wilson",
        email: "mike@autorepair.com",
        businessName: "Mike's Auto Repair",
        address: "789 Industrial Drive, Houston, TX 77001",
        contactInfo: "+1 (555) 456-7890 | service@autorepair.com",
        serviceCategories: [
          "Oil Change",
          "Tire Rotation",
          "Brake Service",
          "Engine Repair",
        ],
        description:
          "Certified auto repair shop with same-day service for most repairs.",
        isApproved: true,
      },
      {
        name: "Lisa Chen",
        email: "lisa@massageclinic.com",
        businessName: "Tranquil Massage Clinic",
        address: "321 Wellness Blvd, Los Angeles, CA 90001",
        contactInfo: "+1 (555) 234-5678 | relax@massageclinic.com",
        serviceCategories: [
          "Swedish Massage",
          "Deep Tissue",
          "Hot Stone",
          "Couples Massage",
        ],
        description:
          "Licensed massage therapists specializing in therapeutic and relaxation massage.",
        isApproved: true,
      },
    ];

    const createdVendors = [];
    for (const vendorInfo of vendorsData) {
      const vendorUser = new User({
        name: vendorInfo.name,
        email: vendorInfo.email,
        avatar: {
          url:
            vendorInfo.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              vendorInfo.name
            )}&background=random&color=fff&size=256`,
          publicId: "",
        },
        phone: vendorInfo.contactInfo.split(" | ")[0],
        passwordHash: vendorPassword,
        role: "vendor",
      });
      await vendorUser.save();

      const vendor = new Vendor({
        userId: vendorUser._id,
        businessName: vendorInfo.businessName,
        address: vendorInfo.address,
        contactInfo: vendorInfo.contactInfo,
        serviceCategories: vendorInfo.serviceCategories,
        description: vendorInfo.description,
        isApproved: vendorInfo.isApproved,
        maxConcurrentAppointments: 3,
        workingHours: {
          monday: { open: "09:00", close: "18:00" },
          tuesday: { open: "09:00", close: "18:00" },
          wednesday: { open: "09:00", close: "18:00" },
          thursday: { open: "09:00", close: "18:00" },
          friday: { open: "09:00", close: "18:00" },
          saturday: { open: "10:00", close: "16:00" },
          sunday: { open: "", close: "" },
        },
      });
      await vendor.save();
      createdVendors.push({ user: vendorUser, vendor });
      console.log(`🏪 Created vendor: ${vendorInfo.businessName}`);
    }

    // 3. Create Customer Users
    const customersData = [
      {
        name: "Alex Johnson",
        email: "alex@customer.com",
        phone: "+1 (555) 111-2222",
      },
      {
        name: "Maria Garcia",
        email: "maria@customer.com",
        phone: "+1 (555) 333-4444",
      },
      {
        name: "David Brown",
        email: "david@customer.com",
        phone: "+1 (555) 555-6666",
      },
      {
        name: "Emma Wilson",
        email: "emma@customer.com",
        phone: "+1 (555) 777-8888",
      },
      {
        name: "James Miller",
        email: "james@customer.com",
        phone: "+1 (555) 999-0000",
      },
    ];

    const createdCustomers = [];
    for (const customerInfo of customersData) {
      const customer = new User({
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        passwordHash: customerPassword,
        role: "customer",
      });
      await customer.save();
      createdCustomers.push(customer);
      console.log(`👤 Created customer: ${customerInfo.name}`);
    }

    // 4. Create Appointments
    console.log("\n📅 Creating appointments...");
    const services = [
      {
        id: "haircut-premium",
        name: "Premium Haircut",
        duration: 45,
        price: 35,
      },
      { id: "beard-trim", name: "Beard Trim & Shape", duration: 30, price: 20 },
      { id: "manicure", name: "Classic Manicure", duration: 60, price: 25 },
      { id: "facial", name: "Deep Cleansing Facial", duration: 75, price: 50 },
      {
        id: "oil-change",
        name: "Full Synthetic Oil Change",
        duration: 45,
        price: 80,
      },
      {
        id: "tire-rotation",
        name: "Tire Rotation & Balance",
        duration: 60,
        price: 40,
      },
      {
        id: "swedish-massage",
        name: "Swedish Massage (60 min)",
        duration: 60,
        price: 75,
      },
    ];

    const appointments = [];
    for (let i = 0; i < 15; i++) {
      const customer =
        createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const vendorObj =
        createdVendors[Math.floor(Math.random() * createdVendors.length)];
      const service = services[Math.floor(Math.random() * services.length)];

      // Create date for next 7 days
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 7));
      date.setHours(
        9 + Math.floor(Math.random() * 8),
        Math.random() > 0.5 ? 0 : 30,
        0,
        0
      );

      const appointment = new Appointment({
        customerId: customer._id,
        vendorId: vendorObj.vendor._id,
        serviceId: service.id,
        serviceName: service.name,
        date: date,
        timeSlot: {
          start: `${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
          ).padStart(2, "0")}`,
          end: `${String(date.getHours() + 1).padStart(2, "0")}:${String(
            date.getMinutes()
          ).padStart(2, "0")}`,
        },
        status: Math.random() > 0.2 ? "booked" : "completed",
        notes: i === 0 ? "First-time customer" : "Regular customer",
      });
      await appointment.save();
      appointments.push(appointment);
    }
    console.log(`✅ Created ${appointments.length} appointments`);

    // 5. Create Queue Entries
    console.log("\n⏳ Creating queue entries...");
    const queueEntries = [];
    for (let i = 0; i < 8; i++) {
      const customer =
        createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const vendorObj =
        createdVendors[Math.floor(Math.random() * createdVendors.length)];

      const joinTime = new Date();
      joinTime.setHours(9 + i, Math.random() > 0.5 ? 0 : 30, 0, 0);

      const queueEntry = new QueueEntry({
        customerId: customer._id,
        vendorId: vendorObj.vendor._id,
        joinTime: joinTime,
        position: i + 1,
        status: i < 5 ? "waiting" : i < 7 ? "served" : "skipped",
        estimatedWaitTime: (i + 1) * 15, // 15 minutes per person
        servedAt:
          i >= 5 ? new Date(joinTime.getTime() + i * 15 * 60000) : undefined,
      });
      await queueEntry.save();
      queueEntries.push(queueEntry);
    }
    console.log(`✅ Created ${queueEntries.length} queue entries`);

    // Add this to your existing seed-data.js or create a new one
const updateVendorsWithServiceData = async () => {
  try {
    const vendors = await Vendor.find();
    
    for (const vendor of vendors) {
      // Set realistic values based on business type
      let maxConcurrent = 1;
      let avgDuration = 30;
      let perPersonWait = 15;

      // Customize based on business type
      if (vendor.businessName.includes('Barber') || vendor.businessName.includes('Salon')) {
        maxConcurrent = 3;
        avgDuration = 45;
        perPersonWait = 15;
      } else if (vendor.businessName.includes('Auto')) {
        maxConcurrent = 2;
        avgDuration = 90;
        perPersonWait = 45;
      } else if (vendor.businessName.includes('Massage') || vendor.businessName.includes('Clinic')) {
        maxConcurrent = 1;
        avgDuration = 60;
        perPersonWait = 30;
      }

      vendor.maxConcurrentAppointments = maxConcurrent;
      vendor.averageServiceDuration = avgDuration;
      vendor.estimatedPerPersonWait = perPersonWait;
      
      await vendor.save();
      console.log(`Updated ${vendor.businessName}: ${maxConcurrent} concurrent, ${avgDuration}min avg`);
    }
  } catch (error) {
    console.error('Update vendors error:', error);
  }
};

    // Summary
    console.log("\n🎉 Database seeding completed!");
    console.log("=".repeat(50));
    console.log("📊 SEEDING SUMMARY:");
    console.log("=".repeat(50));
    console.log(`👑 Admin: 1 user (admin@leskew.com / admin123)`);
    console.log(`🏪 Vendors: ${createdVendors.length} businesses`);
    console.log(`👤 Customers: ${createdCustomers.length} users`);
    console.log(`📅 Appointments: ${appointments.length} bookings`);
    console.log(`⏳ Queue entries: ${queueEntries.length} entries`);
    console.log("=".repeat(50));
    console.log("\n🔑 TEST ACCOUNTS:");
    console.log("- Admin: admin@leskew.com / admin123");
    console.log("- Vendor: john@premiumbarber.com / vendor123");
    console.log("- Customer: alex@customer.com / customer123");
    console.log("\n🚀 Start exploring your Leskew platform!");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

seedDatabase();
