import { app } from "./server.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

connectDB()
  .then(() => {
    app.listen(env.port, () => console.log(`API listening on port ${env.port}`));
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });

