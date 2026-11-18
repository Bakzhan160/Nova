
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = "nova_secret_key_2026";

app.use(cors());
app.use(express.json());

// DATABASE (temporary in-memory storage)
let users = [];
let nextUserId = 1;

let messages = [];
let nextMessageId = 1;

let comments = [];
let nextCommentId = 1;

let activities = [];
let nextActivityId = 1;

let carts = {};
let likes = {};

// PRODUCTS

const products = [
  {
    id: 1,
    name: "iPhone 17 Pro Max",
    category: "Smartphones",
    price: 850000,
    description: "Apple flagship smartphone with advanced camera and powerful performance.",
    image: "/images/iphone17promax.jpeg"
  },
  {
    id: 2,
    name: "MacBook Pro M5",
    category: "Laptops",
    price: 1200000,
    description: "Powerful laptop for professional work, programming and creativity.",
    image: "/images/macbookprom5.jpeg"
  },
  {
    id: 3,
    name: "AirPods Pro 3",
    category: "Audio",
    price: 145000,
    description: "Premium wireless earbuds with active noise cancellation.",
    image: "/images/airpodspro3.jpeg"
  },
  {
    id: 4,
    name: "Apple Watch Ultra",
    category: "Wearables",
    price: 350000,
    description: "Premium smartwatch with a durable design and fitness features.",
    image: "/images/applewatchultra.jpeg"
  },
  {
    id: 5,
    name: "Sony WH-1000XM6",
    category: "Audio",
    price: 220000,
    description: "Wireless headphones with premium sound and noise cancellation.",
    image: "/images/sonywh1000xm6.jpeg"
  },
  {
    id: 6,
    name: "PlayStation 5 Pro",
    category: "Gaming",
    price: 420000,
    description: "Next-level gaming console with powerful graphics and performance.",
    image: "/images/ps5pro.jpeg"
  },
  {
    id: 7,
    name: "iPad Pro",
    category: "Tablets",
    price: 650000,
    description: "Advanced tablet for creativity, entertainment and productivity.",
    image: "/images/ipadpro.jpeg"
  },
  {
    id: 8,
    name: "Canon EOS R50",
    category: "Cameras",
    price: 390000,
    description: "Compact mirrorless camera for photography and video creation.",
    image: "/images/canoneosr50.jpeg"
  },
  {
    id: 9,
    name: "JBL Charge 6",
    category: "Audio",
    price: 95000,
    description: "Portable Bluetooth speaker with powerful sound.",
    image: "/images/jblcharge6.jpeg"
  },
  {
    id: 10,
    name: "Samsung Galaxy S26 Ultra",
    category: "Smartphones",
    price: 780000,
    description: "Premium Samsung smartphone with an advanced camera and display.",
    image: "/images/s26ultra.jpeg"
  },
  {
    id: 11,
    name: "ASUS ROG Gaming Laptop",
    category: "Laptops",
    price: 950000,
    description: "High-performance gaming laptop for demanding games and applications.",
    image: "/images/asusrog.jpeg"
  }
];


// REELS
const reels = [
  {
    id: 1,
    username: "nova.official",
    description: "Discover the future with NOVA.",
    product: "NOVA Vision Pro",
    price: 245000,
    likes: 120
  },
  {
    id: 2,
    username: "tech.world",
    description: "Premium sound. Every moment.",
    product: "NOVA Headphones",
    price: 85000,
    likes: 86
  },
  {
    id: 3,
    username: "daily.style",
    description: "Minimal design for everyday life.",
    product: "NOVA Smart Watch",
    price: 120000,
    likes: 54
  }
];

// HELPERS
function addActivity(userId, text) {
  activities.push({
    id: nextActivityId++,
    userId,
    text,
    time: new Date().toLocaleString()
  });
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    bio: user.bio || "Welcome to my NOVA profile",
    posts: 0,
    followers: 0,
    following: 0,
    online: user.online || false,
    lastSeen: user.lastSeen || null
  };
}

