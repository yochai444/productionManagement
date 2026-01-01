import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ProductionService } from './production.service';
import type { CreateBatchDto } from './dto/create-batch.dto';
import type { UpdateBatchDto } from './dto/update-batch.dto';

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) { }

  @Post('batches')
  create(@Body() createBatchDto: CreateBatchDto) {
    return this.productionService.create(createBatchDto);
  }

  @Get('batches')
  findAll() {
    return this.productionService.findAll();
  }

  @Post('schedule')
  triggerSchedule() {
    return this.productionService.schedulePendingBatches();
  }

  @Patch(':id')
  update(@Body() updateBatchDto: UpdateBatchDto, @Param('id') id: string) {
    return this.productionService.update(id, updateBatchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productionService.remove(id);
  }
}
