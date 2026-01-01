import axios from 'axios';
import { z } from 'zod';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

export const BatchSchema = z.object({
    _id: z.string().optional(),
    name: z.string(),
    projectName: z.string(),
    procedures: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
    })),
    priority: z.number(),
    startDate: z.string().optional(),
    deadline: z.string(),
    status: z.enum(['pending', 'scheduled', 'completed']),
    schedule: z.object({
        workerId: z.string(),
        date: z.string(),
    }).optional(),
    segments: z.array(z.object({
        date: z.string(),
        workerCount: z.number(),
        completedProcedures: z.array(z.object({
            name: z.string(),
            quantity: z.number(),
            workerCount: z.number(),
        })),
    })).optional(),
});

export type Batch = z.infer<typeof BatchSchema>;

export const createBatchSchema = z.object({
    name: z.string().min(1, "Name is required"),
    projectName: z.string().min(1, "Project Name is required"),
    procedures: z.array(z.object({
        name: z.string().min(1, "Procedure name is required"),
        quantity: z.number().min(1, "Quantity must be positive"),
    })).min(1, "At least one procedure is required"),
    priority: z.number().min(1).max(5),
    startDate: z.string().datetime().optional(),
    deadline: z.string().datetime(),
});

export type CreateBatchForm = z.infer<typeof createBatchSchema>;

export const updateBatchSchema = createBatchSchema.partial();
export type UpdateBatchForm = z.infer<typeof updateBatchSchema>;

export const fetchBatches = async () => {
    const res = await api.get('/production/batches');
    return z.array(BatchSchema).parse(res.data);
};

export const createBatch = async (data: CreateBatchForm) => {
    const res = await api.post('/production/batches', data);
    return BatchSchema.parse(res.data);
};

export const updateBatch = async ({ id, data }: { id: string; data: UpdateBatchForm }) => {
    const res = await api.patch(`/production/${id}`, data);
    return res.data;
};

export const deleteBatch = async (id: string) => {
    await api.delete(`/production/${id}`);
};
