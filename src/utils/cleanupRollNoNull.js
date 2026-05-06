require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  try {
    await connectDB();
    const res = await User.updateMany({ rollNo: null }, { $unset: { rollNo: '' } });
    console.log('Updated documents:', res.nModified || res.modifiedCount || res.n || res);
  } catch (err) {
    console.error('Cleanup failed:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
