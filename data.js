const users = [
  {
    id: 1,
    fullName: "Mark Molnar",
    username: "markmolnar",
    email: "mark.molnar@booknook.test",
    introduction: "I enjoy books and web development.",
    role: "member",
    status: "active",
  },
];

const blogPosts = [
  {
    id: 1,
    authorId: 1,
    title: "Top 5 Programming Languages to Learn in 2026",
    date: "2026-07-01",
    category: "programming",
    tags: ["JavaScript", "Python", "Careers"],
    summary: "Explore five programming languages that are useful for modern software development.",
    content: [
      "Software development continues to change through cloud platforms, automation, and artificial intelligence. Learning languages with strong communities and practical applications helps new developers build useful projects.",
      "JavaScript and TypeScript remain important for modern web applications, while Python is widely used for automation, data analysis, and artificial intelligence.",
      "Go and Rust are also useful choices for systems where performance and reliability are important. The best language to learn depends on the type of projects a developer wants to build.",
    ],
    image: "img/book.jpg",
    comments: [
      {
        id: 1,
        author: "Laura",
        date: "2026-07-16",
        text: "Great article! JavaScript is definitely not going anywhere.",
      },
      {
        id: 2,
        author: "Tom",
        date: "2026-07-17",
        text: "Rust is also worth exploring for performance-heavy applications.",
      },
    ],
  },
  {
    id: 2,
    authorId: 1,
    title: "Getting Started with Mobile App Development",
    date: "2026-06-18",
    category: "mobile",
    tags: ["Mobile", "Apps", "Development"],
    summary: "A beginner-friendly introduction to planning and building mobile applications.",
    content: [
      "Mobile applications support communication, shopping, banking, education, and entertainment. Beginners should start with a small project and focus on a clear user interface before adding complex features.",
      "Native Android applications commonly use Kotlin, while native iOS applications generally use Swift. Cross-platform tools such as Flutter and React Native can support both platforms from one codebase.",
      "Before publication, applications should be tested on different screen sizes and devices. Regular updates and user feedback help improve the product after release.",
    ],
    image: "img/mobileapp.jpg",
    comments: [
      {
        id: 1,
        author: "Noah",
        date: "2026-06-20",
        text: "Flutter has been my favourite framework for building reusable interfaces.",
      },
      {
        id: 2,
        author: "Grace",
        date: "2026-06-21",
        text: "This article gave me a useful starting point for my first mobile app.",
      },
    ],
  },
  {
    id: 3,
    authorId: 1,
    title: "How Open Source Projects Improve Your Skills",
    date: "2026-07-09",
    category: "programming",
    tags: ["Open Source", "GitHub", "Teamwork"],
    summary: "Learn how open source contribution provides practical programming and teamwork experience.",
    content: [
      "Open source projects allow developers to work on real software with contributors from different backgrounds. Reading existing code, fixing small issues, and discussing changes are valuable professional skills.",
      "A first contribution does not need to be a major feature. Beginners can improve documentation, reproduce a reported bug, or add a simple automated test.",
      "Consistent contributions improve communication, teamwork, and confidence while building a portfolio that demonstrates practical experience.",
    ],
    image: "img/opensource.jpg",
    comments: [
      {
        id: 1,
        author: "David",
        date: "2026-07-11",
        text: "Contributing on GitHub helped me understand code reviews and team workflows.",
      },
      {
        id: 2,
        author: "Megan",
        date: "2026-07-12",
        text: "Open source is a great way to learn from more experienced developers.",
      },
    ],
  },
  {
    id: 4,
    authorId: 1,
    title: "Why Cloud Computing Continues to Grow",
    date: "2026-05-02",
    category: "cloud",
    tags: ["Cloud", "Infrastructure", "Web"],
    summary: "Understand why organisations continue moving applications and infrastructure to cloud services.",
    content: [
      "Cloud computing gives organisations access to computing resources without maintaining large amounts of physical hardware. It can improve flexibility, collaboration, and the speed of deployment.",
      "Cloud platforms allow resources to increase or decrease according to demand. This is useful for services that experience seasonal traffic or rapid growth.",
      "Organisations must still consider data protection, availability, and vendor dependency when planning a move to cloud services.",
    ],
    image: "img/cloudcomputing.jpg",
    comments: [
      {
        id: 1,
        author: "Ryan",
        date: "2026-05-04",
        text: "Cloud services have changed how our team deploys web applications.",
      },
      {
        id: 2,
        author: "Linda",
        date: "2026-05-05",
        text: "Scalability is one of the strongest reasons for moving services to the cloud.",
      },
    ],
  },
  {
    id: 5,
    authorId: 1,
    title: "Cybersecurity Tips Everyone Should Know",
    date: "2026-04-10",
    category: "cybersecurity",
    tags: ["Security", "Privacy", "Passwords"],
    summary: "Simple habits that help protect accounts, personal information, and devices.",
    content: [
      "Cybersecurity threats continue to evolve, but strong unique passwords, software updates, multi-factor authentication, and careful link checking can reduce common risks.",
      "Reusing the same password across several websites allows one compromised account to place many other accounts at risk.",
      "Users should remain cautious when opening unexpected emails, attachments, or links. Messages that create urgency or request passwords may be phishing attempts.",
    ],
    image: "img/security.jpg",
    comments: [
      {
        id: 1,
        author: "Chris",
        date: "2026-04-12",
        text: "Everyone should enable two-factor authentication for important accounts.",
      },
      {
        id: 2,
        author: "Anna",
        date: "2026-04-13",
        text: "Password reuse is still a very common problem among internet users.",
      },
    ],
  },
];

module.exports = { users, blogPosts };
