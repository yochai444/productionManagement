import { Module, Global } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<Db> => {
        try {
          const uri = configService.get<string>('MONGODB_URI');
          if (!uri) {
            throw new Error('MONGODB_URI environment variable is not defined');
          }
          const client = await MongoClient.connect(uri);
          return client.db('production-management');
        } catch (e) {
          throw e;
        }
      },
    },
  ],
  exports: ['DATABASE_CONNECTION'],
})
export class DatabaseModule { }
