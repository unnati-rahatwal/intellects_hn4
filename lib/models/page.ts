import mongoose, { Schema, Document, Model } from 'mongoose';

export type PageStatus = 'PENDING' | 'SCANNING' | 'COMPLETED' | 'FAILED';

export interface ISecurityHeaders {
  hasCSP: boolean;
  hasHSTS: boolean;
  hasXFrameOptions: boolean;
  hasXContentTypeOptions: boolean;
  hasMixedContent: boolean;
  rawHeaders: Record<string, string>;
  missingHeaders: string[];
  score: number;
}

export interface IPage extends Document {
  scanId: mongoose.Types.ObjectId;
  url: string;
  status: PageStatus;
  violationCount: number;
  accessibilityScore: number;
  screenshotPath?: string;
  securityHeaders: ISecurityHeaders | null;
  loadTimeMs: number;
  performanceMetrics: Record<string, unknown> | null;
  browserIssues: unknown[];
  accessibilityTreeSnapshot: unknown | null;
  createdAt: Date;
}

const pageSchema = new Schema<IPage>(
  {
    scanId: {
      type: Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
      index: true,
    },
    url: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'SCANNING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    violationCount: { type: Number, default: 0 },
    accessibilityScore: { type: Number, default: 100 },
    screenshotPath: { type: String },
    securityHeaders: {
      type: Schema.Types.Mixed,
      default: null,
    },
    loadTimeMs: { type: Number, default: 0 },
    performanceMetrics: {
      type: Schema.Types.Mixed,
      default: null,
    },
    browserIssues: {
      type: Schema.Types.Mixed,
      default: [],
    },
    accessibilityTreeSnapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

pageSchema.index({ scanId: 1, url: 1 });

export const Page: Model<IPage> =
  mongoose.models.Page || mongoose.model<IPage>('Page', pageSchema);
