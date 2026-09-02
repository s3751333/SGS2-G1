function buildSitemapSections({ currentUser, products, blogPosts, forumTopics }) {
  const sections = [
    {
      id: "main-navigation",
      title: "Main Navigation",
      icon: "fas fa-compass",
      links: [
        { url: "/", label: "Home Page" },
        { url: "/products", label: "Products" },
        { url: "/blogs", label: "Blog" },
        { url: "/forum-main", label: "Community Forum" },
      ],
    },
    {
      id: "account-access",
      title: "Account Access",
      icon: "fas fa-user",
      links: [
        { url: "/login", label: "Sign In" },
        { url: "/register", label: "Create Account" },
        { url: "/forgot-password", label: "Forgot Password" },
      ],
    },
    {
      id: "product-details",
      title: "Product Details",
      icon: "fas fa-book-open",
      links: [
        { url: "/products", label: "All Products" },
        ...products.map((product) => ({
          url: `/product-detail/${product.id}`,
          label: product.name,
        })),
      ],
    },
    {
      id: "blog-articles",
      title: "Blog Articles",
      icon: "fas fa-newspaper",
      links: [
        { url: "/blogs", label: "All Blog Articles" },
        ...blogPosts.map((post) => ({
          url: `/blog-articles/blog${post.id}`,
          label: post.title,
        })),
      ],
    },
    {
      id: "forum-topics",
      title: "Discussion Topics",
      icon: "fas fa-comments",
      links: [
        { url: "/forum-main", label: "All Discussion Topics" },
        ...forumTopics
          .filter((topic) => !topic.deleted)
          .map((topic) => ({
            url: `/forum-topic/${topic.id}`,
            label: topic.title,
          })),
      ],
    },
  ];

  if (currentUser && currentUser.role === "admin") {
    sections.push({
      id: "administration",
      title: "Administration",
      icon: "fas fa-user-shield",
      links: [{ url: "/admin-users", label: "Manage User Accounts" }],
    });
  }

  return sections;
}

module.exports = { buildSitemapSections };
