import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreatePortalDisputeDto,
  CreatePortalDocumentDto,
  CreatePortalRequestDto,
  InvitePortalCustomerDto,
  PortalDocumentQueryDto,
  PortalInvoiceQueryDto,
} from './portal.dto';

type PortalDocument = {
  id: string;
  customer_id: string;
  storage_path: string;
  file_name: string;
  mime_type?: string;
  [key: string]: unknown;
};

@Injectable()
export class PortalService {
  private readonly documentBucket = 'customer-documents';

  constructor(
    private readonly db: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async context(companyId: string, token: string, customerId: string | undefined, role: string) {
    if (!customerId) return { companyId, customerId: null, role, customer: null };
    const customers = await this.db.select<{ id: string; name: string; contact_name?: string; email?: string; phone?: string }>(
      'customers', token, {
        select: 'id,name,contact_name,email,phone',
        id: `eq.${customerId}`,
        company_id: `eq.${companyId}`,
        deleted_at: 'is.null',
        limit: 1,
      },
    );
    if (!customers[0]) throw new NotFoundException('Portal customer not found');
    return { companyId, customerId, role, customer: customers[0] };
  }

  async inviteCustomer(
    companyId: string,
    token: string,
    userId: string,
    body: InvitePortalCustomerDto,
  ) {
    const email = body.email.trim().toLowerCase();
    const customers = await this.db.select<{ id: string; name: string; email?: string | null }>('customers', token, {
      select: 'id,name,email',
      id: `eq.${body.customer_id}`,
      company_id: `eq.${companyId}`,
      deleted_at: 'is.null',
      limit: 1,
    });
    const customer = customers[0];
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.email && customer.email.trim().toLowerCase() !== email) {
      throw new BadRequestException('Invitation email must match the email saved on this customer');
    }

    const redirectTo = this.customerPortalRedirectUrl();
    const invitation = await this.db.inviteUserByEmail(email, redirectTo, {
      fleetora_company_id: companyId,
      fleetora_customer_id: customer.id,
    });
    await this.db.serviceRpc('fleetora_link_customer_portal_user', {
      p_company_id: companyId,
      p_customer_id: customer.id,
      p_email: email,
      p_invited_by: userId,
    });

    return {
      status: invitation.existing ? 'linked_existing' : 'invited',
      customer: { id: customer.id, name: customer.name },
      email,
      message: invitation.existing
        ? 'Portal access linked to the existing account. The customer can sign in with their current password.'
        : 'Portal invitation sent. The customer can set a password from the email and open their portal.',
    };
  }

  listRequests(companyId: string, token: string, principalCustomerId?: string) {
    return this.db.select('portal_requests', token, {
      select: '*,customers(name)',
      company_id: `eq.${companyId}`,
      customer_id: principalCustomerId ? `eq.${principalCustomerId}` : undefined,
      deleted_at: 'is.null',
      order: 'created_at.desc',
      limit: 500,
    });
  }

  createRequest(
    companyId: string,
    token: string,
    userId: string,
    principalCustomerId: string | undefined,
    body: CreatePortalRequestDto,
  ) {
    const customerId = principalCustomerId ?? body.customer_id;
    if (!customerId) throw new BadRequestException('customer_id is required');
    const origin = body.origin.trim();
    const destination = body.destination.trim();
    if (!origin || !destination) throw new BadRequestException('Origin and destination are required');
    return this.db.insert('portal_requests', token, {
      company_id: companyId,
      customer_id: customerId,
      requested_by: userId,
      origin,
      destination,
      material_name: body.material_name,
      quantity_tonnes: body.quantity_tonnes,
      pickup_date: body.pickup_date,
      notes: body.notes,
      status: 'requested',
    });
  }

  listDisputes(companyId: string, token: string, principalCustomerId?: string) {
    return this.db.select('customer_disputes', token, {
      select: '*,customers(name),trips(trip_number),invoices(invoice_number)',
      company_id: `eq.${companyId}`,
      customer_id: principalCustomerId ? `eq.${principalCustomerId}` : undefined,
      deleted_at: 'is.null',
      order: 'created_at.desc',
      limit: 500,
    });
  }

  createDispute(
    companyId: string,
    token: string,
    userId: string,
    principalCustomerId: string | undefined,
    body: CreatePortalDisputeDto,
  ) {
    const customerId = principalCustomerId ?? body.customer_id;
    if (!customerId) throw new BadRequestException('customer_id is required');
    const subject = body.subject.trim();
    const description = body.description.trim();
    if (!subject || !description) throw new BadRequestException('Subject and description are required');
    return this.db.insert('customer_disputes', token, {
      company_id: companyId,
      customer_id: customerId,
      trip_id: body.trip_id,
      invoice_id: body.invoice_id,
      raised_by: userId,
      subject,
      description,
      status: 'open',
    });
  }

  listDocuments(
    companyId: string,
    token: string,
    principalCustomerId: string | undefined,
    query: PortalDocumentQueryDto,
  ) {
    const customerId = principalCustomerId ?? query.customer_id;
    return this.db.select<PortalDocument>('customer_documents', token, {
      select: '*,customers(name),trips(trip_number),invoices(invoice_number)',
      company_id: `eq.${companyId}`,
      customer_id: customerId ? `eq.${customerId}` : undefined,
      trip_id: query.trip_id ? `eq.${query.trip_id}` : undefined,
      invoice_id: query.invoice_id ? `eq.${query.invoice_id}` : undefined,
      document_type: query.document_type ? `eq.${query.document_type}` : undefined,
      deleted_at: 'is.null',
      order: 'created_at.desc',
      limit: query.limit,
    });
  }

