import { Types } from 'mongoose';
import { Report, type ReportDoc } from '../models/Report.js';
import { Writeup } from '../models/Writeup.js';
import { AppError } from '../utils/errors.js';
import { record as recordAudit } from './auditLog.service.js';
import type { CreateReportInput, ListAdminReportsQuery } from '../validators/report.schema.js';

export interface ReportDto {
  id: string;
  reporterId: string;
  reporterUsername: string | null;
  targetType: string;
  targetId: string;
  targetTitle: string | null;
  reason: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

async function resolveTargetTitle(targetType: string, targetId: Types.ObjectId): Promise<string | null> {
  if (targetType === 'writeup') {
    const writeup = await Writeup.findById(targetId).select('title');
    return writeup?.title ?? null;
  }
  return null;
}

async function toDto(doc: ReportDoc): Promise<ReportDto> {
  // `doc.reporter` is a raw ObjectId everywhere except the populated list
  // endpoint (`listReports`) — extract the id correctly either way rather
  // than `String()`-coercing whichever shape happens to be on the doc (the
  // same populated-vs-unpopulated trap already fixed once in
  // user.service.ts#toSafeUser).
  const reporter = doc.reporter as unknown as { _id: unknown; username: string } | Types.ObjectId;
  const populatedReporter = 'username' in reporter ? reporter : null;
  return {
    id: doc.id,
    reporterId: String(populatedReporter ? populatedReporter._id : doc.reporter),
    reporterUsername: populatedReporter?.username ?? null,
    targetType: doc.targetType,
    targetId: String(doc.targetId),
    targetTitle: await resolveTargetTitle(doc.targetType, doc.targetId),
    reason: doc.reason,
    status: doc.status,
    reviewedBy: doc.reviewedBy ? String(doc.reviewedBy) : null,
    reviewedAt: doc.reviewedAt ?? null,
    createdAt: doc.createdAt,
  };
}

export async function createReport(reporterId: string, input: CreateReportInput): Promise<ReportDto> {
  if (!Types.ObjectId.isValid(input.targetId)) throw AppError.notFound('Reported item not found.');

  if (input.targetType === 'writeup') {
    const exists = await Writeup.exists({ _id: input.targetId });
    if (!exists) throw AppError.notFound('Reported item not found.');
  }

  const existingOpen = await Report.findOne({
    reporter: reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    status: { $in: ['OPEN', 'REVIEWING'] },
  });
  if (existingOpen) throw AppError.conflict('You already have an open report for this item.');

  const doc = await Report.create({
    reporter: reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
  });

  return toDto(doc);
}

export async function listReports(opts: ListAdminReportsQuery) {
  const filter: Record<string, unknown> = opts.status ? { status: opts.status } : {};
  const skip = (opts.page - 1) * opts.limit;
  const [docs, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit).populate('reporter', 'username'),
    Report.countDocuments(filter),
  ]);

  return {
    reports: await Promise.all(docs.map((d) => toDto(d))),
    pagination: { page: opts.page, limit: opts.limit, total, totalPages: Math.max(1, Math.ceil(total / opts.limit)) },
  };
}

async function requireOpenReport(id: string): Promise<ReportDoc> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Report not found.');
  const doc = await Report.findById(id);
  if (!doc) throw AppError.notFound('Report not found.');
  if (!['OPEN', 'REVIEWING'].includes(doc.status)) {
    throw AppError.conflict('This report has already been reviewed.');
  }
  return doc;
}

export async function resolveReport(adminId: string, id: string): Promise<ReportDto> {
  const doc = await requireOpenReport(id);
  doc.status = 'RESOLVED';
  doc.reviewedBy = new Types.ObjectId(adminId);
  doc.reviewedAt = new Date();
  await doc.save();
  await recordAudit(adminId, 'ADMIN', 'ADMIN_RESOLVED_REPORT', 'report', doc.id);
  return toDto(doc);
}

export async function dismissReport(adminId: string, id: string): Promise<ReportDto> {
  const doc = await requireOpenReport(id);
  doc.status = 'DISMISSED';
  doc.reviewedBy = new Types.ObjectId(adminId);
  doc.reviewedAt = new Date();
  await doc.save();
  await recordAudit(adminId, 'ADMIN', 'ADMIN_DISMISSED_REPORT', 'report', doc.id);
  return toDto(doc);
}
