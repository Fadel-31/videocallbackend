const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const connectDB = require("./db");

const authRoutes = require("./routes/auth");
// Allow both localhost and your Vercel frontend
const allowedOrigins = [
  "http://localhost:5173",
  "https://videocallfrontend.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

app.get("/", (req, res) => res.send("Server is running"));

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

const rooms = {};
app.use("/api/auth", authRoutes);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, username, muted: false });

    // Notify new user about existing users
    socket.emit("all-users", rooms[roomId].filter(u => u.id !== socket.id));

    // Notify others about new user
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

connectDB();
server.listen(5000, () => console.log("Server running on port 5000"));
