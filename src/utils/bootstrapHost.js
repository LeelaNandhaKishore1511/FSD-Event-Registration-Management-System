const bcrypt = require("bcryptjs");
const User = require("../models/User");

const bootstrapHost = async () => {
  const hostEmail = (process.env.HOST_EMAIL || "").toLowerCase().trim();
  const hostPassword = (process.env.HOST_PASSWORD || "").trim();
  const hostName = process.env.HOST_NAME || "System Host";

  if (!hostEmail || !hostPassword) {
    console.warn(
      "HOST_EMAIL or HOST_PASSWORD missing. Host bootstrap skipped.",
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(hostPassword, 10);

  // Keep exactly one canonical host account for this email.
  await User.deleteMany({ email: hostEmail });

  await User.create({
    name: hostName,
    email: hostEmail,
    password: hashedPassword,
    role: "host",
  });

  console.log("Host account synced from environment.");
};

module.exports = bootstrapHost;
