import mongoose, { Schema, Document } from 'mongoose';

export interface IPracticeProgressDocument extends Document {
  userId: mongoose.Types.ObjectId;
  kitId: mongoose.Types.ObjectId;
  completedCardIds: string[];
  ratings: Map<string, number>; // cardId -> 1 to 5 rating
  createdAt: Date;
  updatedAt: Date;
}

const PracticeProgressSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kitId: { type: Schema.Types.ObjectId, ref: 'Kit', required: true, index: true },
    completedCardIds: [{ type: String }],
    ratings: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

// Compound index so one user has at most one practice progress document per kit
PracticeProgressSchema.index({ userId: 1, kitId: 1 }, { unique: true });

export const PracticeProgress =
  mongoose.models.PracticeProgress ||
  mongoose.model<IPracticeProgressDocument>('PracticeProgress', PracticeProgressSchema);