  async createDocument(companyId: string, token: string, userId: string, body: CreatePortalDocumentDto) {
    await this.assertDocumentScope(companyId, token, body);
    const fileName = this.safeFileName(body.file_name);
    const storagePath = `${companyId}/${body.customer_id}/${randomUUID()}-${fileName}`;
    const [upload, rows] = await Promise.all([
      this.db.createSignedUploadUrl(this.documentBucket, storagePath, token),
      this.db.insert<PortalDocument>('customer_documents', token, {
        company_id: companyId,
        customer_id: body.customer_id,
        trip_id: body.trip_id,
        invoice_id: body.invoice_id,
        document_type: body.document_type,
        file_name: fileName,
        storage_path: storagePath,
        mime_type: body.mime_type,
        size_bytes: body.size_bytes,
        uploaded_by: userId,
      }),
    ]);
    return {
      document: rows[0],
      // Supabase signed upload URLs are valid for two hours.
      upload: { ...upload, expiresIn: 7_200 },
    };
  }

  async downloadDocument(
    companyId: string,
    token: string,
    principalCustomerId: string | undefined,
    id: string,
  ) {
    const documents = await this.db.select<PortalDocument>('customer_documents', token, {
      id: `eq.${id}`,
      company_id: `eq.${companyId}`,
      customer_id: principalCustomerId ? `eq.${principalCustomerId}` : undefined,
      deleted_at: 'is.null',
      limit: 1,
    });
    const document = documents[0];
    if (!document) throw new NotFoundException('Document not found');
    const signed = await this.db.createSignedDownloadUrl(this.documentBucket, document.storage_path, token, 300);
    return {
      id: document.id,
      fileName: document.file_name,
      mimeType: document.mime_type,
      url: signed.signedUrl,
      expiresIn: signed.expiresIn,
    };
  }

  async deleteDocument(companyId: string, token: string, userId: string, id: string) {
    const documents = await this.db.select<PortalDocument>('customer_documents', token, {
      id: `eq.${id}`,
      company_id: `eq.${companyId}`,
      deleted_at: 'is.null',
      limit: 1,
    });
    if (!documents[0]) throw new NotFoundException('Document not found');
    return this.db.update<PortalDocument>(
      'customer_documents',
      token,
      { id: `eq.${id}`, company_id: `eq.${companyId}` },
      { deleted_at: new Date().toISOString(), deleted_by: userId },
    );
  }

  listInvoices(
    companyId: string,
    token: string,
    principalCustomerId: string | undefined,
    query: PortalInvoiceQueryDto,
  ) {
    const customerId = principalCustomerId ?? query.customer_id;
    return this.db.select('invoices', token, {
      select: '*,customers(name),trips(trip_number,origin,destination),invoice_payments(id,amount,status,paid_at,provider_payment_id)',
      company_id: `eq.${companyId}`,
      customer_id: customerId ? `eq.${customerId}` : undefined,
      status: principalCustomerId
        ? (query.status ? `eq.${query.status}` : 'in.(sent,partial,paid,overdue)')
        : (query.status ? `eq.${query.status}` : undefined),
      deleted_at: 'is.null',
      order: 'issue_date.desc',
      limit: query.limit,
    });
  }

  private async assertDocumentScope(companyId: string, token: string, body: CreatePortalDocumentDto) {
    const [customers, trips, invoices] = await Promise.all([
      this.db.select('customers', token, {
        id: `eq.${body.customer_id}`, company_id: `eq.${companyId}`, deleted_at: 'is.null', limit: 1,
      }),
      body.trip_id ? this.db.select<{ customer_id?: string }>('trips', token, {
        id: `eq.${body.trip_id}`, company_id: `eq.${companyId}`, customer_id: `eq.${body.customer_id}`, deleted_at: 'is.null', limit: 1,
      }) : Promise.resolve([{}]),
      body.invoice_id ? this.db.select<{ customer_id?: string }>('invoices', token, {
        id: `eq.${body.invoice_id}`, company_id: `eq.${companyId}`, customer_id: `eq.${body.customer_id}`, deleted_at: 'is.null', limit: 1,
      }) : Promise.resolve([{}]),
    ]);
    if (!customers[0]) throw new NotFoundException('Customer not found');
    if (body.trip_id && !trips[0]) throw new NotFoundException('Trip not found for this customer');
    if (body.invoice_id && !invoices[0]) throw new NotFoundException('Invoice not found for this customer');
  }

  private safeFileName(value: string) {
    const baseName = value.replace(/^.*[\\/]/, '').trim();
    const safe = baseName.replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, '-').slice(-180);
    if (!safe || safe === '.' || safe === '..') throw new NotFoundException('Invalid file name');
    return safe;
  }

  private customerPortalRedirectUrl() {
    const configured = this.config.get<string>('CUSTOMER_PORTAL_REDIRECT_URL')?.trim();
    if (configured) return configured;
    const origin = (this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');
    return `${origin}/customer-portal`;
  }
}
