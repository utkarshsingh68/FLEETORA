import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { RolesGuard, SupabaseAuthGuard } from '../auth/rbac';
import { IntelligenceService } from './intelligence.service';

type FleetoraRequest = { user: { companyId: string; token: string } };
class AskIntelligenceDto { @IsString() @MinLength(2) @MaxLength(500) question!: string; }

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceService) {}
  @Get('overview') overview(@Req() req: FleetoraRequest) { return this.intelligence.overview(req.user.companyId, req.user.token); }
  @Post('ask') ask(@Req() req: FleetoraRequest, @Body() body: AskIntelligenceDto) { return this.intelligence.ask(req.user.companyId, req.user.token, body.question.trim()); }
}
