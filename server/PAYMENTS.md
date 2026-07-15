# Customer documents and Razorpay setup

Apply Supabase migrations before deploying the API. The customer-document
bucket is private; API responses only expose short-lived signed URLs.

Configure these server-only environment variables in Render:

```env
SUPABASE_SERVICE_ROLE_KEY=...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
CUSTOMER_PORTAL_REDIRECT_URL=https://fleetora-web-utkarsh.onrender.com/customer-portal
```

Never expose the service-role key, Razorpay key secret, or webhook secret in a
`NEXT_PUBLIC_*` variable. Only `RAZORPAY_KEY_ID` is returned to an authenticated
checkout client.

Configure the Razorpay webhook URL as:

```text
https://<api-host>/api/v1/payments/webhook
```

Subscribe to `payment.authorized`, `payment.captured`, `payment.failed`, and
`order.paid`. Use a dedicated webhook secret. A captured webhook is verified
against the raw request bytes, deduplicated, amount/currency checked, and then
posts the payment, invoice status, and party-ledger credit in one transaction.

`POST /api/v1/payments/create` requires a unique client-generated
`idempotency_key` for each intended payment. Reusing it returns the same order;
reusing it for another invoice or amount is rejected.

Document upload flow:

1. Staff calls `POST /api/v1/portal/documents` with document metadata.
2. The API returns `upload.signedUrl` for the tenant-prefixed private object.
3. The browser uploads the file to that URL using the declared MIME type.
4. Authorized staff/customer users request a five-minute download URL from
   `GET /api/v1/portal/documents/:id/download`.

Customer portal invitation flow:

1. An owner or administrator selects **Invite customer** in the customer portal.
2. The API verifies that the customer belongs to the active company and that a
   saved customer email cannot be replaced with a different address.
3. Supabase Auth sends a password setup invitation for a new account, or the API
   safely links an existing account to that customer.
4. The service-role-only SQL function writes `customer_portal_users`; neither the
   service key nor account-linking access is exposed to the browser.
