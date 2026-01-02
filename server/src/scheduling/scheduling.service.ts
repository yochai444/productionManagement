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

                // Skip Friday (5) and Saturday (6)
                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek === 5 || dayOfWeek === 6) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    i--; // Don't count non-work days against our 60 day limit check
                    continue;
                }

                // Check for "Passed Days" logic
                // If currentDate is strictly before startDate (which is "now"), consider it "Completed"
                // But wait, the loop starts from batchStart.
                // If batch has "segments" from previous run, we should likely respect them?
                // Actually, simplistic approach:
                // We re-calculate everything. If the allocated date is in the past, it's "Done".
                // If it's in the future, we check resource availability.

                // However, to properly support "Passed day = completed", 
                // we should assign past dates strictly if the batch started in the past.
                // But resources for past days don't matter for *future* scheduling collisions,
                // except that we don't want to double count or fail scheduling for past dates.

                // Let's refine the logic:
                // 1. If date < startDate (today): 
                //    - Accept the schedule regardless of capacity (it's history).
                //    - Mark as produced.
                // 2. If date >= startDate (today):
                //    - Check capacity.

                const isPast = currentDate < startDate;
                const usedWorkers = workerUsageMap.get(dateStr) || 0;
                let availableWorkers = isPast ? 9999 : (this.TOTAL_WORKERS - usedWorkers); // Past capacity is infinite (assumed done)

                if (availableWorkers > 0) {
                    const dailyCompletedProcedures: { name: string; quantity: number; workerCount: number }[] = [];
                    let workersUsedToday = 0;

                    // Greedily fill procedures sequentially
                    for (const proc of remainingProcedures) {
                        if (proc.quantity <= 0) continue;
                        // For past dates, we don't break on availableWorkers check, we just assume it happened.
                        // But wait, if we are reconstructing history, we probably want to respect the original plan?
                        // The user said: "Passed day indicates that the part of the batch for that day was performed... passed days should be green".
                        // This implies we simply accept the "schedule" that *would have been* or *was*.
                        // Since we are re-running scheduling every time, we need to ensure we don't "change" history too much.
                        // Best effort: Re-simulate the past.

                        if (!isPast && availableWorkers <= 0) break;

                        const rate = this.EFFICIENCY_RATES[proc.name] || 1;

                        // How many workers needed for THIS procedure?
                        const workersForProc = Math.ceil(proc.quantity / rate);

                        // Allocate what we can
                        const allocate = isPast ? workersForProc : Math.min(workersForProc, availableWorkers);

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

                        if (!isPast) {
                            workerUsageMap.set(dateStr, usedWorkers + workersUsedToday);
                        }
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
