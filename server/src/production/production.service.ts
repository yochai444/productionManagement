import { Injectable, Inject } from '@nestjs/common';
import { Db, Collection, ObjectId } from 'mongodb';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { Batch } from './entities/batch.entity';
import { SchedulingService } from '../scheduling/scheduling.service';

@Injectable()
export class ProductionService {
  private batchCollection: Collection<Batch>;
  private schedulingQueue: Promise<void> = Promise.resolve();

  constructor(
    @Inject('DATABASE_CONNECTION') private db: Db,
    private schedulingService: SchedulingService,
  ) {
    this.batchCollection = this.db.collection<Batch>('batches');
  }

  async create(createBatchDto: CreateBatchDto): Promise<Batch> {
    const batch: Batch = {
      ...createBatchDto,
      startDate: createBatchDto.startDate ? new Date(createBatchDto.startDate) : undefined,
      deadline: new Date(createBatchDto.deadline),
      status: 'pending',
    };

    const result = await this.batchCollection.insertOne(batch);
    batch._id = result.insertedId;

    this.runSafeScheduling();

    return batch;
  }

  private async runSafeScheduling() {
    this.schedulingQueue = this.schedulingQueue.then(async () => {
      try {
        await this.schedulePendingBatches();
      } catch (err) {
        console.error('Scheduling error:', err);
      }
    });
    return this.schedulingQueue;
  }

  async findAll(): Promise<Batch[]> {
    return this.batchCollection.find().toArray();
  }

  async findOne(id: string): Promise<Batch | null> {
    return this.batchCollection.findOne({ _id: new ObjectId(id) });
  }

  async update(id: string, updateBatchDto: UpdateBatchDto) {
    const updateData: any = { ...updateBatchDto };
    if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);

    await this.batchCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { ...updateData, status: 'pending' },
        $unset: { schedule: "" }
      }
    );

    this.runSafeScheduling();
  }

  async remove(id: string) {
    await this.batchCollection.deleteOne({ _id: new ObjectId(id) });
  }

  async schedulePendingBatches() {
    const allActive = await this.batchCollection.find({
      status: { $in: ['pending', 'scheduled'] }
    }).toArray();

    if (allActive.length === 0) return;

    const existingUsage = new Map<string, number>();

    const scheduleMap = this.schedulingService.scheduleBatches(allActive, new Date(), existingUsage);

    for (const [date, batches] of scheduleMap) {
      for (const batch of batches) {
        if (batch._id) {
          await this.batchCollection.updateOne(
            { _id: batch._id },
            { $set: { status: 'scheduled', schedule: batch.schedule, segments: batch.segments } }
          );
        }
      }
    }
  }
}
