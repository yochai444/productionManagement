import { useQuery } from '@tanstack/react-query';
import { fetchBatches } from './api';
import { Box, Typography } from '@mui/material';
import { CalendarView } from './components/CalendarView';

interface Props {
    onEditBatch: (batch: any) => void;
}

export function Dashboard({ onEditBatch }: Props) {
    const { data: batches, isLoading } = useQuery({
        queryKey: ['batches'],
        queryFn: fetchBatches,
        refetchInterval: 5000,
    });

    if (isLoading) return <Typography>Loading Schedule...</Typography>;

    return (
        <Box>

            {batches && <CalendarView batches={batches} onBatchClick={onEditBatch} />}
        </Box>
    );
}
