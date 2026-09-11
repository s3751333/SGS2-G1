# BookNook - Online Book & Community Platform

**Course:** COSC3060 - Web Programming Studio  
**Group:** SGS2-G1  

---

## Project Overview
**BookNook** is an integrated web application designed for book lovers, readers, and literary enthusiasts. It solves the issue of fragmented digital spaces by unifying content discovery, book shopping, user reviews, community discussion forums, and article publishing into a single, cohesive web platform.

## Submission Links

- **Live website:** [https://demo.3aa.uk](https://demo.3aa.uk)
- **GitHub repository:** [https://github.com/s3751333/SGS2-G1](https://github.com/s3751333/SGS2-G1)

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
- `repositories/reviewRepository.js`, `repositories/wishlistRepository.js`
- `middleware/profileImageUpload.js`, `middleware/reviewImageUpload.js`
- `views/products.ejs`, `views/product-detail.ejs`, `views/wishlist.ejs`, `views/profile.ejs`
- `views/review-edit.ejs`, `views/reviews-list.ejs`, `views/review-detail.ejs`
- `public/js/products.js`, `public/js/product-detail.js`, `public/js/wishlist.js`, `public/js/profile.js`
- `public/css/products.css`, `public/css/product-detail.css`, `public/css/wishlist.css`, `public/css/profile.css`

### Shared Integration Files

- `app.js` - Express configuration, middleware, and router integration
- `index.js` - database connection and server startup/shutdown
- `data.js` - development sample records used by the database seed script
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
├── data.js                 # Development database seed data
├── app.js                  # Express application setup and router integration
├── index.js                # Database connection and server entry point
├── package.json            # Project scripts and dependencies
└── README.md               # Project documentation and guidelines
```

## Requirements and Installation

Before running the application, install:

- [Node.js](https://nodejs.org/) version 20.19 or newer (Node 22 recommended)
- npm, which is included with Node.js

Assessment 3 uses MongoDB Atlas for user accounts, sessions, password resets,
blog posts and comments, forum topics and replies, products, carts, orders,
reviews, and wishlist entries. These records remain available after the
Node.js process restarts. Moving a wishlist item into the cart writes to
MongoDB.

After downloading or extracting the repository, open a terminal in the
`SGS2-G1` project folder and install the dependencies:

```bash
npm install
```

This installs Express, EJS, dotenv, and the official MongoDB Node.js driver from
`package.json`. Do not install these packages manually unless `npm install`
reports an error.

Create the local environment file from the supplied example:

```bash
cp .env.example .env
```

Open `.env` and replace the placeholders in `MONGODB_URI` with the connection
string supplied by the team or MongoDB Atlas. Keep
`MONGODB_DB_NAME=booknook` unless the team has agreed on a different database
name. The application shows a clear startup error if a required setting is
missing or the database cannot be reached. In MongoDB Atlas, the database user
must have read and write access, and the server's IP address must be allowed in
Network Access.

If `npm run db:seed` or `npm start` fails with an error like
`querySrv ECONNREFUSED _mongodb._tcp.<cluster>`, this is usually not a
problem with the connection string itself: run `nslookup -type=SRV
_mongodb._tcp.<your-cluster-host>` in a terminal to check whether the same
lookup succeeds outside of Node.js. If it does, Node's own DNS resolver is
the likely cause rather than your network or firewall; `database/connection.js`
already works around this by pointing Node's resolver at `8.8.8.8` and
`8.8.4.4` before connecting.

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

### Dynamic Sitemap

Open `http://localhost:3000/sitemap` to view the generated website overview.
The sitemap router loads current blog posts from MongoDB and receives the
product list and non-deleted forum topics from MongoDB. Public
content therefore appears without manually adding links to `sitemap.ejs`.
Administrator links are shown only to a signed-in administrator.

### Mark Molnar Module Endpoints

| Feature | User | URL / Endpoint | MongoDB data | Status |
| :--- | :--- | :--- | :--- | :--- |
| Register account | Public visitor | `GET /register`, `POST /register` | Creates a `users` document with salted password and security-answer hashes | Completed |
| Login and logout | Registered user | `POST /login`, `POST /logout`, `GET /session` | Creates, reads, and deletes expiring `sessions` documents | Completed |
| Reset forgotten password | Registered user | `POST /forgot-password`, `GET` and `POST /reset-password` | Creates and consumes an expiring `passwordResetTokens` document, then updates the user's password hash | Completed |
| List and search blog posts | Public visitor | `GET /blogs`, `GET /blogs-data` | Retrieves non-deleted `blogPosts` and related `blogComments` and `users` data | Completed |
| View a blog post | Public visitor | `GET /blog-articles/blog:id` | Retrieves one post, its author, and its non-deleted comments | Completed |
| Create a blog post | Signed-in user | `GET` and `POST /blog-create` | Creates a `blogPosts` document and stores the uploaded image URL | Completed |
| Edit a blog post | Post owner | `GET` and `POST /blog-articles/blog:id/edit` | Updates the owner's `blogPosts` document | Completed |
| Delete a blog post | Post owner | `POST /blog-articles/blog:id/delete` | Soft-deletes the owner's post so it no longer appears publicly | Completed |
| Add a blog comment | Signed-in user | `POST /blog-articles/blog:id/comments` | Creates a `blogComments` document related to the user and post | Completed |
| Dynamic sitemap | Public visitor or administrator | `GET /sitemap` | Retrieves current products, blog posts, and forum topics; adds administration links only for administrators | Completed |

### Khoa Pham Dang Nguyen Module Endpoints

| Feature | User | URL / Endpoint | MongoDB data | Status |
| :--- | :--- | :--- | :--- | :--- |
| List and search products | Public visitor | `GET /products` | Retrieves `products` and computes each item's rating summary from `reviews` | Completed |
| View product detail | Public visitor | `GET /product-detail/:id` | Retrieves one `products` document and its `reviews` | Completed |
| List reviews for a product | Public visitor | `GET /product-detail/:id/reviews` | Retrieves preview data (title, summary, thumbnail, date) for all `reviews` on one product | Completed |
| View one review | Public visitor | `GET /product-detail/:id/reviews/:reviewId` | Retrieves the full content of one `reviews` document | Completed |
| Create a review | Signed-in user | `POST /product-detail/:id/reviews` | Creates a `reviews` document with an uploaded image URL; a unique index blocks a second review by the same user on the same product | Completed |
| Edit a review | Review owner | `GET` and `POST /product-detail/:id/reviews/:reviewId/edit` | Updates the owner's `reviews` document, replacing the image if a new one is uploaded | Completed |
| Delete a review | Review owner | `POST /product-detail/:id/reviews/:reviewId/delete` | Deletes the owner's `reviews` document and its uploaded image file | Completed |
| Mark a review helpful | Public visitor | `POST /product-detail/:id/reviews/:reviewId/helpful` | Increments the `helpfulCount` field on one `reviews` document | Completed |
| View wishlist | Signed-in user | `GET /wishlist` | Retrieves the signed-in user's `wishlistItems` joined with `products` | Completed |
| Add to wishlist | Signed-in user | `POST /wishlist` | Creates a `wishlistItems` document; a unique index prevents duplicate entries | Completed |
| Remove from wishlist | Signed-in user | `DELETE /wishlist/:productId` | Deletes the signed-in user's `wishlistItems` document | Completed |
| Move a wishlist item to cart | Signed-in user | `POST /wishlist/:productId/move-to-cart` | Adds the item to the user's cart, then deletes the `wishlistItems` document | Completed |
| View profile | Signed-in user | `GET /profile` | Retrieves the signed-in user's `users` document | Completed |
| Edit profile | Signed-in user | `GET` and `POST /profile` | Updates name, email, introduction, and avatar colour or an uploaded profile photo on the `users` document | Completed |
| Change password | Signed-in user | `POST /profile/password` | Verifies the current password hash and updates it | Completed |
| Deactivate account | Signed-in user | `POST /profile/deactivate` | Sets the `users` document status to deactivated and ends the session | Completed |

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
