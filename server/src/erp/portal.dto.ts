import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const DOCUMENT_TYPES = ['lr', 'pod', 'invoice', 'statement', 'other'] as const;
const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'] as const;
const ALLOWED_MIME_TYPES = /^(application\/pdf|image\/(jpeg|png|webp)|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/;

export class PortalDocumentQueryDto {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsUUID() trip_id?: string;
  @IsOptional() @IsUUID() invoice_id?: string;
  @IsOptional() @IsIn(DOCUMENT_TYPES) document_type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit = 100;
}

export class CreatePortalDocumentDto {
  @IsUUID() customer_id!: string;
  @IsOptional() @IsUUID() trip_id?: string;
  @IsOptional() @IsUUID() invoice_id?: string;
  @IsIn(DOCUMENT_TYPES) document_type!: string;
  @IsString() @Length(1, 180) file_name!: string;
  @IsOptional() @IsString() @Matches(ALLOWED_MIME_TYPES) mime_type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_485_760) size_bytes?: number;
}

export class PortalInvoiceQueryDto {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsIn(INVOICE_STATUSES) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit = 100;
}

export class CreateOnlinePaymentDto {
  @IsUUID() invoice_id!: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) amount?: number;
  @IsString() @Length(8, 120) @MaxLength(120) idempotency_key!: string;
}

export class CreatePortalRequestDto {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsString() @Length(1, 200) origin!: string;
  @IsString() @Length(1, 200) destination!: string;
  @IsOptional() @IsString() @MaxLength(160) material_name?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) quantity_tonnes?: number;
  @IsOptional() @IsDateString() pickup_date?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class CreatePortalDisputeDto {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsUUID() trip_id?: string;
  @IsOptional() @IsUUID() invoice_id?: string;
  @IsString() @Length(1, 200) subject!: string;
  @IsString() @Length(1, 4000) description!: string;
}

export class InvitePortalCustomerDto {
  @IsUUID() customer_id!: string;
  @IsEmail() @MaxLength(254) email!: string;
}
