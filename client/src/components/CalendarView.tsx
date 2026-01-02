import { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { Box, Typography, Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { Batch } from '../api';

interface CalendarViewProps {
    batches: Batch[];
    onBatchClick: (batch: Batch) => void;
}

export function CalendarView({ batches, onBatchClick }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const checkDays = useMemo(() => {
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [startDate, endDate]);

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={handlePrevMonth}>
                    <ArrowForwardIcon />
                </IconButton>
                <Typography variant="h5">
                    {format(monthStart, 'MMMM yyyy', { locale: he })}
                </Typography>
                <IconButton onClick={handleNextMonth}>
                    <ArrowBackIcon />
                </IconButton>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map(day => (
                    <Typography key={day} align="center" variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {day}
                    </Typography>
                ))}

                {checkDays.map(day => {
                    const dayBatches = batches.filter(b => {
                        if (b.segments && b.segments.length > 0) {
                            return b.segments.some(seg => isSameDay(new Date(seg.date), day));
                        }
                        return b.schedule?.date && isSameDay(new Date(b.schedule.date), day);
                    });
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0)); // Strictly before today (ignoring time)
                    const isTodayDate = isToday(day);

                    return (
                        <Box
                            key={day.toISOString()}
                            onClick={() => setSelectedDay(day)}
                            sx={{
                                minHeight: 100,
                                border: '1px solid #e0e0e0',
                                p: 1,
                                bgcolor: isTodayDate ? '#fff3e0' : (isPast ? '#e8f5e9' : (isCurrentMonth ? 'background.paper' : '#f5f5f5')), // Orangeish for today, Green for past
                                opacity: isCurrentMonth ? 1 : 0.6,
                                position: 'relative',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#f0f0f0' }
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: isTodayDate ? 'bold' : 'normal',
                                    color: isTodayDate ? 'primary.main' : 'text.primary',
                                    display: 'block',
                                    mb: 0.5
                                }}
                            >
                                {format(day, 'd')}
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {dayBatches.map(batch => {
                                    let label = `${batch.projectName}: ${batch.name}`;

                                    if (batch.segments && batch.segments.length > 0) {
                                        const seg = batch.segments.find(s => isSameDay(new Date(s.date), day));
                                        if (seg) {
                                            label = `${batch.projectName}: ${batch.name} (עובדים: ${seg.workerCount})`;
                                        }
                                    }

                                    const isChipPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                                    return (
                                        <Chip
                                            key={batch._id}
                                            label={label}
                                            size="small"
                                            color={isChipPast ? 'success' : (batch.priority >= 4 ? 'error' : 'primary')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onBatchClick && onBatchClick(batch);
                                            }}
                                            sx={{
                                                height: 'auto',
                                                py: 0.5,
                                                fontSize: '0.65rem',
                                                '& .MuiChip-label': { px: 0.5, whiteSpace: 'normal', display: 'block' },
                                                cursor: 'pointer',
                                                bgcolor: isChipPast ? 'success.light' : undefined, // Optional: customize shade if 'success' is too dark
                                                color: isChipPast ? 'success.contrastText' : undefined
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            <Dialog open={!!selectedDay} onClose={() => setSelectedDay(null)} maxWidth="sm" fullWidth dir="rtl">
                <DialogTitle sx={{ textAlign: 'right' }}>
                    ייצור לתאריך {selectedDay ? format(selectedDay, 'PPPP', { locale: he }) : ''}
                </DialogTitle>
                <DialogContent>
                    <List>
                        {selectedDay && batches.filter(b => {
                            if (b.segments && b.segments.length > 0) {
                                return b.segments.some(seg => isSameDay(new Date(seg.date), selectedDay));
                            }
                            return b.schedule?.date && isSameDay(new Date(b.schedule.date), selectedDay);
                        }).map((batch, index) => {
                            if (batch.segments && batch.segments.length > 0) {
                                const seg = batch.segments.find(s => isSameDay(new Date(s.date), selectedDay));
                                if (seg) {
                                    const header = `${batch.projectName}: ${batch.name} | עובדים: ${seg.workerCount}`;

                                    const breakdown = seg.completedProcedures ? seg.completedProcedures.map((p, idx) => {
                                        // Calculate remaining quantity
                                        const procedureTotal = batch.procedures.find(bp => bp.name === p.name)?.quantity || 0;

                                        // Sum of ALL production for this procedure in segments BEFORE or ON this day
                                        // Note: If we want "Remaining to produce", it is Total - ProducedSoFar.
                                        let producedSoFar = 0;
                                        batch.segments?.forEach(s => {
                                            if (new Date(s.date) <= selectedDay) {
                                                const producedInSeg = s.completedProcedures?.find(cp => cp.name === p.name)?.quantity || 0;
                                                producedSoFar += producedInSeg;
                                            }
                                        });

                                        const remaining = Math.max(0, procedureTotal - producedSoFar);

                                        return (
                                            <Typography key={idx} variant="body2" display="block">
                                                {p.name}: {p.quantity} | עובדים: {p.workerCount ?? 0} | נותר: {remaining}
                                            </Typography>
                                        );
                                    }) : null;

                                    return (
                                        <Box key={batch._id || index}>
                                            <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                                <Typography variant="subtitle1" fontWeight="bold" align="right" dir="rtl">
                                                    {header}
                                                </Typography>
                                                <Box sx={{ width: '100%', pr: 2, textAlign: 'right' }} dir="rtl">
                                                    {breakdown}
                                                </Box>
                                            </ListItem>
                                            <Divider component="li" />
                                        </Box>
                                    );
                                }
                            }

                            // Fallback for non-segmented view (should rarely happen in this filtered list)
                            return (
                                <Box key={batch._id || index}>
                                    <ListItem>
                                        <ListItemText
                                            primary={`${batch.projectName}: ${batch.name}`}
                                            secondary={`עדיפות: ${batch.priority}`}
                                            sx={{ textAlign: 'right' }}
                                        />
                                    </ListItem>
                                    <Divider component="li" />
                                </Box>
                            );
                        })}
                        {selectedDay && batches.filter(b => {
                            if (b.segments && b.segments.length > 0) {
                                return b.segments.some(seg => isSameDay(new Date(seg.date), selectedDay));
                            }
                            return b.schedule?.date && isSameDay(new Date(b.schedule.date), selectedDay);
                        }).length === 0 && (
                                <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'right' }}>אין ייצור מתוכנן ליום זה.</Typography>
                            )}
                    </List>
                </DialogContent>
            </Dialog>
        </Paper>
    );
}
