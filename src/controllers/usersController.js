const bcrypt = require("bcryptjs");
const User = require("../models/User");
const MainEvent = require("../models/MainEvent");

const createUserWithRole = async ({
  name,
  email,
  password,
  role,
  createdByOrganiser,
  assignedMainEvent,
  phone,
  department,
  year,
}) => {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    throw new Error(
      "Email already in use. You can reuse the same name, but email must be unique.",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role,
    createdByOrganiser: createdByOrganiser || null,
    assignedMainEvent: assignedMainEvent || null,
    phone,
    department,
    year,
  });
};

exports.createOrganiser = async (req, res) => {
  try {
    const { name, email, password, phone, department, year } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email and password are required" });
    }

    const user = await createUserWithRole({
      name,
      email,
      password,
      role: "organiser",
      phone,
      department,
      year,
    });

    res.status(201).json({ user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createManagement = async (req, res) => {
  try {
    const { name, email, password, mainEventId, phone, department, year } =
      req.body;
    if (!name || !email || !password || !mainEventId) {
      return res
        .status(400)
        .json({
          message: "name, email, password and mainEventId are required",
        });
    }

    const selectedMainEvent = await MainEvent.findOne({
      _id: mainEventId,
      organiser: req.user._id,
    }).select("_id");

    if (!selectedMainEvent) {
      return res.status(404).json({ message: "Selected main event not found" });
    }

    const user = await createUserWithRole({
      name,
      email,
      password,
      role: "management",
      createdByOrganiser: req.user._id,
      assignedMainEvent: selectedMainEvent._id,
      phone,
      department,
      year,
    });

    res.status(201).json({ user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getOrganisers = async (req, res) => {
  try {
    const organisers = await User.find({ role: "organiser" })
      .select("name email phone department year createdAt")
      .sort({ createdAt: -1 });

    res.json(organisers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getManagementUsers = async (req, res) => {
  try {
    const managementUsers = await User.find({
      role: "management",
      createdByOrganiser: req.user._id,
    })
      .select("name email phone department year assignedMainEvent createdAt")
      .populate("assignedMainEvent", "name startDate endDate")
      .sort({ createdAt: -1 });

    res.json(managementUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteOrganiser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Organiser not found" });
    }

    if (user.role !== "organiser") {
      return res
        .status(400)
        .json({ message: "Only organiser users can be deleted here" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Organiser deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteManagementUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: "management",
      createdByOrganiser: req.user._id,
    });
    if (!user) {
      return res.status(404).json({ message: "Management user not found" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Management user deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
