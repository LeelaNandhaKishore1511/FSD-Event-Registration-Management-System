const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    mainEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainEvent",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    endDate: { type: Date, required: true },
    endTime: { type: String, required: true },
    venue: { type: String, required: true },
    domain: { type: String, default: "" },
    maxParticipants: { type: Number, required: true, min: 1 },
    eventType: { type: String, enum: ["individual", "team"], required: true },
    registrationDeadline: { type: Date, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    managementUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Event", eventSchema);
