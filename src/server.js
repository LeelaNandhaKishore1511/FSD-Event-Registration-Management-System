require("dotenv").config();

const connectDB = require("./config/db");
const bootstrapHost = require("./utils/bootstrapHost");
const app = require("./app");

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    await bootstrapHost();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server start failed:", error.message);
    process.exit(1);
  }
};

start();