// AUTH MIDDLEWARE
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "Authorization required" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(item => item.id === decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    user.online = true;
    user.lastSeen = new Date().toISOString();

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Fill in all fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must contain at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (users.some(user => user.email === normalizedEmail)) {
      return res.status(400).json({ message: "This email is already registered" });
    }

    const usernameBase = fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "novauser";

    const username = `${usernameBase}${nextUserId}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: nextUserId++,
      fullName: fullName.trim(),
      username,
      email: normalizedEmail,
      password: hashedPassword,
      bio: "Welcome to my NOVA profile",
      online: true,
      lastSeen: new Date().toISOString()
    };

    users.push(user);
    carts[user.id] = [];

    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: "7d"
    });

    addActivity(user.id, "Welcome to NOVA!");

    res.status(201).json({
      token,
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(
      item => item.email === String(email || "").trim().toLowerCase()
    );

    if (!user) {
      return res.status(400).json({ message: "Incorrect email or password" });
    }

    const passwordCorrect = await bcrypt.compare(password, user.password);

    if (!passwordCorrect) {
      return res.status(400).json({ message: "Incorrect email or password" });
    }

    user.online = true;
    user.lastSeen = new Date().toISOString();

    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({
      token,
      user: publicUser(user)
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

// CURRENT USER
app.get("/api/auth/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// LOGOUT
app.post("/api/auth/logout", auth, (req, res) => {
  req.user.online = false;
  req.user.lastSeen = new Date().toISOString();
  res.json({ message: "Logged out" });
});

// PROFILE
app.get("/api/profile", auth, (req, res) => {
  res.json(publicUser(req.user));
});

// UPDATE PROFILE
app.put("/api/profile", auth, (req, res) => {
  const { fullName, bio } = req.body;

  if (fullName) req.user.fullName = fullName;
  if (bio !== undefined) req.user.bio = bio;

  res.json(publicUser(req.user));
});

// ALL USERS / USER SEARCH
app.get("/api/users", auth, (req, res) => {
  const search = String(req.query.search || "").trim().toLowerCase();

  const result = users
    .filter(user => user.id !== req.user.id)
    .filter(user => {
      if (!search) return true;

      return (
        user.fullName.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    })
    .map(publicUser);

  res.json(result);
});

// GET CONVERSATIONS
app.get("/api/conversations", auth, (req, res) => {
  const currentId = req.user.id;
  const conversationUsers = new Set();

  messages.forEach(message => {
    if (message.senderId === currentId) {
      conversationUsers.add(message.receiverId);
    }

    if (message.receiverId === currentId) {
      conversationUsers.add(message.senderId);
    }
  });

  const result = [...conversationUsers]
    .map(userId => {
      const user = users.find(item => item.id === userId);
      if (!user) return null;

      const conversationMessages = messages.filter(
        message =>
          (message.senderId === currentId && message.receiverId === userId) ||
          (message.senderId === userId && message.receiverId === currentId)
      );

      const lastMessage = conversationMessages[conversationMessages.length - 1];

      const unread = conversationMessages.filter(
        message =>
          message.receiverId === currentId &&
          !message.read
      ).length;

      return {
        ...publicUser(user),
        lastMessage: lastMessage ? lastMessage.text : "",
        lastMessageTime: lastMessage ? lastMessage.createdAt : null,
        unread
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
    });

  res.json(result);
});

// GET MESSAGES BETWEEN TWO USERS
app.get("/api/messages/:userId", auth, (req, res) => {
  const otherId = Number(req.params.userId);

  const otherUser = users.find(user => user.id === otherId);

  if (!otherUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const result = messages.filter(
    message =>
      (message.senderId === req.user.id && message.receiverId === otherId) ||
      (message.senderId === otherId && message.receiverId === req.user.id)
  );

  result.forEach(message => {
    if (message.receiverId === req.user.id) {
      message.read = true;
    }
  });

  res.json(result);
});

// SEND MESSAGE TO USER
app.post("/api/messages/:userId", auth, (req, res) => {
  const receiverId = Number(req.params.userId);
  const text = String(req.body.text || "").trim();

  const receiver = users.find(user => user.id === receiverId);

  if (!receiver) {
    return res.status(404).json({ message: "User not found" });
  }

  if (receiverId === req.user.id) {
    return res.status(400).json({ message: "You cannot message yourself" });
  }

  if (!text) {
    return res.status(400).json({ message: "Message cannot be empty" });
  }

  const message = {
    id: nextMessageId++,
    senderId: req.user.id,
    receiverId,
    senderName: req.user.fullName,
    text,
    createdAt: new Date().toISOString(),
    read: false
  };

  messages.push(message);

  res.status(201).json(message);
});

// PRODUCTS
app.get("/api/products", (req, res) => {
  const search = String(req.query.search || "").trim().toLowerCase();
  const category = req.query.category;

  let result = [...products];

  if (category && category !== "All") {
    result = result.filter(item => item.category === category);
  }

  if (search) {
    result = result.filter(item =>
      item.name.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search)
    );
  }

  res.json(result);
});

// REELS
app.get("/api/reels", (req, res) => {
  res.json(reels);
});

// LIKE REEL
app.post("/api/reels/:id/like", (req, res) => {
  const id = Number(req.params.id);
  const reel = reels.find(item => item.id === id);

  if (!reel) {
    return res.status(404).json({ message: "Reel not found" });
  }

  reel.likes += 1;
  res.json({ likes: reel.likes });
});

// GET COMMENTS
app.get("/api/reels/:id/comments", (req, res) => {
  const id = Number(req.params.id);

  res.json(comments.filter(item => item.reelId === id));
});

// ADD COMMENT
app.post("/api/reels/:id/comments", auth, (req, res) => {
  const text = String(req.body.text || "").trim();

  if (!text) {
    return res.status(400).json({ message: "Comment cannot be empty" });
  }

  const comment = {
    id: nextCommentId++,
    reelId: Number(req.params.id),
    username: req.user.username,
    text,
    createdAt: new Date().toISOString()
  };

  comments.push(comment);
  res.status(201).json(comment);
});

// GET CART
app.get("/api/cart", auth, (req, res) => {
  res.json(carts[req.user.id] || []);
});

// ADD TO CART
app.post("/api/cart", auth, (req, res) => {
  const productId = Number(req.body.productId);
  const product = products.find(item => item.id === productId);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (!carts[req.user.id]) {
    carts[req.user.id] = [];
  }

  const existing = carts[req.user.id].find(
    item => item.productId === productId
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    carts[req.user.id].push({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
  }

  res.json(carts[req.user.id]);
});

// REMOVE FROM CART
app.delete("/api/cart/:id", auth, (req, res) => {
  const id = Number(req.params.id);

  carts[req.user.id] = (carts[req.user.id] || []).filter(
    item => item.id !== id
  );

  res.json(carts[req.user.id]);
});

// CHECKOUT
app.post("/api/checkout", auth, (req, res) => {
  const userCart = carts[req.user.id] || [];

  if (userCart.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const total = userCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const order = {
    id: Date.now(),
    total,
    items: [...userCart],
    createdAt: new Date().toISOString()
  };

  carts[req.user.id] = [];

  addActivity(
    req.user.id,
    `Your order #${order.id} was created`
  );

  res.json(order);
});

// ACTIVITY
app.get("/api/activity", auth, (req, res) => {
  res.json(
    activities
      .filter(item => item.userId === req.user.id)
      .reverse()
  );
});

// START SERVER
app.listen(PORT, () => {
  console.log(`NOVA backend running: http://localhost:${PORT}`);
});
