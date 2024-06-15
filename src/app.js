import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// import routes
import userRoutes from "./routes/user.routes.js";
import hotelRoutes from "./routes/hotel.routes.js";
import utilsRoutes from "./routes/utils.routes.js";
import commentRoutes from "./routes/comment.routes.js";

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/hotel", hotelRoutes);
app.use("/api/v1/utils", utilsRoutes);
app.use("/api/v1/comment", commentRoutes);

export { app };
