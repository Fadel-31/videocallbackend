const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const protect = require("../middleware/authMiddleware");

// Handle OPTIONS requests
router.options("*", (req, res) => res.sendStatus(200));

// Register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ username, email, password });
    const token = jwt.sign({ id: user._id }, "your_jwt_secret", { expiresIn: "7d" });
    res.status(201).json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, "your_jwt_secret", { expiresIn: "7d" });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user info
router.get("/me", protect, (req, res) => {
  if (!req.user) return res.status(404).json({ message: "User not found" });
  res.json({ username: req.user.username, email: req.user.email });
});

module.exports = router;
