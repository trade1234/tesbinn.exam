import mongoose from "mongoose";
import dns from "node:dns";

if (!process.env.VERCEL) {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch (dnsError) {
    console.warn("Unable to set DNS servers to Google public DNS:", dnsError);
  }
}

let cachedConnection = global.mongooseConnection;
let cachedPromise = global.mongoosePromise;

export async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  if (!cachedPromise) {
    mongoose.set("strictQuery", true);
    cachedPromise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false
      })
      .then((mongooseInstance) => {
        console.log("MongoDB connected");
        cachedConnection = mongooseInstance.connection;
        global.mongooseConnection = cachedConnection;
        return cachedConnection;
      })
      .catch((error) => {
        cachedPromise = null;
        throw error;
      });
  }

  return cachedPromise;
}
