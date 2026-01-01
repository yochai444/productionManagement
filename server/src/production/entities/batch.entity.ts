import { ObjectId } from 'mongodb';

export interface Batch {
  _id?: ObjectId;
  name: string;
  projectName: string;
  procedures: {
    name: string;
    quantity: number;
  }[];
  priority: number;
  startDate?: Date;
  deadline: Date;
  status: 'pending' | 'scheduled' | 'completed';
  schedule?: {
    workerId: string;
    date: Date;
  };
  segments?: {
    date: Date;
    workerCount: number;
    completedProcedures: {
      name: string;
      quantity: number;
      workerCount: number;
    }[];
  }[];
}
