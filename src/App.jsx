
import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function App() {
  const [page, setPage] = useState("Reels");

  // AUTH
  const [token, setToken] = useState(
    () => localStorage.getItem("novaToken") || ""
  );
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // APP DATA
  const [reels, setReels] = useState([]);
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);

  // SHOP
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // CHAT
  const [conversations, setConversations] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [chatSearch, setChatSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  // OTHER
  const [selectedReel, setSelectedReel] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // API REQUEST
  async function request(url, options = {}) {
    const response = await fetch(API + url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {})
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Server error");
    }

    return data;
  }

  // NOTIFICATION
  function notify(text) {
    setNotice(text);
    setTimeout(() => setNotice(""), 2200);
  }

  // LOAD MAIN DATA
  async function loadData() {
    try {
      const [r, p, pr, c, a] = await Promise.all([
        request("/reels"),
        request("/products"),
        request("/profile"),
        request("/cart"),
        request("/activity")
      ]);

      setReels(r);
      setProducts(p);
      setProfile(pr);
      setCart(c);
      setActivities(a);
    } catch (error) {
      notify("Backend connection error");
    } finally {
      setLoading(false);
    }
  }

  // LOAD CONVERSATIONS
  async function loadConversations() {
    try {
      const data = await request("/conversations");
      setConversations(data);
    } catch (error) {
      console.log("Conversation loading error:", error.message);
    }
  }

  // LOAD MESSAGES
  async function loadChatMessages(userId) {
    try {
      const data = await request(`/messages/${userId}`);
      setChatMessages(data);
    } catch (error) {
      notify("Could not load messages");
    }
  }

  // SEARCH USERS
  async function searchChatUsers(value) {
    setChatSearch(value);

    if (!value.trim()) {
      setChatUsers([]);
      return;
    }

    try {
      const data = await request(
        "/users?search=" + encodeURIComponent(value)
      );

      setChatUsers(data);
    } catch (error) {
      notify("User search failed");
    }
  }

  // OPEN CHAT
  async function openChat(user) {
    setSelectedChat(user);
    setChatMessages([]);
    setChatUsers([]);
    setChatSearch("");
    setMessageText("");
    setPage("Chat");

    await loadChatMessages(user.id);
    await loadConversations();
  }

  // CHECK LOGIN
  useEffect(() => {
    async function checkLogin() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(API + "/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Session expired");
        }

        const data = await response.json();
        setProfile(data.user || data);

        await loadData();
      } catch {
        localStorage.removeItem("novaToken");
        setToken("");
        setProfile(null);
        setLoading(false);
      }
    }

    checkLogin();
  }, [token]);

  // AUTOMATIC CHAT REFRESH EVERY 3 SECONDS
  useEffect(() => {
    if (!token || page !== "Chat") return;

    async function refreshChat() {
      await loadConversations();

      if (selectedChat) {
        await loadChatMessages(selectedChat.id);
      }
    }

    refreshChat();

    const interval = setInterval(refreshChat, 3000);

    return () => clearInterval(interval);
  }, [token, page, selectedChat?.id]);

  // AUTHENTICATION
  async function handleAuth(e) {
    e.preventDefault();

    setAuthError("");
    setAuthLoading(true);

    try {
      const endpoint =
        authMode === "login"
          ? "/auth/login"
          : "/auth/register";

      const body =
        authMode === "login"
          ? {
              email: authEmail,
              password: authPassword
            }
          : {
              fullName: authName,
              email: authEmail,
              password: authPassword
            };

      const response = await fetch(API + endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      localStorage.setItem("novaToken", data.token);
      setProfile(data.user);
      setToken(data.token);
      setAuthPassword("");
      setPage("Reels");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // LOGOUT
  function logout() {
    localStorage.removeItem("novaToken");
    setToken("");
    setProfile(null);
    setPage("Reels");
    setSelectedChat(null);
    setCart([]);
    setReels([]);
    setProducts([]);
    setLoading(false);
    notify("You have logged out");
  }

  // LIKE REEL
  async function handleLike(id) {
    try {
      const data = await request(`/reels/${id}/like`, {
        method: "POST"
      });

      setReels(old =>
        old.map(item =>
          item.id === id
            ? { ...item, likes: data.likes }
            : item
        )
      );
    } catch {
      notify("Could not like this post");
    }
  }

  // COMMENTS
  async function openComments(id) {
    setSelectedReel(id);
    setPage("Comments");

    try {
      const data = await request(`/reels/${id}/comments`);
      setComments(data);
    } catch {
      notify("Comments could not be loaded");
    }
  }

  async function addComment(e) {
    e.preventDefault();

    if (!commentText.trim()) return;

    try {
      const data = await request(
        `/reels/${selectedReel}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: commentText
          })
        }
      );

      setComments(old => [...old, data]);
      setCommentText("");
      notify("Comment sent");
    } catch {
      notify("Comment could not be sent");
    }
  }

  // SHARE
  async function shareReel(id) {
    const link = `${window.location.origin}/?reel=${id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "NOVA",
          url: link
        });
      } else {
        await navigator.clipboard.writeText(link);
        notify("Link copied!");
      }
    } catch {
      notify("Sharing cancelled");
    }
  }

  // CART
  async function addToCart(id) {
    try {
      await request("/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: id
        })
      });

      setCart(await request("/cart"));
      notify("Added to cart");
    } catch {
      notify("Could not add product");
    }
  }

  async function removeFromCart(id) {
    try {
      await request(`/cart/${id}`, {
        method: "DELETE"
      });

      setCart(await request("/cart"));
      notify("Product removed");
    } catch {
      notify("Could not remove product");
    }
  }

  // SEND PRIVATE MESSAGE
  async function sendMessage(e) {
    e.preventDefault();

    if (!messageText.trim() || !selectedChat) return;

    try {
      const data = await request(
        `/messages/${selectedChat.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: messageText
          })
        }
      );

      setChatMessages(old => [...old, data]);
      setMessageText("");
      await loadConversations();
    } catch (error) {
      notify(error.message || "Message could not be sent");
    }
  }

  // CHECKOUT
  async function checkout() {
    try {
      const order = await request("/checkout", {
        method: "POST"
      });

      setCart([]);
      setActivities(await request("/activity"));
      notify(`Order #${order.id} created`);
      setPage("Profile");
    } catch {
      notify("Your cart is empty");
    }
  }

  // NAVIGATION
  async function openPage(name) {
    setPage(name);

    if (name === "Activity") {
      try {
        setActivities(await request("/activity"));
      } catch {
        notify("Could not load activity");
      }
    }

    if (name === "Cart") {
      try {
        setCart(await request("/cart"));
      } catch {
        notify("Could not load cart");
      }
    }

    if (name === "Chat") {
      setSelectedChat(null);
      setChatMessages([]);
      setChatSearch("");
      setChatUsers([]);
      await loadConversations();
    }
  }

  // SHOP FILTER
  const filteredProducts = products.filter(product => {
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search) ||
      product.description.toLowerCase().includes(search);

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // CALCULATIONS
  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  function formatTime(value) {
    if (!value) return "";

    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // AUTH SCREEN
  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-card">

          <div className="auth-logo">
            NOVA<span>.</span>
          </div>

          <p className="auth-subtitle">
            YOUR WORLD. YOUR EXPERIENCE.
          </p>

          <h1>
            {authMode === "login"
              ? "Welcome Back"
              : "Create Account"}
          </h1>

          <p className="auth-description">
            {authMode === "login"
              ? "Sign in to continue your NOVA experience."
              : "Join NOVA and discover something new."}
          </p>

          <form onSubmit={handleAuth}>

            {authMode === "register" && (
              <input
                type="text"
                placeholder="Full name"
                value={authName}
                onChange={e => setAuthName(e.target.value)}
                required
              />
            )}

            <input
              type="email"
              placeholder="Email address"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password (min. 6 characters)"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              minLength={6}
              required
            />

            {authError && (
              <div className="auth-error">{authError}</div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>

          </form>

          <div className="auth-switch">
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "register" : "login"
                );
                setAuthError("");
              }}
            >
              {authMode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">NOVA<span>.</span></div>;
  }

  return (
    <div className="phone">

      <div className="status-bar">
        <span>9:41</span>
        <span>●●● Wi-Fi ▰</span>
      </div>

      <header className="topbar">
        <button className="logo" onClick={() => openPage("Reels")}>
          NOVA<span>.</span>
        </button>

        <div className="top-actions">
          <button onClick={() => openPage("Activity")}>♡</button>
          <button onClick={() => openPage("Cart")}>
            ♧<small>{cartCount}</small>
          </button>
        </div>
      </header>

      {notice && <div className="toast">{notice}</div>}

      <main className="screen">

        {/* REELS */}
        {page === "Reels" && (
          <section className="reels-screen">

            <div className="reel-tabs">
              <button>Following</button>
              <button className="selected">For You</button>
              <button onClick={() => openPage("Shop")}>Shop</button>
            </div>

            {reels.map(reel => (
              <article className="reel" key={reel.id}>

                
<div className="video-bg">
  <video
    className="reel-video"
    src={`/videos/reel${reel.id}.mp4`}
    autoPlay
    muted
    loop
    playsInline
  />

  <div className="video-overlay">
    <div className="video-brand">NOVA</div>
    <p>THE FUTURE IS NOW</p>
    <div className="video-bottom-label">
      ✦ NOVA EXPERIENCE
    </div>
  </div>
</div>


                <div className="reel-top-label">
                  <span>✦</span> NOVA ORIGINAL
                </div>

                <div className="reel-sidebar">
                  <div className="creator-avatar">N</div>

                  <button onClick={() => handleLike(reel.id)}>
                    <span>♥</span>
                    <small>{reel.likes}</small>
                  </button>

                  <button onClick={() => openComments(reel.id)}>
                    <span>▢</span>
                    <small>Comment</small>
                  </button>

                  <button onClick={() => shareReel(reel.id)}>
                    <span>↗</span>
                    <small>Share</small>
                  </button>
                </div>

                <div className="reel-details">
                  <div className="creator-name">
                    @{reel.username}
                    <span className="pro-badge">PRO</span>
                  </div>

                  <p>{reel.description}</p>

                  <div className="product-mini">
                    <div className="mini-product-icon">✦</div>

                    <div>
                      <small>FEATURED PRODUCT</small>
                      <strong>{reel.product}</strong>
                      <b>{reel.price.toLocaleString("en-US")} ₸</b>
                    </div>

                    <button
                      onClick={() => {
                        const product = products.find(
                          p => p.name === reel.product
                        );

                        if (product) {
                          setSelectedProduct(product);
                          setPage("Product");
                        } else {
                          openPage("Shop");
                        }
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>

              </article>
            ))}

          </section>
        )}

        {/* SHOP */}
        {page === "Shop" && (
          <section className="content-page">

            <div className="page-heading">
              <div>
                <small>NOVA COLLECTION</small>
                <h1>Discover Shop</h1>
              </div>

              <button onClick={() => openPage("Cart")}>
                ♧ {cartCount}
              </button>
            </div>

            <div className="search-box">
              <span>⌕</span>
              <input
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            
<div className="category-row">
  {[
    "All",
    "Smartphones",
    "Laptops",
    "Audio",
    "Wearables",
    "Gaming",
    "Tablets",
    "Cameras"
  ].map(category => (
    <button
      key={category}
      className={
        selectedCategory === category ? "selected" : ""
      }
      onClick={() => setSelectedCategory(category)}
    >
      {category}
    </button>
  ))}
</div>


            
<div className="product-grid">
  {filteredProducts.map(product => (
    <article className="shop-card" key={product.id}>

      <button
        className="product-visual"
        onClick={() => {
          setSelectedProduct(product);
          openPage("Product");
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          onError={e => {
            e.currentTarget.style.display = "none";
          }}
        />
        <span className="image-brand">NOVA</span>
      </button>

      <small>{product.category}</small>
      <h3>{product.name}</h3>

      <b>
        {product.price.toLocaleString("en-US")} ₸
      </b>

      <button
        className="add-button"
        onClick={() => addToCart(product.id)}
      >
        Add to cart
      </button>

    </article>
  ))}
</div>


            {filteredProducts.length === 0 && (
              <div className="empty-state">
                <span>⌕</span>
                <h2>No products found</h2>
                <p>Try another product name or category.</p>

                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("All");
                  }}
                >
                  Show all products
                </button>
              </div>
            )}

          </section>
        )}

        
{/* PRODUCT */}
{page === "Product" && selectedProduct && (
  <section className="content-page product-detail">

    <button
      className="back-button"
      onClick={() => openPage("Shop")}
    >
      ← Back to Shop
    </button>

    <div className="detail-visual">
      <img
        src={selectedProduct.image}
        alt={selectedProduct.name}
        onError={e => {
          e.currentTarget.style.display = "none";
        }}
      />
      <span>NOVA.</span>
    </div>

    <small>EXCLUSIVE NOVA COLLECTION</small>

    <h1>{selectedProduct.name}</h1>

    <p>{selectedProduct.description}</p>

    <div className="detail-category">
      {selectedProduct.category}
    </div>

    <h2>
      {selectedProduct.price.toLocaleString("en-US")} ₸
    </h2>

    <button
      className="wide-button"
      onClick={() => addToCart(selectedProduct.id)}
    >
      Add to cart
    </button>

  </section>
)}


        {/* CART */}
        {page === "Cart" && (
          <section className="content-page">

            <div className="page-heading">
              <div>
                <small>YOUR SELECTION</small>
                <h1>My Cart</h1>
              </div>
            </div>

            {cart.length === 0 && (
              <div className="empty-state">
                <span>♧</span>
                <h2>Your cart is empty</h2>
                <p>Discover something new in NOVA Shop.</p>
                <button onClick={() => openPage("Shop")}>
                  Explore Shop
                </button>
              </div>
            )}

            {cart.map(item => (
              <div className="cart-item" key={item.id}>

                <div className="cart-visual">✦</div>

                <div className="cart-item-info">
                  <b>{item.name}</b>
                  <small>Quantity: {item.quantity}</small>
                  <strong>
                    {(item.price * item.quantity).toLocaleString("en-US")} ₸
                  </strong>
                </div>

                <button onClick={() => removeFromCart(item.id)}>×</button>

              </div>
            ))}

            {cart.length > 0 && (
              <div className="checkout-box">
                <div>
                  <span>Total</span>
                  <b>{total.toLocaleString("en-US")} ₸</b>
                </div>

                <button
                  className="wide-button"
                  onClick={() => openPage("Checkout")}
                >
                  Continue to checkout
                </button>
              </div>
            )}

          </section>
        )}

        {/* CHECKOUT */}
        {page === "Checkout" && (
          <section className="content-page">

            <button
              className="back-button"
              onClick={() => openPage("Cart")}
            >
              ← Back to cart
            </button>

            <small>ALMOST THERE</small>
            <h1>Checkout</h1>

            <div className="checkout-box">
              <h3>Order summary</h3>

              {cart.map(item => (
                <p key={item.id}>
                  {item.name} × {item.quantity}
                </p>
              ))}

              <div>
                <span>Total</span>
                <b>{total.toLocaleString("en-US")} ₸</b>
              </div>
            </div>

            <p className="muted">
              This is a demo checkout. Real online payments are not connected.
            </p>

            <button
              className="wide-button"
              onClick={checkout}
              disabled={cart.length === 0}
            >
              Confirm demo order
            </button>

          </section>
        )}

        {/* COMMENTS */}
        {page === "Comments" && (
          <section className="content-page">

            <button
              className="back-button"
              onClick={() => openPage("Reels")}
            >
              ← Back to Reels
            </button>

            <h1>Comments</h1>

            {comments.map(comment => (
              <div className="comment-item" key={comment.id}>
                <div className="creator-avatar small-avatar">
                  {comment.username[0].toUpperCase()}
                </div>

                <div>
                  <b>@{comment.username}</b>
                  <p>{comment.text}</p>
                </div>
              </div>
            ))}

            <form className="message-form" onSubmit={addComment}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a comment..."
              />
              <button type="submit">Send</button>
            </form>

          </section>
        )}

        {/* ACTIVITY */}
        {page === "Activity" && (
          <section className="content-page">

            <small>YOUR UPDATES</small>
            <h1>Activity</h1>

            {activities.map(item => (
              <div className="activity-item" key={item.id}>
                <div className="activity-icon">✦</div>

                <div>
                  <p>{item.text}</p>
                  <small>{item.time}</small>
                </div>
              </div>
            ))}

          </section>
        )}

        {/* CHAT */}
        {page === "Chat" && (
          <section className="content-page nova-chat">

            {!selectedChat ? (
              <>
                <div className="chat-heading">
                  <div>
                    <small>NOVA CONNECTION</small>
                    <h1>Messages<span>.</span></h1>
                    <p>Connect with people around you.</p>
                  </div>

                  <div className="chat-heading-icon">✉</div>
                </div>

                {/* SEARCH PEOPLE */}
                <div className="chat-search">
                  <span>⌕</span>

                  <input
                    value={chatSearch}
                    onChange={e => searchChatUsers(e.target.value)}
                    placeholder="Search people by name or username..."
                  />

                  {chatSearch && (
                    <button
                      onClick={() => {
                        setChatSearch("");
                        setChatUsers([]);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* SEARCH RESULTS */}
                {chatSearch.trim() && (
                  <div className="people-section">
                    <div className="chat-section-title">
                      <span>SEARCH RESULTS</span>
                      <small>{chatUsers.length} people</small>
                    </div>

                    {chatUsers.length === 0 ? (
                      <div className="chat-empty">
                        <span>⌕</span>
                        <p>No users found</p>
                      </div>
                    ) : (
                      chatUsers.map(user => (
                        <button
                          className="person-row"
                          key={user.id}
                          onClick={() => openChat(user)}
                        >
                          <div className="person-avatar">
                            {user.fullName?.[0]?.toUpperCase() || "N"}
                            <i className={user.online ? "online" : ""}></i>
                          </div>

                          <div className="person-info">
                            <strong>{user.fullName}</strong>
                            <small>@{user.username}</small>
                          </div>

                          <span className="person-arrow">↗</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* CONVERSATIONS */}
                {!chatSearch.trim() && (
                  <div className="conversation-section">

                    <div className="chat-section-title">
                      <span>YOUR CONVERSATIONS</span>
                      <small>{conversations.length} chats</small>
                    </div>

                    {conversations.length === 0 ? (
                      <div className="chat-empty">
                        <div className="chat-empty-icon">✧</div>
                        <h3>Your space is waiting</h3>
                        <p>
                          Search for someone above and start your first conversation.
                        </p>
                      </div>
                    ) : (
                      conversations.map(user => (
                        <button
                          className="conversation-row"
                          key={user.id}
                          onClick={() => openChat(user)}
                        >
                          <div className="person-avatar">
                            {user.fullName?.[0]?.toUpperCase() || "N"}
                            <i className={user.online ? "online" : ""}></i>
                          </div>

                          <div className="conversation-info">
                            <div className="conversation-top">
                              <strong>{user.fullName}</strong>
                              <small>
                                {formatTime(user.lastMessageTime)}
                              </small>
                            </div>

                            <div className="conversation-bottom">
                              <p>{user.lastMessage || "Start a conversation"}</p>

                              {user.unread > 0 && (
                                <span className="unread-count">
                                  {user.unread}
                                </span>
                              )}
                            </div>
                          </div>

                        </button>
                      ))
                    )}

                  </div>
                )}
              </>
            ) : (
              <>
                {/* PRIVATE CHAT HEADER */}
                <div className="private-chat-header">

                  <button
                    className="chat-back"
                    onClick={() => {
                      setSelectedChat(null);
                      setChatMessages([]);
                      loadConversations();
                    }}
                  >
                    ←
                  </button>

                  <div className="person-avatar">
                    {selectedChat.fullName?.[0]?.toUpperCase() || "N"}
                    <i className={selectedChat.online ? "online" : ""}></i>
                  </div>

                  <div className="private-chat-user">
                    <strong>{selectedChat.fullName}</strong>
                    <small>
                      {selectedChat.online
                        ? "● Online"
                        : "Offline"}
                    </small>
                  </div>

                  <button
                    className="chat-more"
                    onClick={() => notify("NOVA private chat")}
                  >
                    ⋯
                  </button>

                </div>

                {/* MESSAGES */}
                <div className="private-chat-body">

                  <div className="chat-date-label">
                    PRIVATE CONVERSATION
                  </div>

                  {chatMessages.length === 0 && (
                    <div className="first-message">
                      <div className="first-message-icon">✧</div>
                      <h3>Say hello!</h3>
                      <p>
                        This is the beginning of your conversation with{" "}
                        {selectedChat.fullName}.
                      </p>
                    </div>
                  )}

                  {chatMessages.map(message => {
                    const own = message.senderId === profile?.id;

                    return (
                      <div
                        key={message.id}
                        className={
                          own
                            ? "chat-message-row own"
                            : "chat-message-row"
                        }
                      >
                        {!own && (
                          <div className="chat-mini-avatar">
                            {selectedChat.fullName?.[0]?.toUpperCase() || "N"}
                          </div>
                        )}

                        <div className="chat-message-content">
                          <div
                            className={
                              own
                                ? "chat-bubble own-bubble"
                                : "chat-bubble"
                            }
                          >
                            {message.text}
                          </div>

                          <small className="message-time">
                            {formatTime(message.createdAt)}
                            {own ? "  ✓" : ""}
                          </small>
                        </div>
                      </div>
                    );
                  })}

                </div>

                {/* MESSAGE INPUT */}
                <form
                  className="nova-message-form"
                  onSubmit={sendMessage}
                >
                  <input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Write a message..."
                  />

                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                  >
                    ↗
                  </button>
                </form>

              </>
            )}

          </section>
        )}

        {/* PROFILE */}
        {page === "Profile" && profile && (
          <section className="content-page">

            <small>YOUR PERSONAL SPACE</small>
            <h1>Profile</h1>

            <div className="profile-card">
              <div className="profile-avatar">N</div>

              <h2>{profile.fullName}</h2>
              <p>@{profile.username}</p>
              <p>{profile.bio}</p>

              <div className="profile-stats">
                <div>
                  <b>{profile.posts}</b>
                  <small>Posts</small>
                </div>

                <div>
                  <b>{profile.followers}</b>
                  <small>Followers</small>
                </div>

                <div>
                  <b>{profile.following}</b>
                  <small>Following</small>
                </div>
              </div>
            </div>

            <button
              className="settings-link"
              onClick={() => openPage("Settings")}
            >
              ⚙ Settings <span>›</span>
            </button>

          </section>
        )}

        {/* SETTINGS */}
        {page === "Settings" && (
          <section className="content-page">

            <button
              className="back-button"
              onClick={() => openPage("Profile")}
            >
              ← Back
            </button>

            <small>PERSONALIZE YOUR EXPERIENCE</small>
            <h1>Settings</h1>

            {[
              "Account",
              "Notifications",
              "Privacy",
              "Language",
              "Help & Support",
              "About NOVA"
            ].map(item => (
              <button className="setting-item" key={item}>
                {item} <span>›</span>
              </button>
            ))}

            <button className="setting-item" onClick={logout}>
              Log Out <span>↗</span>
            </button>

          </section>
        )}

      </main>

      {/* BOTTOM NAV */}
      <footer className="bottom-nav">

        <button
          className={page === "Reels" ? "nav-active" : ""}
          onClick={() => openPage("Reels")}
        >
          <span>⌂</span>
          <small>Home</small>
        </button>

        <button
          className={page === "Shop" ? "nav-active" : ""}
          onClick={() => openPage("Shop")}
        >
          <span>◇</span>
          <small>Shop</small>
        </button>

        <button
          className={page === "Chat" ? "nav-active" : ""}
          onClick={() => openPage("Chat")}
        >
          <span>✉</span>
          <small>Chat</small>
        </button>

        <button
          className={page === "Activity" ? "nav-active" : ""}
          onClick={() => openPage("Activity")}
        >
          <span>♡</span>
          <small>Activity</small>
        </button>

        <button
          className={page === "Profile" ? "nav-active" : ""}
          onClick={() => openPage("Profile")}
        >
          <span>◎</span>
          <small>Profile</small>
        </button>

      </footer>

      <div className="home-indicator"></div>

    </div>
  );
}

export default App;
