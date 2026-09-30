# Meridian Commerce

A responsive MERN storefront with product browsing, search and category filters, a persistent shopping bag, server-priced checkout, MongoDB orders, and Salesforce order sync.

## Run locally

Requirements: Node.js 20+ and npm. MongoDB is optional for a local preview; the app uses a sample catalog and temporary in-memory orders when MongoDB is unavailable.

```powershell
npm install
npm --prefix server install
npm --prefix client install
Copy-Item server/.env.example server/.env
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:4000. Set `MONGODB_URI` in `server/.env` to a MongoDB connection string to persist the catalog and orders. The first connection seeds an empty product collection with the sample products. Restarting without MongoDB clears preview orders.

## Deploy on Render

The root `render.yaml` defines a free Render web service that builds the React client and serves it with the Express API. It expects the `MONGODB_URI` and Salesforce client credentials to be entered as secrets in the Render dashboard. Do not commit either `.env` file or paste its values into source control.

To deploy, push this project to a GitHub repository, connect that repository in Render, and create a Blueprint from `render.yaml`. Enter the Atlas connection URI for the `E-com` cluster and the Salesforce client ID and secret when Render requests the unset variables. After deployment is healthy, Render shows its public `onrender.com` URL. Free web services spin down after 15 minutes without traffic, so the first visit after idle may take longer.

## Salesforce connection

The API uses Salesforce OAuth 2.0 client credentials and Salesforce REST API. The sample configuration is prefilled with your org domain, `https://orgfarm-2c5273232c-dev-ed.develop.lightning.force.com`. In Salesforce, create a Connected App / External Client App that enables the client credentials flow, assign it a dedicated integration user, and grant that user API access and create access on your order object. Use a sandbox login URL (`https://test.salesforce.com`) if you switch to a different sandbox org.

1. Create a custom object, `Commerce_Order__c` by default. Give its record name a text type, or remove the `Name` property from the payload in `server/src/services/salesforce.js` if Salesforce generates the name automatically.
2. Add these fields (types in parentheses): `Customer_Email__c` (Email), `Total__c` (Currency), and `Order_Data__c` (Long Text Area, at least 32,768 characters). `Order_Data__c` stores the customer name and address, item summary, subtotal, shipping, total, and currency as JSON. The Salesforce org's default currency should be USD to match the storefront. The Salesforce `Name` field is used for the order number.
3. Set the integration user's permission set to allow creating records on this object and writing to these fields.
4. Put the Connected App consumer key and secret in `SALESFORCE_CLIENT_ID` and `SALESFORCE_CLIENT_SECRET` in `server/.env`; set `SALESFORCE_LOGIN_URL`, `SALESFORCE_API_VERSION`, and `SALESFORCE_ORDER_OBJECT` if needed.
5. Restart the API. `/api/health` reports whether the Salesforce credentials are configured. Completed orders are sent to Salesforce; if Salesforce is unavailable or rejects a sync, the order is still saved and the checkout response includes the sync status.

Never commit `.env` or expose Salesforce secrets in the browser. Rotate any secret that has been shared outside the server environment.

## API

- `GET /api/health` — database and Salesforce configuration status
- `GET /api/products?category=Objects&search=vase` — active products (filters optional)
- `POST /api/orders` — validates the customer and item quantities, recalculates prices from the catalog, saves the order, then attempts Salesforce sync

The included checkout is a development order flow and does not collect payment. Add a payment provider and its server-side webhook before accepting real purchases. The sample storefront uses remote Unsplash images and Google Fonts.
