import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Snapshot of the actor's role at the time of the action, not a live
    // reference — if a role ever changed later, this entry should still
    // reflect what the actor was when they did it.
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  // Append-only: only `createdAt` is meaningful, and no route ever updates
  // or deletes an entry (see routes/admin/audit-logs.routes.ts — read-only).
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

export type AuditLogDoc = HydratedDocument<InferSchemaType<typeof auditLogSchema>>;

export const AuditLog = model('AuditLog', auditLogSchema);
