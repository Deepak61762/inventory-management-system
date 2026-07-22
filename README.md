# Inventory Management System

Full stack app: HTML/CSS/JS frontend + Node/Express backend + MySQL + JWT auth.

## Setup

1. **Database**: Open MySQL Workbench, run everything in `schema.sql`. This creates
   the `inventory_db` database, all 5 tables, and inserts some sample data.

2. **Environment variables**: Copy `.env.example` to a new file named `.env`,
   and fill in your real MySQL password and a random JWT secret string.

3. **Install dependencies**:
   ```
   npm install
   ```

4. **Run the server**:
   ```
   node server.js
   ```
   or, if you installed nodemon (auto-restarts on file changes):
   ```
   npx nodemon server.js
   ```

5. **Open the app**: go to `http://localhost:5000/register.html`, create an
   ADMIN account, log in, and you'll land on the dashboard.

## File-by-file guide (read in this order to understand the flow)

1. `schema.sql` - the 5 database tables and how they relate (products belong to
   categories/suppliers, stock_transactions is a history log)
2. `server.js` - the entry point. Wires together middleware and all route groups.
3. `db/connection.js` - the MySQL connection pool every controller uses to run queries
4. `middleware/authMiddleware.js` - `verifyToken` checks the JWT on protected routes;
   `requireAdmin` additionally checks the user's role
5. `controllers/authController.js` + `routes/authRoutes.js` - register/login,
   password hashing with bcrypt, and issuing JWTs
6. `controllers/productController.js` + `routes/productRoutes.js` - product CRUD.
   Notice GET routes only need `verifyToken`, but POST/PUT/DELETE also need `requireAdmin`
7. `controllers/stockController.js` + `routes/stockRoutes.js` - the most complex piece.
   `recordTransaction` updates a product's quantity AND logs the change in one
   atomic DB transaction (so the numbers can never drift out of sync)
8. `controllers/categoryController.js`, `controllers/supplierController.js` -
   simpler CRUD, same pattern as products
9. `public/` - the frontend. `login.html`/`register.html` handle auth,
   `index.html` is the dashboard. `js/api.js` is a shared helper that attaches
   the JWT to every request. `js/products.js` has all the dashboard logic.

## Things worth understanding deeply (ask me about any of these)

- **Why `FOR UPDATE`** in `stockController.js` (row locking to prevent race conditions)
- **How JWT actually works** - what's inside the token, why we can trust it,
  what happens if someone tampers with it
- **Why passwords are hashed with bcrypt** instead of encrypted or stored plain
- **Why `role_id` checks happen in middleware** instead of inside each controller
- **How `localStorage` + `Authorization: Bearer` header** work together to keep
  a user "logged in" across page reloads

## Known gaps / good next features to add yourself

- No "edit product" form on the frontend yet (backend route already exists: `PUT /api/products/:id`)
- No stock transaction history view in the UI (backend route exists: `GET /api/stock/history/:productId`)
- No input validation on the frontend forms (currently only backend validates)
- No pagination on the products table (fine for small inventories, would matter at scale)
