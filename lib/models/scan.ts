import mongoose, { Schema, Document, Model } from 'mongoose';

export type ScanStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IScan extends Document {
  projectId: mongoose.Types.ObjectId;
  status: ScanStatus;
  accessibilityScore: number;
  securityScore: number;
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
  progressLog: {
    message: string;
    timestamp: Date;
    status?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  }[];
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  performanceSummary: Record<string, unknown> | null;
  aiSummary: {
    executiveSummary: string;
    keyFindings: string[];
    recommendations: string[];
    generatedAt: Date | null;
  } | null;
  videoUrl?: string;
  videoGeneratedAt?: Date;
  videoGenerationStatus?: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  githubReportedAt?: Date;
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
    securityScore: { type: Number, default: 0 },
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
    progressLog: [
      {
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        status: { type: String, enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'], default: 'INFO' },
      },
    ],
    errorMessage: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    performanceSummary: {
      type: Schema.Types.Mixed,
      default: null,
    },
    aiSummary: {
      executiveSummary: { type: String, default: '' },
      keyFindings: [{ type: String }],
      recommendations: [{ type: String }],
      generatedAt: { type: Date, default: null },
    },
    videoUrl: { type: String },
    videoGeneratedAt: { type: Date },
    videoGenerationStatus: {
      type: String,
      enum: ['PENDING', 'GENERATING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    githubReportedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for dashboard time-series queries
scanSchema.index({ projectId: 1, completedAt: -1 });

export const Scan: Model<IScan> =
  mongoose.models.Scan || mongoose.model<IScan>('Scan', scanSchema);
