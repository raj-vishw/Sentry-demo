import { Types } from 'mongoose';
import { Writeup, type WriteupDoc } from '../models/Writeup.js';
import { Challenge } from '../models/Challenge.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { slugify } from '../utils/slug.js';
import { record as recordAudit } from './auditLog.service.js';
import { awardFirstWriteupPublished } from './achievement.service.js';
import { assertNotBanned } from './userStatus.service.js';
import type { CreateWriteupInput, UpdateWriteupInput, ListWriteupsQuery, ListAdminWriteupsQuery } from '../validators/writeup.schema.js';

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'writeup';
  let candidate = base;
  let suffix = 2;
  while (await Writeup.exists({ slug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export interface WriteupListItemDto {
  id: string;
  title: string;
  slug: string;
  challengeId: string;
  challengeTitle: string;
  category: string;
  authorId: string;
  author: string;
  status: string;
  views: number;
  likesCount: number;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface WriteupDetailDto extends WriteupListItemDto {
  content: string;
  rejectionReason: string | null;
  likedByViewer: boolean;
}

type PopulatedWriteup = WriteupDoc & {
  author: unknown;
  challenge: unknown;
};

function toListItem(doc: PopulatedWriteup): WriteupListItemDto {
  const author = doc.author as unknown as { _id: unknown; username: string };
  const challenge = doc.challenge as unknown as { _id: unknown; title: string };
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    challengeId: String(challenge._id),
    challengeTitle: challenge.title,
    category: doc.category,
    authorId: String(author._id),
    author: author.username,
    status: doc.status,
    views: doc.views,
    likesCount: doc.likesCount,
    publishedAt: doc.publishedAt ?? null,
    createdAt: doc.createdAt,
  };
}

function toDetail(doc: PopulatedWriteup, viewer: { userId?: string; isAdmin: boolean }): WriteupDetailDto {
  const item = toListItem(doc);
  const isOwnerOrAdmin = viewer.isAdmin || (!!viewer.userId && viewer.userId === item.authorId);
  return {
    ...item,
    content: doc.content,
    rejectionReason: isOwnerOrAdmin ? (doc.rejectionReason ?? null) : null,
    likedByViewer: !!viewer.userId && doc.likedBy.some((id) => String(id) === viewer.userId),
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function paginate(page: number, limit: number, total: number): Pagination {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

const PUBLIC_SORTS: Record<ListWriteupsQuery['sort'], Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  'most-viewed': { views: -1, createdAt: -1 },
  'most-liked': { likesCount: -1, createdAt: -1 },
};

export async function listPublishedWriteups(opts: ListWriteupsQuery) {
  const filter: Record<string, unknown> = { status: 'PUBLISHED' };
  if (opts.category) filter.category = opts.category;
  if (opts.search) {
    const escaped = opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = new RegExp(escaped, 'i');
  }
  if (opts.author) {
    const author = await User.findOne({ usernameLower: opts.author.toLowerCase() }).select('_id');
    filter.author = author ? author._id : new Types.ObjectId();
  }

  const skip = (opts.page - 1) * opts.limit;
  const [docs, total] = await Promise.all([
    Writeup.find(filter)
      .sort(PUBLIC_SORTS[opts.sort])
      .skip(skip)
      .limit(opts.limit)
      .populate('author', 'username')
      .populate('challenge', 'title'),
    Writeup.countDocuments(filter),
  ]);

  return {
    writeups: docs.map((d) => toListItem(d as unknown as PopulatedWriteup)),
    pagination: paginate(opts.page, opts.limit, total),
  };
}

export async function listMyWriteups(authorId: string) {
  const docs = await Writeup.find({ author: authorId })
    .sort({ createdAt: -1 })
    .populate('author', 'username')
    .populate('challenge', 'title');
  return { writeups: docs.map((d) => toListItem(d as unknown as PopulatedWriteup)) };
}

export async function listForAdmin(opts: ListAdminWriteupsQuery) {
  const filter: Record<string, unknown> = opts.status ? { status: opts.status } : {};
  const skip = (opts.page - 1) * opts.limit;
  const [docs, total] = await Promise.all([
    Writeup.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(opts.limit)
      .populate('author', 'username')
      .populate('challenge', 'title'),
    Writeup.countDocuments(filter),
  ]);
  return {
    writeups: docs.map((d) => toDetail(d as unknown as PopulatedWriteup, { isAdmin: true })),
    pagination: paginate(opts.page, opts.limit, total),
  };
}

async function findPopulated(filter: Record<string, unknown>): Promise<PopulatedWriteup> {
  const doc = await Writeup.findOne(filter).populate('author', 'username').populate('challenge', 'title');
  if (!doc) throw AppError.notFound('Writeup not found.');
  return doc as unknown as PopulatedWriteup;
}

export async function getWriteupBySlug(
  slug: string,
  viewer: { userId?: string; isAdmin: boolean },
): Promise<WriteupDetailDto> {
  const doc = await findPopulated({ slug });
  const item = toListItem(doc);
  const isOwner = !!viewer.userId && viewer.userId === item.authorId;

  if (doc.status !== 'PUBLISHED' && !isOwner && !viewer.isAdmin) {
    throw AppError.notFound('Writeup not found.');
  }

  if (doc.status === 'PUBLISHED' && !isOwner) {
    await Writeup.updateOne({ _id: doc._id }, { $inc: { views: 1 } });
    doc.views += 1;
  }

  return toDetail(doc, viewer);
}

export async function getWriteupByIdForAdmin(id: string): Promise<WriteupDetailDto> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Writeup not found.');
  const doc = await findPopulated({ _id: id });
  return toDetail(doc, { isAdmin: true });
}

export async function createWriteup(authorId: string, input: CreateWriteupInput): Promise<WriteupDetailDto> {
  if (!Types.ObjectId.isValid(input.challengeId)) throw AppError.notFound('Challenge not found.');
  const challenge = await Challenge.findOne({ _id: input.challengeId, status: 'PUBLISHED' }).select('title category');
  if (!challenge) throw AppError.notFound('Challenge not found.');

  const author = await User.findById(authorId).select('solvedChallenges.challenge status');
  if (author) assertNotBanned(author);
  const solved = !!author?.solvedChallenges.some((s) => String(s.challenge) === input.challengeId);
  if (!solved) {
    // Enforced server-side, never trusted from the client — see spec
    // "Writeup Rule": only a solver may write up a challenge.
    throw AppError.forbidden('You can only write up a challenge you have solved.');
  }

  const existing = await Writeup.findOne({ author: authorId, challenge: input.challengeId });
  if (existing) throw AppError.conflict('You already have a writeup for this challenge.');

  const slug = await generateUniqueSlug(input.title);
  const doc = await Writeup.create({
    title: input.title,
    slug,
    challenge: challenge._id,
    category: challenge.category,
    author: authorId,
    content: input.content,
    status: 'DRAFT',
  });

  return getWriteupByIdForAdmin(doc.id);
}

export async function updateWriteup(
  requesterId: string,
  isAdmin: boolean,
  id: string,
  input: UpdateWriteupInput,
): Promise<WriteupDetailDto> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Writeup not found.');
  const doc = await Writeup.findById(id);
  if (!doc) throw AppError.notFound('Writeup not found.');

  const isOwner = String(doc.author) === requesterId;
  if (!isOwner && !isAdmin) throw AppError.forbidden();
  if (!isAdmin && !['DRAFT', 'REJECTED'].includes(doc.status)) {
    throw AppError.conflict('A writeup can only be edited while in draft or after rejection.');
  }

  if (input.title !== undefined) doc.title = input.title;
  if (input.content !== undefined) doc.content = input.content;
  await doc.save();

  return getWriteupByIdForAdmin(doc.id);
}

export async function submitForReview(authorId: string, id: string): Promise<WriteupDetailDto> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Writeup not found.');
  const doc = await Writeup.findOne({ _id: id, author: authorId });
  if (!doc) throw AppError.notFound('Writeup not found.');
  if (!['DRAFT', 'REJECTED'].includes(doc.status)) {
    throw AppError.conflict('Only a draft or rejected writeup can be submitted for review.');
  }

  doc.status = 'PENDING_REVIEW';
  doc.rejectionReason = null;
  await doc.save();

  return getWriteupByIdForAdmin(doc.id);
}

export async function deleteWriteup(requesterId: string, isAdmin: boolean, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Writeup not found.');
  const doc = await Writeup.findById(id);
  if (!doc) throw AppError.notFound('Writeup not found.');
  if (!isAdmin && String(doc.author) !== requesterId) throw AppError.forbidden();

  await doc.deleteOne();
}

export async function toggleLike(userId: string, id: string): Promise<{ liked: boolean; likesCount: number }> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Writeup not found.');
  const doc = await Writeup.findOne({ _id: id, status: 'PUBLISHED' });
  if (!doc) throw AppError.notFound('Writeup not found.');

  const alreadyLiked = doc.likedBy.some((u) => String(u) === userId);
  const update = alreadyLiked
    ? { $pull: { likedBy: userId }, $inc: { likesCount: -1 } }
    : { $addToSet: { likedBy: userId }, $inc: { likesCount: 1 } };
  await Writeup.updateOne({ _id: id }, update);

  return { liked: !alreadyLiked, likesCount: doc.likesCount + (alreadyLiked ? -1 : 1) };
}

export async function approveWriteup(adminId: string, id: string): Promise<WriteupDetailDto> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Writeup not found.');
  const doc = await Writeup.findById(id);
  if (!doc) throw AppError.notFound('Writeup not found.');
  if (doc.status !== 'PENDING_REVIEW') throw AppError.conflict('Only a writeup pending review can be approved.');

  doc.status = 'PUBLISHED';
  doc.publishedAt = doc.publishedAt ?? new Date();
  doc.rejectionReason = null;
  await doc.save();
  await recordAudit(adminId, 'ADMIN', 'ADMIN_APPROVED_WRITEUP', 'writeup', doc.id);
  await awardFirstWriteupPublished(String(doc.author));

  return getWriteupByIdForAdmin(doc.id);
}

