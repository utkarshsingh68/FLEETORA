import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { FleetoraPrincipal } from '../auth/rbac';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateOnlinePaymentDto } from './portal.dto';

type PaymentRecord = {
  id: string;
  invoice_id: string;
  customer_id: string;
  provider_order_id?: string;
  provider_payment_id?: string;
  status: string;
  amount: number | string;
  currency: string;
  receipt: string;
};

type PaymentReservation = {
  created: boolean;
  payment: PaymentRecord;
  invoice: { id: string; invoice_number: string };
};

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  [key: string]: unknown;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly config: ConfigService,
    private readonly db: SupabaseService,
  ) {}

  async createPayment(principal: FleetoraPrincipal, body: CreateOnlinePaymentDto) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) throw new ServiceUnavailableException('Online payments are not configured');

    const reservation = await this.db.rpc<PaymentReservation>(
      'fleetora_reserve_invoice_payment',
      principal.token,
      {
        p_company_id: principal.companyId,
        p_invoice_id: body.invoice_id,
        p_amount: body.amount ?? null,
        p_idempotency_key: body.idempotency_key,
      },
    );

    if (!reservation.created) {
      if (['created', 'authorized', 'captured'].includes(reservation.payment.status) && reservation.payment.provider_order_id) {
        return this.checkoutResponse(keyId, reservation);
      }
      if (reservation.payment.status === 'initiating') {
        throw new ConflictException('Payment initialization is already in progress');
      }
      throw new ConflictException('This payment attempt has failed; retry with a new idempotency key');
    }

    const amountMinor = Math.round(Number(reservation.payment.amount) * 100);
    let order: RazorpayOrder;
    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountMinor,
          currency: reservation.payment.currency,
          receipt: reservation.payment.receipt,
          notes: {
            fleetora_payment_id: reservation.payment.id,
            fleetora_invoice_id: reservation.payment.invoice_id,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const payload = await response.json() as RazorpayOrder & { error?: { code?: string; description?: string } };
      if (!response.ok) {
        await this.failInitialization(reservation.payment.id, payload.error?.code, payload.error?.description, payload);
        throw new BadGatewayException('Payment provider rejected the order');
      }
      if (!payload.id || payload.amount !== amountMinor || payload.currency !== reservation.payment.currency) {
        await this.failInitialization(reservation.payment.id, 'invalid_provider_response', 'Provider order did not match the reservation', payload);
        throw new BadGatewayException('Payment provider returned an invalid order');
      }
      order = payload;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      await this.failInitialization(
        reservation.payment.id,
        'provider_unavailable',
        error instanceof Error ? error.message.slice(0, 500) : 'Unknown provider error',
        {},
      );
      throw new BadGatewayException('Payment provider is temporarily unavailable');
    }

    const payment = await this.db.serviceRpc<PaymentRecord>('fleetora_set_provider_order', {
      p_payment_id: reservation.payment.id,
      p_provider_order_id: order.id,
      p_status: 'created',
      p_payload: order,
      p_failure_code: null,
      p_failure_description: null,
    });
    return this.checkoutResponse(keyId, { ...reservation, payment });
  }

  async processWebhook(rawBody: Buffer | undefined, signature: string | undefined, eventIdHeader?: string) {
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) throw new ServiceUnavailableException('Payment webhook is not configured');
    if (!rawBody?.length) throw new BadRequestException('Raw webhook body is required');
    if (!signature || !this.validSignature(rawBody, signature, webhookSecret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let webhook: Record<string, unknown>;
    try {
      webhook = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid webhook JSON');
    }

    const eventType = typeof webhook.event === 'string' ? webhook.event : '';
    const status = this.webhookStatus(eventType);
    if (!status) return { ok: true, ignored: true, event: eventType || 'unknown' };

    const payload = webhook.payload as { payment?: { entity?: Record<string, unknown> } } | undefined;
    const payment = payload?.payment?.entity;
    const providerOrderId = typeof payment?.order_id === 'string' ? payment.order_id : undefined;
    const providerPaymentId = typeof payment?.id === 'string' ? payment.id : undefined;
    const amountMinor = typeof payment?.amount === 'number' ? payment.amount : Number(payment?.amount);
    const currency = typeof payment?.currency === 'string' ? payment.currency : undefined;
    if (!providerOrderId || !providerPaymentId || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !currency) {
      throw new BadRequestException('Webhook payment payload is incomplete');
    }

    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const eventId = eventIdHeader?.trim() || payloadHash;
    const result = await this.db.serviceRpc<Record<string, unknown>>('fleetora_process_payment_webhook', {
      p_event_id: eventId,
      p_event_type: eventType,
      p_provider_order_id: providerOrderId,
      p_provider_payment_id: providerPaymentId,
      p_amount_minor: amountMinor,
      p_currency: currency,
      p_status: status,
      p_payload: payment,
      p_payload_hash: payloadHash,
    });
    return { ok: true, ...result };
  }

  private checkoutResponse(keyId: string, reservation: PaymentReservation) {
    return {
      payment: {
        id: reservation.payment.id,
        status: reservation.payment.status,
        amount: Number(reservation.payment.amount),
        currency: reservation.payment.currency,
      },
      invoice: reservation.invoice,
      checkout: {
        provider: 'razorpay',
        keyId,
        orderId: reservation.payment.provider_order_id,
        amount: Math.round(Number(reservation.payment.amount) * 100),
        currency: reservation.payment.currency,
      },
    };
  }

  private failInitialization(
    paymentId: string,
    code: string | undefined,
    description: string | undefined,
    payload: Record<string, unknown>,
  ) {
    return this.db.serviceRpc('fleetora_set_provider_order', {
      p_payment_id: paymentId,
      p_provider_order_id: null,
      p_status: 'failed',
      p_payload: payload,
      p_failure_code: code ?? 'provider_error',
      p_failure_description: description?.slice(0, 1000) ?? 'Payment provider request failed',
    });
  }

  private validSignature(rawBody: Buffer, signature: string, secret: string) {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest();
    const supplied = Buffer.from(signature, 'hex');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }

  private webhookStatus(eventType: string) {
    if (eventType === 'payment.captured' || eventType === 'order.paid') return 'captured';
    if (eventType === 'payment.authorized') return 'authorized';
    if (eventType === 'payment.failed') return 'failed';
    return undefined;
  }
}
