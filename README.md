# Earthy Electronics

Earthy Electronics is a modern, full-stack e-commerce web application with a comprehensive customer portal and a robust admin dashboard. Built with React (Vite) and Node.js (Express), it features an AI-powered assistant, real-time analytics, and secure JWT-based authentication.

## Features

### 🛍️ Customer Portal
- **Dynamic Catalog:** Browse premium home appliances (Air Conditioners, LED TVs, Refrigerators, etc.).
- **Smart Filtering:** Filter by brand, category, and price.
- **Cart & Checkout:** Secure, responsive cart with WhatsApp-integrated or on-site checkout flows.
- **AI Chatbot:** Intelligent floating assistant (powered by Gemini) to guide customers.

### 🛡️ Admin Portal
- **Secure Authentication:** Role-based access control protecting all admin routes.
- **Live Analytics:** Real-time dashboards visualizing revenue, orders, and site traffic.
- **Inventory Management:** Full CRUD operations for products, including instant stock updates and image handling.
- **Admin AI Agent:** Specialized AI assistant embedded in the dashboard for automated insights.

## Tech Stack
- **Frontend:** React, Vite, React Router, Recharts, Lucide-React.
- **Backend:** Node.js, Express, SQLite (for lightweight, robust data storage).
- **Security:** bcrypt (hashing), jsonwebtoken (JWT sessions).
- **AI Integration:** Google Generative AI (Gemini).

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/raoraza12/bismillah-electronics.git
   cd bismillah-electronics
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   ```
   *Create a `.env` file based on `.env.example`:*
   ```env
   PORT=5000
   JWT_SECRET=your_super_secret_jwt_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
   *Start the backend server:*
   ```bash
   npm run dev
   # or
   node server.js
   ```

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```
   *Create a `.env.local` file based on `.env.example`:*
   ```env
   VITE_API_BASE=http://localhost:5000
   ```
   *Start the frontend development server:*
   ```bash
   npm run dev
   ```

## Security & Best Practices
- **Databases (`*.db`, `*.sqlite`) are ignored** to prevent user data or hashes from leaking.
- **Environment variables are ignored**; never commit real API keys or JWT secrets.

---
*Developed with focus on beautiful UI, fluid animations, and robust backend architecture.*