export async function rejectWriteup(adminId: string, id: string, reason: string): Promise<WriteupDetailDto> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Writeup not found.');
  const doc = await Writeup.findById(id);
  if (!doc) throw AppError.notFound('Writeup not found.');
  if (doc.status !== 'PENDING_REVIEW') throw AppError.conflict('Only a writeup pending review can be rejected.');

  doc.status = 'REJECTED';
  doc.rejectionReason = reason;
  await doc.save();
  await recordAudit(adminId, 'ADMIN', 'ADMIN_REJECTED_WRITEUP', 'writeup', doc.id, { reason });

  return getWriteupByIdForAdmin(doc.id);
}

export async function archiveWriteup(adminId: string, id: string): Promise<WriteupDetailDto> {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Writeup not found.');
  const doc = await Writeup.findById(id);
  if (!doc) throw AppError.notFound('Writeup not found.');
  if (!['PUBLISHED', 'REJECTED'].includes(doc.status)) {
    throw AppError.conflict('Only a published or rejected writeup can be archived.');
  }

  doc.status = 'ARCHIVED';
  await doc.save();
  await recordAudit(adminId, 'ADMIN', 'ADMIN_ARCHIVED_WRITEUP', 'writeup', doc.id);

  return getWriteupByIdForAdmin(doc.id);
}
