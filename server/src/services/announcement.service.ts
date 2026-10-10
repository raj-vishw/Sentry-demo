import { Types } from 'mongoose';
import { Announcement } from '../models/Announcement.js';
import { AppError } from '../utils/errors.js';
import { record as recordAudit } from './auditLog.service.js';

export interface AnnouncementDto {
  id: string;
  message: string;
  createdAt: Date;
}

function toDto(doc: { id: string; message: string; createdAt: Date }): AnnouncementDto {
  return { id: doc.id, message: doc.message, createdAt: doc.createdAt };
}

// Public — newest first, optionally only newer than `since` (the client's
// own "last seen" timestamp). Capped at 50 regardless of what's asked for,
// since this is a notification feed, not a paginated archive.
export async function listRecentAnnouncements(since?: Date, limit = 10): Promise<AnnouncementDto[]> {
  const cappedLimit = Math.min(limit, 50);
  const filter = since ? { createdAt: { $gt: since } } : {};
  const docs = await Announcement.find(filter).sort({ createdAt: -1 }).limit(cappedLimit);
  return docs.map(toDto);
}

export interface PaginatedAnnouncements {
  entries: AnnouncementDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listAnnouncementsAdmin(page: number, limit: number): Promise<PaginatedAnnouncements> {
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Announcement.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Announcement.countDocuments(),
  ]);
  return {
    entries: docs.map(toDto),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function createAnnouncement(adminId: string, message: string): Promise<AnnouncementDto> {
  const doc = await Announcement.create({ message, createdBy: adminId });
  await recordAudit(adminId, 'ADMIN', 'ADMIN_CREATED_ANNOUNCEMENT', 'announcement', doc.id, { message });
  return toDto(doc);
}

export async function deleteAnnouncement(adminId: string, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Announcement not found.');

  const doc = await Announcement.findByIdAndDelete(id);
  if (!doc) throw AppError.notFound('Announcement not found.');

  await recordAudit(adminId, 'ADMIN', 'ADMIN_DELETED_ANNOUNCEMENT', 'announcement', id, { message: doc.message });
}
