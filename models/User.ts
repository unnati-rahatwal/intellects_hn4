import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    number: {
      type: String,
      required: [true, "Please provide your phone number"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      select: false, // Prevents password from being returned in queries by default
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
