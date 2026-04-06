const mongoose = require("mongoose");

const extractDbNameFromUri = (uri) => {
  try {
    const parsed = new URL(uri);
    const pathname = (parsed.pathname || "").replace(/^\//, "").trim();
    return pathname || "";
  } catch {
    return "";
  }
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI is not configured");

  const dbNameFromUri = extractDbNameFromUri(mongoUri);
  const dbName = (process.env.DB_NAME || dbNameFromUri || "SRET_Events").trim();

  await mongoose.connect(mongoUri, { dbName });
  console.log(`MongoDB connected (db: ${mongoose.connection.name})`);
};

module.exports = connectDB;
