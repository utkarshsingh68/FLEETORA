import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from './rbac';

@ApiTags('Authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  me(@Req() request: { user: { id: string; email?: string; companyId: string; role: string } }) {
    const { id, email, companyId, role } = request.user;
    return { id, email, companyId, role };
  }
}
