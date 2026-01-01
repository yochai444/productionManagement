import { Injectable } from '@nestjs/common';
import { Batch } from '../production/entities/batch.entity';

@Injectable()
export class SchedulingService {
    private readonly TOTAL_WORKERS = 30;

    private readonly EFFICIENCY_RATES: Record<string, number> = {
        'door_assembly': 1,
        'window_frame': 2,
        'painting': 5,
    };

    scheduleBatches(
        batches: Batch[],
        startDate: Date = new Date(),
        initialUsage: Map<string, number> = new Map()
    ): Map<string, Batch[]> {
        const sortedBatches = [...batches].sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });

        const scheduleMap = new Map<string, Batch[]>();
        const workerUsageMap = new Map<string, number>(initialUsage);

        for (const batch of sortedBatches) {
            // Track remaining quantity for each procedure
            const remainingProcedures = batch.procedures.map(p => ({
                name: p.name,
                quantity: p.quantity
            }));

            // Calculate total workers needed just for sorting/check, 
            // but real logic happens in simulation
            let totalWorkersNeeded = 0;
            for (const proc of batch.procedures) {
                const rate = this.EFFICIENCY_RATES[proc.name] || 1;
                totalWorkersNeeded += Math.ceil(proc.quantity / rate);
            }

            const batchStart = batch.startDate ? new Date(batch.startDate) : startDate;
            let currentDate = batchStart > startDate ? new Date(batchStart) : new Date(startDate);

            batch.segments = [];
            let isScheduable = false;

            // Simulate up to 60 days
            for (let i = 0; i < 60; i++) {
                // Check if all procedures are done
                const allDone = remainingProcedures.every(p => p.quantity <= 0);
                if (allDone) {
                    isScheduable = true;
                    break;
                }

                const dateStr = currentDate.toISOString().split('T')[0];
                const usedWorkers = workerUsageMap.get(dateStr) || 0;
                let availableWorkers = this.TOTAL_WORKERS - usedWorkers;

                if (availableWorkers > 0) {
                    const dailyCompletedProcedures: { name: string; quantity: number; workerCount: number }[] = [];
                    let workersUsedToday = 0;

                    // Greedily fill procedures sequentially
                    for (const proc of remainingProcedures) {
                        if (proc.quantity <= 0) continue;
                        if (availableWorkers <= 0) break;

                        const rate = this.EFFICIENCY_RATES[proc.name] || 1;

                        // How many workers needed for THIS procedure?
                        const workersForProc = Math.ceil(proc.quantity / rate);

                        // Allocate what we can
                        const allocate = Math.min(workersForProc, availableWorkers);

                        // Calculate output
                        const output = allocate * rate;
                        const actualOutput = Math.min(output, proc.quantity); // Don't produce more than needed

                        dailyCompletedProcedures.push({
                            name: proc.name,
                            quantity: actualOutput,
                            workerCount: allocate
                        });

                        // Update state
                        proc.quantity -= actualOutput;
                        workersUsedToday += allocate;
                        availableWorkers -= allocate;
                    }

                    if (workersUsedToday > 0) {
                        batch.segments.push({
                            date: new Date(dateStr),
                            workerCount: workersUsedToday,
                            completedProcedures: dailyCompletedProcedures
                        });

                        const dayBatches = scheduleMap.get(dateStr) || [];
                        if (!dayBatches.find(b => b._id === batch._id)) {
                            dayBatches.push(batch);
                        }
                        scheduleMap.set(dateStr, dayBatches);

                        workerUsageMap.set(dateStr, usedWorkers + workersUsedToday);
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            if (isScheduable) {
                if (batch.segments.length > 0) {
                    batch.schedule = {
                        workerId: 'pool',
                        date: batch.segments[0].date
                    };
                    batch.status = 'scheduled';
                }
            } else {
                batch.segments = [];
                batch.status = 'pending';
            }
        }

        return scheduleMap;
    }
}
