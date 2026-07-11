import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
@WebSocketGateway({ namespace: '/fleet', cors: { origin: true, credentials: true } })
export class EventsGateway { @WebSocketServer() server!: Server; publishTrip(companyId: string, payload: unknown) { this.server.to(`company:${companyId}`).emit('trip.updated', payload); } }
