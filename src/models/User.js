const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["host", "organiser", "management", "user"],
      default: "user",
    },
    createdByOrganiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedMainEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainEvent",
      default: null,
    },
    phone: { type: String, default: "" },
    department: { type: String, default: "" },
    year: { type: String, default: "" },
    collegeName: { type: String, default: "", trim: true },
    rollNo: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
