import { z } from 'zod';
import { createBatchSchema } from './create-batch.dto';

export const updateBatchSchema = createBatchSchema.partial();
export type UpdateBatchDto = z.infer<typeof updateBatchSchema>;
