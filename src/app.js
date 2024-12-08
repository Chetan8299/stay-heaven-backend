import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http, { get } from "http";
import { Server } from "socket.io";
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CORS_ORIGIN,
      "https://api.razorpay.com"
    ],
    credentials: true,
  },
});

app.use(
  cors({
    origin:  [
      process.env.CORS_ORIGIN,
      "https://api.razorpay.com"
    ],
    credentials: true,
  })
);
app.use(limiter);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// import routes
import userRoutes from "./routes/user.routes.js";
import hotelRoutes from "./routes/hotel.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import chatbotRoutes from "./routes/chatbot.routes.js"

app.use("/user", userRoutes);
app.use("/hotel", hotelRoutes);
app.use("/comment", commentRoutes);
app.use("/admin", adminRoutes);
app.use("/payment", paymentRoutes);
app.use("/issue", issueRoutes);
app.use("/chatbot", chatbotRoutes);

export { app,server,io };
