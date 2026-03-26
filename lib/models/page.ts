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
  stageScreenshots: {
    stage: 'PAGE_LOADED' | 'CDP_CAPTURED' | 'AXE_ANALYZED' | 'VISION_EMULATION' | 'FINAL';
    imageData: string;
    capturedAt: Date;
  }[];
  securityHeaders: ISecurityHeaders | null;
  loadTimeMs: number;
  performanceMetrics: Record<string, unknown> | null;
  browserIssues: unknown[];
  accessibilityTreeSnapshot: unknown | null;
  extractedSecurityContext: Record<string, unknown> | null;
  aiInsights: {
    browserIssuesExplanation: string;
    securityExplanation: string;
    securityVulnerabilities: { vulnType: string; severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'; description: string; remediation?: string }[];
    performanceExplanation: string;
    axTreeExplanation: string;
    generatedAt: Date | null;
  } | null;
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
    stageScreenshots: [
      {
        stage: {
          type: String,
          enum: ['PAGE_LOADED', 'CDP_CAPTURED', 'AXE_ANALYZED', 'VISION_EMULATION', 'FINAL'],
          required: true,
        },
        imageData: { type: String, required: true },
        capturedAt: { type: Date, default: Date.now },
      },
    ],
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
    extractedSecurityContext: {
      type: Schema.Types.Mixed,
      default: null,
    },
    aiInsights: {
      browserIssuesExplanation: { type: String, default: '' },
      securityExplanation: { type: String, default: '' },
      securityVulnerabilities: [
        {
          vulnType: { type: String, required: true },
          severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low', 'Info'], required: true },
          description: { type: String, required: true },
          remediation: { type: String },
        }
      ],
      performanceExplanation: { type: String, default: '' },
      axTreeExplanation: { type: String, default: '' },
      generatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

pageSchema.index({ scanId: 1, url: 1 });

export const Page: Model<IPage> =
  mongoose.models.Page || mongoose.model<IPage>('Page', pageSchema);
