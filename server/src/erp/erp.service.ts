import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ErpService {
  constructor(private prisma: PrismaService) {}
  vehicles(companyId: string, page = 1, limit = 25, search = '') { return this.prisma.vehicle.findMany({ where: { companyId, deletedAt: null, OR: search ? [{ registrationNumber: { contains: search, mode: 'insensitive' } }, { makeModel: { contains: search, mode: 'insensitive' } }] : undefined }, skip: (page - 1) * limit, take: Math.min(limit, 100), orderBy: { createdAt: 'desc' } }); }
  trips(companyId: string, page = 1, limit = 25, status?: string) { return this.prisma.trip.findMany({ where: { companyId, deletedAt: null, status: status as never }, include: { vehicle: true, driver: true, customer: true }, skip: (page - 1) * limit, take: Math.min(limit, 100), orderBy: { scheduledStartAt: 'desc' } }); }
  async dashboard(companyId: string) { const [vehicles, runningTrips, customers, receivable] = await this.prisma.$transaction([this.prisma.vehicle.count({ where: { companyId, deletedAt: null } }), this.prisma.trip.count({ where: { companyId, status: 'IN_TRANSIT', deletedAt: null } }), this.prisma.customer.count({ where: { companyId, deletedAt: null } }), this.prisma.invoice.aggregate({ where: { companyId, status: { in: ['SENT','PARTIAL','OVERDUE'] }, deletedAt: null }, _sum: { amount: true } })]); return { vehicles, runningTrips, customers, receivable: receivable._sum.amount ?? 0 }; }
}
