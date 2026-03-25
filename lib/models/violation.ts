import mongoose, { Schema, Document, Model } from 'mongoose';

export type ViolationImpact = 'minor' | 'moderate' | 'serious' | 'critical';
export type RemediationStatus = 'PENDING' | 'GENERATED' | 'FAILED';

export interface IBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IAiRemediation {
  analysis: string;
  remediatedCode: string;
  explanation: string;
  status: RemediationStatus;
}

export interface IVisionDeficiency {
  type: string;
  base64Image: string;
}

export interface IViolation extends Document {
  scanId: mongoose.Types.ObjectId;
  pageUrl: string;
  ruleId: string;
  impact: ViolationImpact;
  description: string;
  failureSummary: string;
  htmlSnippet: string;
  cssSelector: string;
  boundingBox: IBoundingBox | null;
  screenshotPath?: string;
  visionDeficiencies: IVisionDeficiency[];
  wcagCriteria: string[];
  tags: string[];
  aiRemediation: IAiRemediation;
  createdAt: Date;
}

const violationSchema = new Schema<IViolation>(
  {
    scanId: {
      type: Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
    },
    pageUrl: { type: String, required: true },
    ruleId: { type: String, required: true },
    impact: {
      type: String,
      enum: ['minor', 'moderate', 'serious', 'critical'],
      required: true,
    },
    description: { type: String, required: true },
    failureSummary: { type: String, required: true },
    htmlSnippet: { type: String, required: true, maxlength: 5000 },
    cssSelector: { type: String, required: true },
    boundingBox: {
      type: {
        x: { type: Number },
        y: { type: Number },
        width: { type: Number },
        height: { type: Number },
      },
      default: null,
    },
    screenshotPath: { type: String },
    visionDeficiencies: [
      {
        type: { type: String, required: true },
        base64Image: { type: String, required: true },
      },
    ],
    wcagCriteria: [{ type: String }],
    tags: [{ type: String }],
    aiRemediation: {
      analysis: { type: String, default: '' },
      remediatedCode: { type: String, default: '' },
      explanation: { type: String, default: '' },
      status: {
        type: String,
        enum: ['PENDING', 'GENERATED', 'FAILED'],
        default: 'PENDING',
      },
    },
  },
  { timestamps: true }
);

// Compound index for fetching violations by scan + page
violationSchema.index({ scanId: 1, pageUrl: 1 });
// Index for filtering by severity within a scan
violationSchema.index({ scanId: 1, impact: 1 });

export const Violation: Model<IViolation> =
  mongoose.models.Violation || mongoose.model<IViolation>('Violation', violationSchema);
