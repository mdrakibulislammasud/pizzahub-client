# PizzaHub — Pizza Ordering & Delivery Platform

PizzaHub is a full-stack, role-based pizza ordering and delivery platform. Customers can discover menu items and place orders, vendors can manage their restaurants and menus, and admins can manage users, menu items, and transactions.

## Live Application

- **Frontend:** https://pizzahub-client-zeta.vercel.app/
- **Backend API:** https://pizzahub-server-git-main-diligent3.vercel.app/

## GitHub Repositories

- **Client:** https://github.com/mdrakibulislammasud/pizzahub-client
- **Server:** https://github.com/mdrakibulislammasud/pizzahub-server

## Main Features

- Responsive homepage and public menu browsing.
- Menu search, category and location filtering, and price sorting where supported by the API.
- Better Auth email/password authentication and Google OAuth configuration.
- Role-based experiences for Customers, Vendors, and Admins.
- Vendor menu management and admin approval workflow.
- Customer ordering and order status management.
- Customer, Vendor, and Admin dashboards.
- Vendor Free and Premium subscription plans.
- Stripe Checkout for vendor Premium subscriptions.
- Image hosting through ImgBB for menu item uploads.
- Protected application routes and API integration.

## Technology Stack

- Next.js 16 (App Router)
- React 19 and TypeScript
- Tailwind CSS 4
- Motion
- Recharts
- Better Auth
- Axios
- Radix UI primitives
- Lucide React
- Sonner

## Requirements

- Node.js 20.9 or later
- npm
- Running PizzaHub backend
- MongoDB connection configured on the backend

## Installation and Local Setup

### 1. Clone the client repository

```bash
git clone https://github.com/mdrakibulislammasud/pizzahub-client.git
cd pizzahub-client
npm install
```

### 2. Configure environment variables

Create `.env.local` in the client root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_APP_URL` | Frontend application URL |

Use the actual deployed URLs in production. Never put private credentials in `NEXT_PUBLIC_` variables.

### 3. Start the development server

```bash
npm run dev
```

Open http://localhost:3000.

### 4. Production build

```bash
npm run build
npm run start
```

### 5. Lint

```bash
npm run lint
```

## Backend Setup

The backend is maintained in a separate repository:

https://github.com/mdrakibulislammasud/pizzahub-server

Follow the server README for backend installation, environment variables, database configuration, and startup instructions.

## Security Notes

- Never commit `.env`, `.env.local`, API keys, OAuth secrets, or Stripe secrets.
- Keep private credentials on the server.
- Configure production environment variables in the hosting provider.
- Do not expose admin credentials in this repository.

## Assignment Challenge Notes

- **Advanced search and sorting:** Menu search, filtering, and price sorting are connected to the backend menu API query functionality. See the server menu service and controller for supported query parameters.
- **JWT verification:** Authentication token verification and role authorization are handled by the backend. See `pizzahub-server/src/middleware/verifyToken.ts` and the role authorization middleware.
- **Responsive UI:** The application includes responsive layouts for mobile, tablet, and desktop screens.

## Submission Information

- Live website: https://pizzahub-client-zeta.vercel.app/
- Client repository: https://github.com/mdrakibulislammasud/pizzahub-client
- Server repository: https://github.com/mdrakibulislammasud/pizzahub-server

Admin credentials must be shared separately through the private submission channel. Never publish an admin password in this README.