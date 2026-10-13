import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { budgetsRouter } from "./modules/budgets/budgets.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { transactionsRouter } from "./modules/transactions/transactions.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : true,
    }),
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", env: env.NODE_ENV });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/budgets", budgetsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/transactions", transactionsRouter);

  app.use(errorHandler);

  return app;
};
