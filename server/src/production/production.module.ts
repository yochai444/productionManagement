import { Module } from '@nestjs/common';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';
import { SchedulingService } from '../scheduling/scheduling.service';

@Module({
  controllers: [ProductionController],
  providers: [ProductionService, SchedulingService],
})
export class ProductionModule {}
