import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

// v1 only supports reporting writeups — comments don't exist, so there's
// nothing else to report yet (see server/README.md "What's Out of Scope").
export const REPORT_TARGET_TYPES = ['writeup'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_STATUSES = ['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: REPORT_STATUSES, default: 'OPEN' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

export type ReportDoc = HydratedDocument<InferSchemaType<typeof reportSchema>>;

export const Report = model('Report', reportSchema);
