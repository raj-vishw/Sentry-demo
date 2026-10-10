import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const hintSchema = new Schema(
  {
    challenge: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    cost: { type: Number, required: true, min: 0, default: 0 },
    order: { type: Number, required: true, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

hintSchema.index({ challenge: 1, order: 1 });

export type HintDoc = HydratedDocument<InferSchemaType<typeof hintSchema>>;

export const Hint = model('Hint', hintSchema);
