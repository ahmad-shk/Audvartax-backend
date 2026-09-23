import { Router } from "express";
import { supabase } from "../../config/supabase.js";

export const healthRoutes = Router();

healthRoutes.get("/", async (_req, res) => {
  const { error } = await supabase.from("users").select("id").limit(1);

  if (error) {
    res.status(503).json({
      success: false,
      data: {
        status: "degraded",
        storage: "supabase",
        database: "unavailable",
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      status: "ok",
      storage: "supabase",
      database: "connected",
    },
  });
});
