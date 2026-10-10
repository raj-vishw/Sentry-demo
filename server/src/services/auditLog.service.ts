import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';

export type AuditAction =
  | 'ADMIN_CREATED_CHALLENGE'
  | 'ADMIN_UPDATED_CHALLENGE'
  | 'ADMIN_DELETED_CHALLENGE'
  | 'ADMIN_PUBLISHED_CHALLENGE'
  | 'ADMIN_UNPUBLISHED_CHALLENGE'
  | 'ADMIN_DISABLED_USER'
  | 'ADMIN_ENABLED_USER'
  | 'ADMIN_UPDATED_CATEGORY'
  | 'ADMIN_APPROVED_WRITEUP'
  | 'ADMIN_REJECTED_WRITEUP'
  | 'ADMIN_ARCHIVED_WRITEUP'
  | 'ADMIN_RESOLVED_REPORT'
  | 'ADMIN_DISMISSED_REPORT'
  | 'ADMIN_INVALIDATED_SUBMISSION'
  | 'ADMIN_UPDATED_SYSTEM_CONFIG'
  | 'ADMIN_ARCHIVED_CHALLENGE'
  | 'ADMIN_RESTORED_CHALLENGE'
  | 'ADMIN_IMPORTED_CHALLENGE'
  | 'ADMIN_EXPORTED_CHALLENGE'
  | 'INSTANCE_CREATED'
  | 'INSTANCE_STOP_REQUESTED'
  | 'ADMIN_UPDATED_COMPETITION_CONFIG'
  | 'ADMIN_BANNED_USER'
  | 'ADMIN_APPROVED_USER'
  | 'ADMIN_REJECTED_USER'
  | 'ADMIN_HID_USER'
  | 'ADMIN_UNHID_USER'
  | 'ADMIN_HID_TEAM'
  | 'ADMIN_UNHID_TEAM'
  | 'ADMIN_CREATED_PAGE'
  | 'ADMIN_UPDATED_PAGE'
  | 'ADMIN_DELETED_PAGE'
  | 'ADMIN_CREATED_ANNOUNCEMENT'
  | 'ADMIN_DELETED_ANNOUNCEMENT';

/**
 * Records one admin mutation. Fire-and-forget from the caller's point of
 * view (awaited, but never wrapped in a try/catch that would swallow a
 * failure) — if writing the audit entry fails, the mutation itself should
 * be treated as having failed too, rather than silently going unlogged.
 */
export async function record(
  actorId: string,
  actorRole: string,
  action: AuditAction,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await AuditLog.create({
    actor: actorId,
    actorRole,
    action,
    resourceType,
    resourceId,
    metadata: metadata ?? {},
  });
}

export interface AuditLogEntryDto {
  id: string;
  actorId: string;
  actorUsername: string | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface ListAuditLogsOpts {
  actor?: string; // username, exact match
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export async function listAuditLogs(opts: ListAuditLogsOpts) {
  const filter: Record<string, unknown> = {};
  if (opts.action) filter.action = opts.action;
  if (opts.resourceType) filter.resourceType = opts.resourceType;
  if (opts.startDate || opts.endDate) {
    filter.createdAt = {
      ...(opts.startDate ? { $gte: opts.startDate } : {}),
      ...(opts.endDate ? { $lte: opts.endDate } : {}),
    };
  }

  if (opts.actor) {
    const actorUser = await User.findOne({ usernameLower: opts.actor.toLowerCase() }).select('_id');
    // No match — return an empty page rather than an unfiltered one.
    filter.actor = actorUser ? actorUser._id : new Types.ObjectId();
  }

  const skip = (opts.page - 1) * opts.limit;
  const [docs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit).populate('actor', 'username'),
    AuditLog.countDocuments(filter),
  ]);

  const entries: AuditLogEntryDto[] = docs.map((doc) => {
    const actor = doc.actor as unknown as { _id: unknown; username: string } | null;
    return {
      id: doc.id,
      actorId: actor ? String(actor._id) : String(doc.actor),
      actorUsername: actor?.username ?? null,
      actorRole: doc.actorRole,
      action: doc.action,
      resourceType: doc.resourceType,
      resourceId: doc.resourceId,
      metadata: (doc.metadata ?? {}) as Record<string, unknown>,
      createdAt: doc.createdAt,
    };
  });

  return {
    entries,
    pagination: { page: opts.page, limit: opts.limit, total, totalPages: Math.max(1, Math.ceil(total / opts.limit)) },
  };
}
