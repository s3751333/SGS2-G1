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
| **Mark Molnar** | `s4051620` | Blog Platform, Shared User Access (`/login`, `/register`, `/blogs`, `/blog-create`, `/blog-articles/`, `/sitemap`) |
| **Tấn Tài Phạm** | `s3751333` | Discussion Forum & Admin Panel (`/forum-main`, `/forum-topic`, `/forum-new-topic`, `/admin-users`) |
| **Ayden Le** | `s4123086` | Shopping Cart, Checkout, Landing Page & Navigation (`/`, `/cart`, `/checkout`) |
| **Khoa Pham Dang Nguyen** | `s4132855` | Product Reviews, Wishlist & User Profile (`/products`, `/product-detail`, `/profile`, `/wishlist`) |

---

## Repository & Project Structure

```text
SGS2-G1/
├── public/                 # Static files served by Express
│   ├── css/                # Stylesheets
│   ├── img/                # Images and book covers
│   └── js/                 # Browser-side JavaScript
├── views/                  # EJS page templates
│   ├── blog-articles/      # Individual blog article templates
│   ├── partials/           # Shared navbar and footer templates
│   └── *.ejs               # Main application pages
├── data.js                 # In-memory sample data
├── index.js                # Express application entry point and routes
├── package.json            # Project scripts and dependencies
└── README.md               # Project documentation and guidelines
```

## Running the Application

```bash
npm install
npm start
```

Open `http://localhost:3000` in a browser. Express routes use clean URLs such as
`/blogs`, `/login`, and `/products`; the corresponding templates are stored as
`.ejs` files inside the `views` folder.
