import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  rasi: { type: String, default: null },
  language: { type: String, default: "en" },
  bookmarks: { type: Array, default: [] },
  reminders: { type: Array, default: [] }
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
