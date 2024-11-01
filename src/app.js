import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http, { get } from "http";
import { Server } from "socket.io";
import session from "express-session";


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CORS_ORIGIN,
      "http://localhost:5173",
      "https://api.razorpay.com"
    ],
    credentials: true,
  },
});

app.use(
  cors({
    origin:  [
      process.env.CORS_ORIGIN,
      "http://localhost:5173",
      "https://api.razorpay.com"
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false, 
  saveUninitialized: false, 
}));

// import routes
import userRoutes from "./routes/user.routes.js";
import hotelRoutes from "./routes/hotel.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

app.use("/user", userRoutes);
app.use("/hotel", hotelRoutes);
app.use("/comment", commentRoutes);
app.use("/admin", adminRoutes);
app.use("/payment", paymentRoutes);

export { app,server,io };
