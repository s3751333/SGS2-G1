# BookNook - Online Book & Community Platform

**Course:** COSC3060 - Web Programming Studio  
**Group:** SGS2-G1  

---

## Project Overview
**BookNook** is an integrated web application designed for book lovers, readers, and literary enthusiasts. It solves the issue of fragmented digital spaces by unifying content discovery, book shopping, user reviews, community discussion forums, and article publishing into a single, cohesive web platform.

---

## Team Members & Responsibilities

| Student Name | Student ID | Responsibilities & Assigned Modules |
| :--- | :--- | :--- |
| **Mark Molnar** | `s4051620` | Blog Platform, Shared User Access (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/blogs`, `/blog-create`, `/blog-articles/`, `/sitemap`) |
| **Tấn Tài Phạm** | `s3751333` | Discussion Forum & Admin Panel (`/forum-main`, `/forum-topic`, `/forum-new-topic`, `/admin-users`) |
| **Ayden Le** | `s4123086` | Shopping Cart, Checkout, Landing Page & Navigation (`/`, `/cart`, `/checkout`) |
| **Khoa Pham Dang Nguyen** | `s4132855` | Product Reviews, Wishlist & User Profile (`/products`, `/product-detail`, `/profile`, `/wishlist`) |

---

## File & Folder Responsibilities

### Mark Molnar - s4051620

- `routes/authRoutes.js`, `routes/blogRoutes.js`, `routes/sitemapRoutes.js`
- `repositories/userRepository.js`, `repositories/blogRepository.js`
- `services/sessionService.js`, `services/passwordResetService.js`, `services/sitemapService.js`
- `views/login.ejs`, `views/register.ejs`, `views/forgot-password.ejs`, `views/reset-password.ejs`
- `views/blogs.ejs`, `views/blog-create.ejs`, `views/sitemap.ejs`
- `views/blog-articles/`
- `public/js/login.js`, `public/js/register.js`, `public/js/forgot-password.js`, `public/js/reset-password.js`
- `public/js/blogs.js`, `public/js/blog-create.js`, `public/js/comments.js`, `public/js/article-actions.js`
- `public/css/loginRegister.css`, `public/css/blogs.css`, `public/css/blog.css`, `public/css/blog-create.css`, `public/css/sitemap.css`

### Tấn Tài Phạm - s3751333

- `routes/adminRoutes.js`, `routes/forumRoutes.js`
- `repositories/forumRepository.js`
- `views/forum-main.ejs`, `views/forum-new-topic.ejs`, `views/forum-topic.ejs`, `views/forum-edit-reply.ejs`
- `views/admin-users.ejs`
- `public/js/forum-delete.js`, `public/js/forum-form.js`, `public/js/forum-list.js`, `public/js/forum-reply.js`
- `public/js/user-list.js`
- `public/css/forum.css`, `public/css/user-list.css`

### Ayden Le - s4123086

- `routes/cartRoutes.js`, `routes/pageRoutes.js`
- `services/cartService.js`, `services/orderService.js`
- `repositories/cartRepository.js`, `repositories/orderRepository.js`, `repositories/productRepository.js`
- `database/seedProducts.js`
- `views/index.ejs`, `views/cart.ejs`, `views/checkout.ejs`, `views/orders.ejs`
- `views/partials/navbar.ejs`
- `public/js/home.js`, `public/js/navbar.js`, `public/js/store.js`, `public/js/cart.js`, `public/js/checkout.js`, `public/js/orders.js`
- `public/css/home.css`, `public/css/navbar.css`, `public/css/cart.css`, `public/css/checkout.css`

### Khoa Pham Dang Nguyen - s4132855

- `routes/productRoutes.js`, `routes/profileRoutes.js`
- `views/products.ejs`, `views/product-detail.ejs`, `views/wishlist.ejs`, `views/profile.ejs`
- `public/js/products.js`, `public/js/product-detail.js`, `public/js/wishlist.js`, `public/js/profile.js`
- `public/css/products.css`, `public/css/product-detail.css`, `public/css/wishlist.css`, `public/css/profile.css`

### Shared Integration Files

- `app.js` - Express configuration, middleware, and router integration
- `index.js` - database connection and server startup/shutdown
- `data.js` - database seed samples and remaining prototype module data
- `package.json`, `package-lock.json` - project configuration and dependencies
- `views/partials/footer.ejs` - shared footer
- `public/css/default.css`, `public/css/components.css` - shared styles
- `public/img/` - shared images and product covers

---

## Repository & Project Structure

```text
SGS2-G1/
├── database/               # MongoDB connection, indexes, and seed script
├── middleware/             # Authentication and access-control middleware
├── repositories/           # Database operations grouped by collection
├── routes/                 # Express routers grouped by application module
├── services/               # Session and password-reset business logic
├── utils/                  # Reusable security helpers
├── public/                 # Static files served by Express
│   ├── css/                # Stylesheets
│   ├── img/                # Images and book covers
│   └── js/                 # Browser-side JavaScript
├── views/                  # EJS page templates
│   ├── blog-articles/      # Individual blog article templates
│   ├── partials/           # Shared navbar and footer templates
│   └── *.ejs               # Main application pages
├── data.js                 # In-memory sample data
├── app.js                  # Express application setup and router integration
├── index.js                # Database connection and server entry point
├── package.json            # Project scripts and dependencies
└── README.md               # Project documentation and guidelines
```

## Requirements and Installation

Before running the application, install:

- [Node.js](https://nodejs.org/) version 20.19 or newer (Node 22 recommended)
- npm, which is included with Node.js

No separate local database installation is required. Assessment 3 uses MongoDB
Atlas for user accounts, sessions, password resets, blog posts, and blog
comments, forum topics, forum replies, products, carts, and orders, so these records remain available after the Node.js process restarts.
Reviews and wishlist entries still use their existing sample data. Moving a
wishlist item into the cart writes to MongoDB.

After downloading or extracting the repository, open a terminal in the
`SGS2-G1` project folder and install the dependencies:

```bash
npm install
```

This installs Express, EJS, dotenv, and the official MongoDB Node.js driver from
`package.json`. Do not install these packages manually unless `npm install`
reports an error.

To run immediately without an Atlas account or `.env`, use:

```bash
npm run dev:local
```

Open `http://localhost:3000`. This development command downloads a local MongoDB
binary if needed, starts a single-node replica set, creates indexes, and seeds
the sample accounts/content. Data is saved in `.local/mongodb` between restarts.
It binds to localhost and does not connect to Atlas. Stop with Ctrl+C before
starting another local instance. Development dependencies include a project-local
Node 22 runtime, used automatically by npm scripts on this machine.

For Atlas, follow the `.env` setup below instead.

Create the local environment file from the supplied example:

```bash
cp .env.example .env
```

Open `.env` and replace `MONGODB_URI` with the connection string supplied by
MongoDB Atlas. Keep `MONGODB_DB_NAME=booknook` unless the team has agreed on a
different database name. The application will show a clear startup error if a
required database setting is missing.

Never commit `.env` because it contains the private database username and
password. Only `.env.example`, which contains placeholders, belongs in Git.

Create the database indexes and insert the development test users once:

```bash
npm run db:seed
```

The seed is safe to run again. Existing users and posts are kept, and only missing
sample records are inserted. For an existing database whose accounts and blogs are
already seeded, run `npm run db:seed -- --forum` to seed only forum samples. Usernames and email addresses have case-insensitive
unique indexes in MongoDB.

Run `npm run db:seed -- --shop` to insert only missing product samples and create
indexes. Re-seeding does not overwrite prices, stock, existing carts, or orders.

## Running the Application

Start the application directly with Node.js:

```bash
node index.js
```

Alternatively, use the equivalent npm command:

```bash
npm start
```

The `start` script in `package.json` runs `node index.js`, so both commands start
the same application.

Authentication, sessions, and password-reset tokens are stored in MongoDB.
Session and reset tokens are hashed before storage and automatically expire
through MongoDB TTL indexes. This allows valid login sessions to survive a
Node.js server restart without storing raw tokens in the database.

When the terminal displays the server message, open `http://localhost:3000` in a
browser. Express routes use clean URLs such as
`/blogs`, `/login`, and `/products`; the corresponding templates are stored as
`.ejs` files inside the `views` folder.

```bash
npm run dev
```

Press `Ctrl+C` in the terminal to stop the application. If port 3000 is already
in use, stop the other Node.js process before starting BookNook again.

### Cart and Order API

These endpoints require the `sessionId` cookie created by `POST /login`.
Product prices, stock checks, and checkout totals are handled by the server.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET`, `DELETE` | `/api/cart` | Retrieve or clear the signed-in user's cart |
| `POST` | `/api/cart/items` | Add a product to the signed-in user's cart |
| `PATCH`, `DELETE` | `/api/cart/items/:productId` | Update or remove a cart item |
| `GET`, `POST` | `/api/orders` | Retrieve owned orders or check out the current cart |
| `GET`, `PATCH`, `DELETE` | `/api/orders/:orderId` | Retrieve, update, or cancel an owned order |

Carts, orders, product prices/stock, and login sessions are stored in MongoDB.
Checkout uses a transaction to deduct stock, insert an order with a price snapshot,
and clear the cart. Cancellation restores stock and soft-deletes the order in a
transaction. MongoDB Atlas or a replica set is required for these transactions.
Orders can be viewed, edited, and cancelled at `/orders` (My Orders in navigation).
The home page, product pages, wishlist display, and checkout use the same product
collection. COD and bank transfer record a pending payment; there is no payment
gateway or email delivery integration. The bank-transfer option is explicitly a demo.

Clients can send an `Idempotency-Key` header (8–128 letters, digits, `_` or `-`)
when checking out. Reusing it returns the original order without charging stock
again. The checkout UI reuses its key when retrying a failed network request.

Run the integration tests against an isolated local MongoDB replica set:

```bash
npm test
npm run test:browser
```

Browser tests use Microsoft Edge when installed at its default Windows location.
On other machines, run `npx playwright install chromium` first. Tests do not use
`.env`, Atlas, or `.local/mongodb`. Browser screenshots are written to `output/`.

### Dynamic Sitemap

Open `http://localhost:3000/sitemap` to view the generated website overview.
The sitemap router loads current blog posts from MongoDB and receives the
product list and non-deleted forum topics from MongoDB. Public
content therefore appears without manually adding links to `sitemap.ejs`.
Administrator links are shown only to a signed-in administrator.

### Test Accounts

Use the email address and the account's own password to log in. Security answers
are case-insensitive and are used only for the password reset prototype.

| Account | Email | Password | Security answers (animal / book / colour) | Role | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BookNook Admin | `admin@booknook.test` | `Admin123!` | `dog` / `the hobbit` / `blue` | Administrator | Active |
| Linh Nguyen | `linh@booknook.test` | `Linh123!` | `cat` / `the little prince` / `green` | Member | Active |
| Alex Pham | `alex@booknook.test` | `Alex123!` | `panda` / `dune` / `red` | Member | Locked |
| Mai Hoang | `mai@booknook.test` | `Mai12345!` | `rabbit` / `norwegian wood` / `purple` | Member | Active |

Passwords and security answers are stored in MongoDB only as salted `scrypt`
hashes. Plain-text values are listed above solely as development test
credentials.
