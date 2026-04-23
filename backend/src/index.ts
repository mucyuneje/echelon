import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import { connectDB } from "./config/db";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/error.middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));

// FIX #5: Increased rate limit from 100 to 300 req/15min, screening endpoints get more headroom
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { success: false, message: "Too many requests, please try again later." },
    skip: (req) => {
      // Don't rate limit health checks
      return req.path === "/health";
    },
  })
);

// Higher limit for AI-heavy screening endpoints (they take long, not a sign of abuse)
app.use(
  "/api/screen",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: { success: false, message: "Screening rate limit reached. Wait a moment and try again." },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (req, res) => {
  res.json({ success: true, status: "OK", service: "Echelon", version: "1.0.0", timestamp: new Date().toISOString() });
});

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 Echelon Backend running`);
    console.log(`   Port  : ${PORT}`);
    console.log(`   Env   : ${process.env.NODE_ENV || "development"}`);
    console.log(`   API   : http://localhost:${PORT}/api\n`);
  });
};

startServer();
export default app;
