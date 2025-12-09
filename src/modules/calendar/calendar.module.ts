import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  providers: [GoogleAuthService, CalendarService],
  controllers: [CalendarController],
  exports: [GoogleAuthService, CalendarService],
})
export class CalendarModule {}
