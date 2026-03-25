import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables immediately
dotenv.config();

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  // Dynamically resolve URI at connection time (after dotenv has loaded)
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('❌ MONGODB_URI is not defined in the environment variables.');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
    // Log the connection host (masked) for safety and diagnostic clarity
    const host = cached.conn.connection.host;
    console.log(`📡 Database: ${host.includes('localhost') ? 'LOCAL' : 'CLOUD'} (${host})`);
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
