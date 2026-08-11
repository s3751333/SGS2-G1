const blogList = document.querySelector("#blog-list");
const blogStatus = document.querySelector("#blog-status");

function createBlogCard(post) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-AU");

  return `
    <article class="card">
      <div class="card-image">
        <img src="${post.image}" alt="${post.title}">
      </div>
      <h3>${post.title}</h3>
      <p class="card-meta">By ${post.author} · ${post.category}</p>
      <p>${post.summary}</p>
      <div class="card-footer">
        <span>${formattedDate}</span>
        <a href="blog-articles/blog${post.id}.html" class="btn-read">Read</a>
      </div>
    </article>
  `;
}

async function loadBlogPosts() {
  try {
    const response = await fetch("/blogs-data");
    const posts = await response.json();

    blogList.innerHTML = posts.map(createBlogCard).join("");
    blogStatus.textContent = `${posts.length} blog posts found.`;
  } catch {
    blogStatus.textContent = "Could not load the blog posts.";
  }
}

loadBlogPosts();
