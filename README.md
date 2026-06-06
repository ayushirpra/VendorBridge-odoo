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
- **Approval Workflow**: 2-level approval chain (Procurement Head → Finance Approver)
  - Auto-creates approval chain when quotation is selected
  - Level 1: Procurement Head (manager role)
  - Level 2: Finance Approver (manager role)
  - Rejection at any level stops the workflow
  - All approvals required before PO creation
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
- `PATCH /api/quotations/:id/submit` - Submit quotation
- `PATCH /api/quotations/:id/select` - Select quotation (triggers approval workflow)

### Approvals (Protected)
- `GET /api/approvals` - List approvals (filtered by role)
- `GET /api/approvals/:id` - Get approval detail with quotation summary
- `PATCH /api/approvals/:id/action` - Approve or reject an approval level

### Purchase Orders (Protected)
- `GET /api/purchase-orders` - Get all purchase orders
- `GET /api/purchase-orders/:id` - Get single PO
- `POST /api/purchase-orders` - Create PO
- `PUT /api/purchase-orders/:id` - Update PO

### Purchase Orders (Protected)
- `POST /api/purchase-orders` - Create PO from approved quotation
- `GET /api/purchase-orders` - List all POs (filterable)
- `GET /api/purchase-orders/:id` - Get PO detail with line items
- `PATCH /api/purchase-orders/:id/status` - Update PO status
- `GET /api/purchase-orders/:id/invoice` - Generate invoice data
- `POST /api/purchase-orders/:id/send-invoice` - Send invoice to vendor

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

## Approval Workflow

The system includes a complete full-stack 2-level approval workflow:

### Backend API

#### Workflow Steps

1. **Quotation Selection**: Procurement officer selects a quotation using `PATCH /api/quotations/:id/select`
2. **Approval Chain Creation**: System automatically creates 2 approval records:
   - Level 1: Procurement Head (first manager)
   - Level 2: Finance Approver (second manager)
3. **Level 1 Approval**: Procurement Head reviews and approves/rejects
4. **Level 2 Approval**: If Level 1 approved, Finance Approver reviews
5. **Completion**: If all levels approved, quotation is ready for PO creation

#### Approval Actions

**Approval**: 
- Marks level as approved
- Activates next level if exists
- If all levels complete, quotation ready for PO

**Rejection**: 
- Marks level as rejected
- Updates quotation status to rejected
- Auto-rejects all remaining levels
- Stops workflow

#### Access Control

- **Managers**: Can only action approvals assigned to them
- **Procurement Officers**: Can view approvals for their RFQs
- **Admins**: Can view and action any approval

#### API Usage

```bash
# List pending approvals (as manager)
GET /api/approvals?status=pending

# Get approval detail with quotation summary
GET /api/approvals/1

# Approve a level
PATCH /api/approvals/1/action
{
  "action": "approved",
  "remarks": "Pricing meets requirements"
}

# Reject a level
PATCH /api/approvals/1/action
{
  "action": "rejected",
  "remarks": "Exceeds budget"
}
```

### Frontend UI

#### Pages

**Approvals List** (`/approvals`):
- Stats dashboard showing total, pending, approved, and rejected counts
- Filter tabs for quick status filtering
- Card-based approval list with status badges
- View button to see approval details
- Role-based content display

**Approval Detail** (`/approvals/:id`):
- Approval information with approver details and timestamps
- Complete quotation summary with vendor info and line items
- Financial breakdown (subtotal, GST, grand total)
- Visual approval chain timeline in sidebar
- Action buttons (Approve/Reject) for authorized users
- Action modal with remarks input and validation

#### Features

- ✅ Clean, modern UI matching existing design
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Loading skeletons and empty states
- ✅ Role-based access control
- ✅ Real-time updates with React Query
- ✅ Form validation and error handling
- ✅ Optimistic UI updates

### Documentation

For detailed documentation, see:
- **Backend**: [APPROVAL_WORKFLOW.md](backend/APPROVAL_WORKFLOW.md)
- **Frontend**: [FRONTEND_APPROVALS_GUIDE.md](FRONTEND_APPROVALS_GUIDE.md)
- **Full-Stack**: [FULLSTACK_APPROVAL_COMPLETE.md](FULLSTACK_APPROVAL_COMPLETE.md)
- **Quick Start**: [QUICK_START_APPROVALS.md](QUICK_START_APPROVALS.md)

### Test Users

**Password for all users: `password123`**

- **Procurement Officer**: sarah.procurement@vendorbridge.com
- **Procurement Head (Level 1)**: mike.manager@vendorbridge.com
- **Finance Approver (Level 2)**: linda.finance@vendorbridge.com

