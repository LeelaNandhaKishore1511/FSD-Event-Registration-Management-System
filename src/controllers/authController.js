const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      department,
      year,
      collegeName,
      rollNo,
    } = req.body;

    if (!name || !email || !password || !collegeName || !rollNo) {
      return res.status(400).json({
        message: "name, email, password, collegeName and rollNo are required",
      });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const normalizedRollNo = String(rollNo).trim().toUpperCase();
    const existingRollNo = await User.findOne({ rollNo: normalizedRollNo });
    if (existingRollNo) {
      return res.status(409).json({
        message: "Roll number already exists. Please use a unique roll number.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
      phone,
      department,
      year,
      collegeName,
      rollNo: normalizedRollNo,
    });

    const token = signToken(user);
    res
      .status(201)
      .json({ token, user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.rollNo) {
      return res.status(409).json({
        message: "Roll number already exists. Please use a unique roll number.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPassword = (password || "").trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(normalizedPassword, user.password);
    if (!isMatch) {
      const envHostEmail = (process.env.HOST_EMAIL || "").trim().toLowerCase();
      const envHostPassword = (process.env.HOST_PASSWORD || "").trim();

      const canRecoverHostLogin =
        user.role === "host" &&
        normalizedEmail === envHostEmail &&
        normalizedPassword === envHostPassword;

      if (!canRecoverHostLogin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Self-heal host password hash if it drifted from environment credentials.
      user.password = await bcrypt.hash(envHostPassword, 10);
      await user.save();
    }

    const token = signToken(user);
    res.json({ token, user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
