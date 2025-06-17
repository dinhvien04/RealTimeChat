require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
    try {
        // Đọc thông tin admin từ biến môi trường
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminUsername || !adminEmail || !adminPassword) {
            console.error('Vui lòng thiết lập ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD trong file .env');
            process.exit(1);
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('Admin account already exists');
            process.exit(0);
        }

        // Create admin account
        const admin = new User({
            username: adminUsername,
            email: adminEmail,
            password: adminPassword, // Sẽ được hash bởi pre-save hook
            role: 'admin',
            isActive: true
        });

        await admin.save();
        console.log('Admin account created successfully');
        console.log('Username:', adminUsername);
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('Please change the password after first login!');

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

createAdmin(); 