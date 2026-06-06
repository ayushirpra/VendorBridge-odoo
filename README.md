# VendorBridge

A full-stack vendor management system built with React and Node.js.

## Tech Stack

### Frontend
- React 19 with Vite
- React Router v6
- Tailwind CSS
- Axios
- TanStack React Query
- Recharts

### Backend
- Node.js with Express.js
- PostgreSQL with node-postgres (pg)
- JWT Authentication
- bcrypt for password hashing
- CORS enabled

## Project Structure

```
vendorbridge/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React Context (Auth)
│   │   ├── lib/          # Utilities (axios, queryClient)
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   └── package.json
│
└── backend/           # Express backend API
    ├── config/        # Database configuration
    ├── routes/        # API routes
    ├── middleware/    # Custom middleware
    ├── db/            # Database migrations
    │   └── migrations/
    ├── server.js      # Server entry point
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb vendorbridge
```

2. Run the migration scripts:
```bash
# Schema migration
psql -d vendorbridge -f backend/db/migrations/001_initial_schema.sql

# Seed data (optional, for testing)
psql -d vendorbridge -f backend/db/migrations/002_seed_data.sql
```

Or use the migration helper script:
```bash
cd backend/db
chmod +x migrate.sh
./migrate.sh
```

**Database Tables Created:**
- `users` - System users with role-based access
- `vendors` - Vendor companies with GST and contact details
- `rfqs` - Request for Quotations
- `rfq_line_items` - Items in each RFQ
- `rfq_vendors` - RFQ-Vendor assignments
- `quotations` - Vendor quotes for RFQs
- `quotation_line_items` - Detailed pricing in quotations
- `approvals` - Multi-level approval workflow
- `purchase_orders` - Final procurement orders
- `activity_logs` - Immutable audit trail (write-only)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials:
```
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/vendorbridge
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. The `.env` should contain:
```
VITE_API_URL=http://localhost:5000/api
```

5. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Features

- **Authentication**: JWT-based authentication with role-based access (admin, procurement_officer, vendor, manager)
- **Vendor Management**: Complete vendor lifecycle with status tracking (active, pending, blocked)
- **RFQ Management**: Create and manage Request for Quotations with line items
- **Quotation System**: Vendors can submit detailed quotations with pricing
- **Approval Workflow**: Multi-level approval system for quotations
- **Purchase Orders**: Generate POs with tax calculations (CGST, SGST)
- **Activity Logs**: Complete audit trail of all system actions (immutable)
- **Dashboard**: Overview with statistics and charts
- **Protected Routes**: Secure pages requiring authentication
- **Responsive Design**: Mobile-friendly interface

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Vendors (Protected)
- `GET /api/vendors` - Get all vendors
- `GET /api/vendors/:id` - Get single vendor
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor

### Health
- `GET /health` - Server health check
- `GET /api/db-test` - Database connection test

### RFQs (Protected)
- `GET /api/rfqs` - Get all RFQs
- `GET /api/rfqs/:id` - Get single RFQ with line items
- `POST /api/rfqs` - Create RFQ
- `PUT /api/rfqs/:id` - Update RFQ
- `DELETE /api/rfqs/:id` - Delete RFQ

### Quotations (Protected)
- `GET /api/quotations` - Get all quotations
- `GET /api/quotations/:id` - Get single quotation
- `POST /api/quotations` - Create quotation
- `PUT /api/quotations/:id` - Update quotation
- `PUT /api/quotations/:id/submit` - Submit quotation

### Purchase Orders (Protected)
- `GET /api/purchase-orders` - Get all purchase orders
- `GET /api/purchase-orders/:id` - Get single PO
- `POST /api/purchase-orders` - Create PO
- `PUT /api/purchase-orders/:id` - Update PO

### Activity Logs (Protected)
- `GET /api/activity-logs` - Get activity logs (read-only)

## Color Theme

- Background: `#f8fafc`
- Primary (Green): `#16a34a`
- Text: `#1e293b`
- White cards with `shadow-sm`

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development
```bash
cd frontend
npm run dev  # Hot module replacement enabled
```

### Build for Production

Frontend:
```bash
cd frontend
npm run build
```

## License

MIT
