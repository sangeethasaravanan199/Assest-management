# Electronic Asset Management System

Complete electronic asset lifecycle management system for laptops, desktops, monitors, printers, and network devices.

## Stack

- Frontend: React + Vite + React Router + Axios + Recharts
- Backend: Node.js + Express + Zod + JWT authentication
- Database: PostgreSQL

## Features

- Authentication with role-based access (`admin`, `employee`)
- Asset lifecycle management:
  - Add assets
  - Update assets
  - Assign assets
  - Return assets
  - Retire assets
- Maintenance tracking:
  - Create maintenance requests
  - Admin status updates (`open`, `in_progress`, `resolved`)
  - Automatic maintenance lifecycle status handling
- Business analytics dashboard:
  - KPIs
  - Asset distribution charts by type and status
  - Maintenance analytics
- Form validation on frontend and backend
- Modular project structure with meaningful sample data

## Project Structure

- `backend/` REST API and PostgreSQL scripts
- `frontend/` React web application

## Setup

1. Create PostgreSQL database:
   - `createdb asset_management`
2. Backend configuration:
   - Copy `backend/.env.example` to `backend/.env`
   - Update `DATABASE_URL` and `JWT_SECRET`
3. Initialize schema and seed:
   - `cd backend`
   - `npm install`
   - `npm run db:init`
   - `npm run db:seed`
4. Frontend configuration:
   - Copy `frontend/.env.example` to `frontend/.env`
   - `cd ../frontend`
   - `npm install`
5. Start services:
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`

## Sample Credentials

- Admin: `admin@assets.local` / `Admin@123`
- Employee: `arun.kumar@assets.local` / `Employee@123`

## Core API Endpoints

- `POST /api/auth/login`
- `GET /api/assets`
- `POST /api/assets` (admin)
- `PUT /api/assets/:id` (admin)
- `POST /api/assets/:id/assign` (admin)
- `POST /api/assets/:id/return` (admin)
- `POST /api/assets/:id/retire` (admin)
- `GET /api/maintenance`
- `POST /api/maintenance`
- `PATCH /api/maintenance/:id` (admin)
- `GET /api/analytics/summary` (admin)
