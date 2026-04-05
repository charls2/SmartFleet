import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./auth/routes.js";
import { requireCompanyContext } from "./auth/middleware.js";
import { requireWriteAccess } from "./auth/writeAccess.js";
import { companiesRouter } from "./companies/routes.js";
import { vehiclesRouter } from "./vehicles/routes.js";
import { driversRouter } from "./drivers/routes.js";
import { deliveriesRouter } from "./deliveries/routes.js";
import { alertsRouter } from "./alerts/routes.js";
import { fleetStatsRouter } from "./fleetStats/routes.js";

const app = express();
const port = Number(process.env.PORT) || 8080;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "smartfleet-backend" });
});

app.use("/auth", authRouter);

app.use(requireCompanyContext);
app.use(requireWriteAccess);

app.use("/companies", companiesRouter);
app.use("/vehicles", vehiclesRouter);
app.use("/drivers", driversRouter);
app.use("/deliveries", deliveriesRouter);
app.use("/alerts", alertsRouter);
app.use("/fleetStats", fleetStatsRouter);

app.listen(port, () => {
  console.log(`SmartFleet API listening on http://localhost:${port}`);
});
