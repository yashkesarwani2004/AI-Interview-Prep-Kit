import mongoose, { Schema, Document } from 'mongoose';
import { PrepKit } from '../../shared/types';

export interface IKitDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  companyName: string;
  data: PrepKit;
  createdAt: Date;
  updatedAt: Date;
}

const KitSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    companyName: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Kit = mongoose.models.Kit || mongoose.model<IKitDocument>('Kit', KitSchema);
