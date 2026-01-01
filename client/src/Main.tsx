import { useState } from 'react';
import { Typography, Button, Box } from '@mui/material';
import { CreateBatchForm } from './components/CreateBatchForm';
import { Dashboard } from './components/Dashboard';
import type { Batch } from './api';

export function Main() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  const handleCreate = () => {
    setSelectedBatch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  return (
    <div style={{ padding: 20 }}>
      <Typography variant="h3" component="h1" align="center" sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}>
        ניהול משאבי ייצור
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'medium' }}>
          לוח זמני ייצור
        </Typography>
        <Button variant="contained" onClick={handleCreate} size="large">
          צור  מנה חדשה +
        </Button>
      </Box>

      <CreateBatchForm
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedBatch}
      />
      <Dashboard onEditBatch={handleEdit} />
    </div>
  );
}
