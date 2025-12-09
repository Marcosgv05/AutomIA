import { Module } from '@nestjs/common';
import { LlmModule } from './llm/llm.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [LlmModule, MediaModule],
  exports: [LlmModule, MediaModule],
})
export class AiModule {}
