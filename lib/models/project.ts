import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProject extends Document {
  name: string;
  baseUrl: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  githubRepo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    baseUrl: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    githubRepo: { type: String },
  },
  { timestamps: true }
);

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);
