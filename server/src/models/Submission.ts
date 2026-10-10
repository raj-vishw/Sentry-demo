import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const submissionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    challenge: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    // SHA-256 digest kept for audit/abuse analysis only — never compared
    // against anything and useless for recovering the submitted plaintext.
    submittedFlagHash: { type: String, required: true },
    correct: { type: Boolean, required: true },
    pointsAwarded: { type: Number, required: true, default: 0 },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

submissionSchema.index({ challenge: 1 });
submissionSchema.index({ createdAt: -1 });
// Backs the weekly/monthly leaderboard aggregation, which matches on
// `correct` + a `createdAt` range before grouping by user.
submissionSchema.index({ correct: 1, createdAt: -1 });

// The core anti-duplicate-solve guarantee: at most one *correct* submission
// per (user, challenge) pair can ever exist, enforced by MongoDB itself —
// a second correct submission racing the first fails at the database layer
// even if the application-level "already solved" check is bypassed.
submissionSchema.index(
  { user: 1, challenge: 1 },
  { unique: true, partialFilterExpression: { correct: true } },
);

export type SubmissionDoc = HydratedDocument<InferSchemaType<typeof submissionSchema>>;

export const Submission = model('Submission', submissionSchema);
