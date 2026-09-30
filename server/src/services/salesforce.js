let tokenCache;

export function isSalesforceConfigured() {
  return Boolean(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET);
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache?.expiresAt > now + 60_000) return tokenCache;
  const host = (process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com').replace(/\/$/, '');
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.SALESFORCE_CLIENT_ID, client_secret: process.env.SALESFORCE_CLIENT_SECRET });
  const response = await fetch(`${host}/services/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Salesforce authentication failed');
  tokenCache = { accessToken: data.access_token, instanceUrl: data.instance_url, expiresAt: now + 90 * 60_000 };
  return tokenCache;
}

export async function syncOrderToSalesforce(order) {
  if (!isSalesforceConfigured()) return { synced: false, reason: 'Salesforce is not configured' };
  const { accessToken, instanceUrl } = await getAccessToken();
  const apiVersion = process.env.SALESFORCE_API_VERSION || 'v61.0';
  const objectName = process.env.SALESFORCE_ORDER_OBJECT || 'Commerce_Order__c';
  const payload = {
    Name: order.orderNumber,
    Customer_Email__c: order.customer.email,
    Total__c: order.total,
    Order_Data__c: JSON.stringify({ customer: order.customer, items: order.items.map(({ name, quantity, unitPrice }) => ({ name, quantity, unitPrice })), subtotal: order.subtotal, shipping: order.shipping, total: order.total, currency: order.currency }),
  };
  // Custom object fields must be created in the target Salesforce org.
  const response = await fetch(`${instanceUrl}/services/data/${apiVersion}/sobjects/${encodeURIComponent(objectName)}`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.[0]?.message || result.message || 'Salesforce order sync failed');
  return { synced: true, recordId: result.id };
}
