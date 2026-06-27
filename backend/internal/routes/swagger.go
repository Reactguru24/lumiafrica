package routes

import (
	"net/http"

	"github.com/Reactguru24/lumiafrica/internal/config"

	"github.com/gin-gonic/gin"
)

func registerSwaggerRoutes(router *gin.Engine, cfg *config.Config) {
	if !cfg.SwaggerEnabled {
		return
	}
	router.GET("/swagger/swagger.json", func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate")
		c.File("docs/swagger.json")
	})

	router.GET("/swagger/index.html", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, swaggerUIHTML)
	})

	router.GET("/swagger/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})
}

const swaggerUIHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Lumi API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    #auth-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 12px 20px;
      background: #1b1b1b;
      color: #fff;
      font-family: sans-serif;
      font-size: 14px;
      border-bottom: 3px solid #49cc90;
    }
    #auth-bar label { color: #aaa; margin-right: 4px; }
    #auth-bar input {
      padding: 6px 10px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #2d2d2d;
      color: #fff;
      font-size: 13px;
    }
    #auth-bar input[type="email"] { width: 200px; }
    #auth-bar input[type="password"] { width: 140px; }
    #auth-bar select {
      padding: 6px 10px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #2d2d2d;
      color: #fff;
      font-size: 13px;
    }
    #auth-bar button {
      padding: 6px 14px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    #btn-login { background: #49cc90; color: #1b1b1b; }
    #btn-login:hover { background: #3db87c; }
    #btn-logout { background: #555; color: #fff; }
    #btn-logout:hover { background: #666; }
    #auth-status { margin-left: auto; font-size: 13px; }
    #auth-status.ok { color: #49cc90; }
    #auth-status.err { color: #f93e3e; }
    #auth-hint { width: 100%; color: #888; font-size: 12px; margin-top: 2px; }
  </style>
</head>
<body>
  <div id="auth-bar">
    <label>Role</label>
    <select id="role-preset">
      <option value="guest" selected>Guest</option>
      <option value="customer">Customer</option>
      <option value="vendor">Vendor</option>
      <option value="admin">Admin</option>
    </select>
    <label>Email</label>
    <input id="email" type="email" placeholder="customer@lumiafrica.com" value=""/>
    <label>Password</label>
    <input id="password" type="password" placeholder="password" value=""/>
    <button id="btn-login" type="button">Sign in</button>
    <button id="btn-logout" type="button">Sign out</button>
    <span id="auth-status"></span>
    <span id="auth-hint">Guest — browse freely. Sign in as Customer, Vendor, or Admin. Payment and Subscription sections group Paystack checkout APIs.</span>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    const TOKEN_KEY = 'lumi_swagger_token';
    const TAG_ORDER = [
      'Guest', 'Customer', 'Vendor', 'Admin',
      'Payment', 'Subscription',
      'Authentication', 'Users', 'Upload'
    ];
    const ACCOUNTS = {
      guest:    { email: '', password: '' },
      customer: { email: 'customer@lumiafrica.com', password: 'customer123' },
      vendor:   { email: 'vendor@lumiafrica.com', password: 'vendor123' },
      admin:    { email: 'admin@lumiafrica.com', password: 'admin123' },
    };

    function applyRolePreset(role) {
      const acct = ACCOUNTS[role] || ACCOUNTS.guest;
      document.getElementById('email').value = acct.email;
      document.getElementById('password').value = acct.password;
      if (role === 'guest') {
        logout();
        setStatus('Guest mode — browse public endpoints without a token', true);
        return;
      }
    }

    applyRolePreset('guest');

    function authHeader(token) {
      return token.startsWith('Bearer ') ? token : 'Bearer ' + token;
    }

    function applyToken(token) {
      if (!window.ui || !token) return;
      window.ui.preauthorizeApiKey('Bearer', authHeader(token));
    }

    function setStatus(msg, ok) {
      const el = document.getElementById('auth-status');
      el.textContent = msg;
      el.className = ok ? 'ok' : 'err';
    }

    async function login() {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || !password) {
        setStatus('Email and password required', false);
        return;
      }
      setStatus('Signing in…', true);
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const body = await res.json();
        if (!res.ok || !body.data || !body.data.token) {
          setStatus(body.message || 'Login failed', false);
          return;
        }
        const token = body.data.token;
        localStorage.setItem(TOKEN_KEY, token);
        applyToken(token);
        setStatus('Signed in as ' + (body.data.user && body.data.user.email || email), true);
      } catch (e) {
        setStatus('Network error — is the API running?', false);
      }
    }

    function logout() {
      localStorage.removeItem(TOKEN_KEY);
      if (window.ui) {
        window.ui.authActions.logout(['Bearer']);
      }
      setStatus('Signed out', false);
    }

    document.getElementById('btn-login').addEventListener('click', login);
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('role-preset').addEventListener('change', function(e) {
      applyRolePreset(e.target.value);
    });
    document.getElementById('password').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') login();
    });

    const TAG_META = [
      { name: 'Guest', description: 'Public marketplace browsing — no login required' },
      { name: 'Customer', description: 'Signed-in shopper — checkout, orders, addresses, reviews' },
      { name: 'Vendor', description: 'Vendor store operations — products, orders, profile' },
      { name: 'Admin', description: 'Platform administration — users, vendors, moderation' },
      { name: 'Payment', description: 'Paystack payments — order checkout, verification, and webhooks' },
      { name: 'Subscription', description: 'Vendor featured listing plans — catalog, checkout, and billing history' },
      { name: 'Authentication', description: 'Login, registration, and password recovery' },
      { name: 'Users', description: 'Profile and account settings (any signed-in role)' },
      { name: 'Upload', description: 'Image uploads' },
    ];

    function collectUsedTags(spec) {
      const used = new Set();
      const paths = spec.paths || {};
      for (const methods of Object.values(paths)) {
        for (const op of Object.values(methods)) {
          if (op && Array.isArray(op.tags)) {
            op.tags.forEach((t) => used.add(t));
          }
        }
      }
      return used;
    }

    function applyTagMeta(spec) {
      const used = collectUsedTags(spec);
      spec.tags = TAG_META.filter((t) => used.has(t.name));
      return spec;
    }

    function initSwagger(spec) {
      window.ui = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout',
        persistAuthorization: true,
        tagsSorter: function(a, b) {
          const ia = TAG_ORDER.indexOf(a);
          const ib = TAG_ORDER.indexOf(b);
          const ra = ia === -1 ? 999 : ia;
          const rb = ib === -1 ? 999 : ib;
          if (ra !== rb) return ra - rb;
          return a.localeCompare(b);
        },
        onComplete: function() {
          const saved = localStorage.getItem(TOKEN_KEY);
          if (saved) {
            applyToken(saved);
            setStatus('Session restored', true);
          }
        }
      });
    }

    fetch('/swagger/swagger.json', { cache: 'no-store' })
      .then((res) => res.json())
      .then((spec) => initSwagger(applyTagMeta(spec)))
      .catch(() => setStatus('Failed to load API docs', false));
  </script>
</body>
</html>
`
