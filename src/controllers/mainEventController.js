const MainEvent = require("../models/MainEvent");
const User = require("../models/User");

exports.createMainEvent = async (req, res) => {
  try {
    const { name, description, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "name, startDate and endDate are required" });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res
        .status(400)
        .json({ message: "startDate cannot be after endDate" });
    }

    const mainEvent = await MainEvent.create({
      name,
      description,
      startDate,
      endDate,
      organiser: req.user._id,
    });

    res.status(201).json(mainEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getMainEvents = async (req, res) => {
  let filter = {};

  if (req.user.role === "organiser") {
    filter = { organiser: req.user._id };
  }

  if (req.user.role === "management") {
    const managementUser = await User.findById(req.user._id).select(
      "assignedMainEvent",
    );

    if (!managementUser || !managementUser.assignedMainEvent) {
      return res.json([]);
    }

    filter = { _id: managementUser.assignedMainEvent };
  }

  const data = await MainEvent.find(filter)
    .populate("organiser", "name email role")
    .sort({ startDate: 1 });
  res.json(data);
};

exports.deleteMainEvent = async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role === "organiser") {
    filter.organiser = req.user._id;
  }

  const deleted = await MainEvent.findOneAndDelete(filter);
  if (!deleted) {
    return res.status(404).json({ message: "Main event not found" });
  }
  res.json({ message: "Main event deleted" });
};

exports.updateMainEvent = async (req, res) => {
  try {
    const mainEvent = await MainEvent.findById(req.params.id);
    if (!mainEvent) {
      return res.status(404).json({ message: "Main event not found" });
    }

    if (
      req.user.role === "organiser" &&
      String(mainEvent.organiser) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "You can only update your main events" });
    }

    const nextStartDate = req.body.startDate || mainEvent.startDate;
    const nextEndDate = req.body.endDate || mainEvent.endDate;

    if (new Date(nextStartDate) > new Date(nextEndDate)) {
      return res
        .status(400)
        .json({ message: "startDate cannot be after endDate" });
    }

    const updated = await MainEvent.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || mainEvent.name,
        description:
          req.body.description !== undefined && req.body.description !== null
            ? req.body.description
            : mainEvent.description,
        startDate: nextStartDate,
        endDate: nextEndDate,
      },
      { new: true, runValidators: true },
    );

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
