import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

// Append-only broadcast messages from an admin to every logged-in user's
// notification center. No edit — only create and delete (retract).
const announcementSchema = new Schema(
  {
    message: { type: String, required: true, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

announcementSchema.index({ createdAt: -1 });

export type AnnouncementDoc = HydratedDocument<InferSchemaType<typeof announcementSchema>>;

export const Announcement = model('Announcement', announcementSchema);
