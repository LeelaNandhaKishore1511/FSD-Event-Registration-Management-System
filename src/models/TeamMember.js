const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

teamMemberSchema.index({ team: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("TeamMember", teamMemberSchema);
