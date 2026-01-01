import { z } from 'zod';

export const createBatchSchema = z.object({
    name: z.string().min(1),
    projectName: z.string().min(1),
    procedures: z.array(z.object({
        name: z.string().min(1),
        quantity: z.number().int().positive()
    })).min(1),
    priority: z.number().int().min(1).max(5),
    startDate: z.string().datetime().optional(),
    deadline: z.string().datetime(),
});

export type CreateBatchDto = z.infer<typeof createBatchSchema>;
