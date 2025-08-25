const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./db");
const authRoutes = require("./routes/auth");

const app = express();
const server = http.createServer(app);

// Allowed origins
const allowedOrigins = [
  "http://localhost:5173", // local frontend
  "https://videocallfrontend.vercel.app", // deployed frontend
];

// --- Apply CORS globally with preflight handling ---
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

// Handle preflight requests for all routes
app.options("/(.*)/", cors());

// Parse JSON
app.use(express.json());

// --- Routes ---
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.send("Server is running"));

// --- Socket.IO setup ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
});

// --- Rooms storage ---
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, username, muted: false });

    socket.emit("all-users", rooms[roomId].filter(u => u.id !== socket.id));
    socket.to(roomId).emit("user-connected", { id: socket.id, username, muted: false });

    socket.on("disconnect", () => {
      rooms[roomId] = rooms[roomId].filter(u => u.id !== socket.id);
      socket.to(roomId).emit("user-disconnected", socket.id);
      console.log("User disconnected:", socket.id);
    });
  });

  // WebRTC signaling
  socket.on("offer", payload => io.to(payload.target).emit("offer", payload));
  socket.on("answer", payload => io.to(payload.target).emit("answer", payload));
  socket.on("ice-candidate", payload => io.to(payload.target).emit("ice-candidate", payload));

  // Chat
  socket.on("send-message", ({ roomId, message, username }) => {
    io.to(roomId).emit("receive-message", { message, username });
  });
});

// --- Connect DB ---
connectDB();

// --- Start server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
