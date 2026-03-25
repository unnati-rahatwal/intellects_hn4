import mongoose, { Schema, Document, Model } from 'mongoose';

export type ScanStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IScan extends Document {
  projectId: mongoose.Types.ObjectId;
  status: ScanStatus;
  accessibilityScore: number;
  totalViolations: number;
  criticalIssues: number;
  seriousIssues: number;
  moderateIssues: number;
  minorIssues: number;
  pagesScanned: number;
  discoveredRoutes: string[];
  targetUrls: string[];
  options: {
    discoverRoutes: boolean;
    maxDepth: number;
    includeShadowDom: boolean;
    includeIframes: boolean;
    visionEmulation: boolean;
    securityAudit: boolean;
  };
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scanSchema = new Schema<IScan>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    accessibilityScore: { type: Number, default: 0 },
    totalViolations: { type: Number, default: 0 },
    criticalIssues: { type: Number, default: 0 },
    seriousIssues: { type: Number, default: 0 },
    moderateIssues: { type: Number, default: 0 },
    minorIssues: { type: Number, default: 0 },
    pagesScanned: { type: Number, default: 0 },
    discoveredRoutes: [{ type: String }],
    targetUrls: [{ type: String, required: true }],
    options: {
      discoverRoutes: { type: Boolean, default: true },
      maxDepth: { type: Number, default: 3 },
      includeShadowDom: { type: Boolean, default: true },
      includeIframes: { type: Boolean, default: true },
      visionEmulation: { type: Boolean, default: false },
      securityAudit: { type: Boolean, default: true },
    },
    errorMessage: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for dashboard time-series queries
scanSchema.index({ projectId: 1, completedAt: -1 });

export const Scan: Model<IScan> =
  mongoose.models.Scan || mongoose.model<IScan>('Scan', scanSchema);
