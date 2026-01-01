import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { z } from 'zod';
import { createBatch, createBatchSchema, updateBatch, deleteBatch } from '../api';
import type { CreateBatchForm as ApiFormType, Batch } from '../api';

interface Props {
    open: boolean;
    onClose: () => void;
    initialData?: Batch | null;
}

export function CreateBatchForm({ open, onClose, initialData }: Props) {
    const queryClient = useQueryClient();
    const formSchema = createBatchSchema.extend({
        deadline: z.string().min(1, "End Date is required"),
        startDate: z.string().optional(),
    });

    type LocalFormType = z.infer<typeof formSchema>;

    const defaultValues: LocalFormType = {
        name: initialData?.name ?? '',
        projectName: initialData?.projectName ?? '',
        procedures: initialData?.procedures?.map(p => ({
            name: p.name,
            quantity: p.quantity
        })) ?? [{ name: '', quantity: 1 }],
        priority: initialData?.priority ?? 1,
        startDate: initialData?.startDate?.slice(0, 16) ?? '',
        deadline: initialData?.deadline?.slice(0, 16) ?? '',
    };

    const { register, control, handleSubmit, formState: { errors }, reset } = useForm<LocalFormType>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "procedures"
    });

    useEffect(() => {
        if (open) {
            reset(defaultValues);
        }
    }, [open, initialData, reset]);

    const onSubmit = (data: LocalFormType) => {
        const payload: ApiFormType = {
            ...data,
            startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
            deadline: new Date(data.deadline).toISOString(),
        };

        if (initialData?._id) {
            updateMutation.mutate({ id: initialData._id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const createMutation = useMutation({
        mutationFn: createBatch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches'] });
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateBatch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches'] });
            onClose();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteBatch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches'] });
            onClose();
        },
    });

    const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {initialData ? 'עריכת מנה' : ' יצירת מנה חדשה'}
                {initialData && (
                    <IconButton onClick={() => deleteMutation.mutate(initialData._id!)} color="error" disabled={isPending}>
                        <DeleteIcon />
                    </IconButton>
                )}
            </DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Project Name"
                            {...register('projectName')}
                            error={!!errors.projectName}
                            helperText={errors.projectName?.message}
                            fullWidth
                        />
                        <TextField
                            label="Batch Name"
                            {...register('name')}
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            fullWidth
                        />
                        {fields.map((field, index) => (
                            <Box key={field.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                <TextField
                                    select
                                    label="Procedure"
                                    defaultValue={field.name}
                                    {...register(`procedures.${index}.name`)}
                                    error={!!errors.procedures?.[index]?.name}
                                    helperText={errors.procedures?.[index]?.name?.message}
                                    sx={{ flex: 2 }}
                                >
                                    <MenuItem value="door_assembly">Door Assembly (1/day)</MenuItem>
                                    <MenuItem value="window_frame">Window Frame (2/day)</MenuItem>
                                    <MenuItem value="painting">Painting (5/day)</MenuItem>
                                </TextField>

                                <TextField
                                    type="number"
                                    label="Quantity"
                                    defaultValue={field.quantity}
                                    {...register(`procedures.${index}.quantity`, { valueAsNumber: true })}
                                    error={!!errors.procedures?.[index]?.quantity}
                                    helperText={errors.procedures?.[index]?.quantity?.message}
                                    sx={{ flex: 1 }}
                                />

                                <IconButton onClick={() => remove(index)} color="error" disabled={fields.length === 1}>
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        ))}
                        <Button onClick={() => append({ name: '', quantity: 1 })} variant="outlined">
                            Add Procedure
                        </Button>

                        <TextField
                            type="number"
                            label="Priority (1-5)"
                            inputProps={{ min: 1, max: 5 }}
                            {...register('priority', { valueAsNumber: true })}
                            error={!!errors.priority}
                            helperText={errors.priority?.message}
                        />

                        <TextField
                            type="datetime-local"
                            label="Start Date (Optional)"
                            InputLabelProps={{ shrink: true }}
                            {...register('startDate')}
                            error={!!errors.startDate}
                            helperText={errors.startDate?.message}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={(e) => {
                                            const input = (e.target as HTMLElement).closest('.MuiFormControl-root')?.querySelector('input');
                                            input?.showPicker();
                                        }}>
                                            <CalendarTodayIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            type="datetime-local"
                            label="End Date"
                            InputLabelProps={{ shrink: true }}
                            {...register('deadline')}
                            error={!!errors.deadline}
                            helperText={errors.deadline?.message}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={(e) => {
                                            const input = (e.target as HTMLElement).closest('.MuiFormControl-root')?.querySelector('input');
                                            input?.showPicker();
                                        }}>
                                            <CalendarTodayIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'flex-start' }}>
                    <Button onClick={onClose}>ביטול</Button>
                    <Button variant="contained" type="submit" disabled={isPending}>
                        {isPending ? "שומר..." : (initialData ? 'עידכון' : 'יצירה')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
