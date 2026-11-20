# FIR – Fill In Right Shoes

Shoe shop website: customer storefront + admin panel + Node/Express backend + Firebase Auth.

## Run it
```bash
npm install
npm run dev          # http://localhost:3000   (shop)
                     # http://localhost:3000/admin.html  (admin)
```
It works immediately in **DEV MODE** (no Firebase needed): on the admin page click **Enter in DEV MODE**.

## Folder structure
```
fir-shoes/
├── package.json
├── .env                      # PORT, ADMIN_EMAILS, WHATSAPP_NUMBER, DB_DRIVER
├── server/                   # BACKEND (Node + Express)
│   ├── index.js              # app entry, routes, static hosting of /client
│   ├── events.js             # live updates (Server-Sent Events)
│   ├── config/firebase.js    # Firebase Admin init (needs serviceAccountKey.json)
│   ├── middleware/auth.js    # verifies Firebase token + admin email
│   ├── db/store.js           # JSON file OR Firestore (DB_DRIVER)
│   ├── routes/products.js    # CRUD + image upload
│   ├── routes/orders.js      # create order → WhatsApp link
│   ├── routes/settings.js    # WhatsApp number, store addresses
│   ├── data/seed.js          # sample products
│   └── uploads/              # uploaded shoe photos
└── client/                   # FRONTEND (plain HTML/CSS/JS)
    ├── index.html            # customer shop
    ├── admin.html            # owner dashboard
    ├── css/style.css, admin.css
    ├── js/api.js             # fetch helper + live events
    ├── js/shop.js            # storefront logic
    ├── js/admin.js           # admin logic + Firebase login
    ├── js/firebase-config.js # ← paste your Firebase web config here
    └── img/                  # placeholder shoe images
```

## Turn on real Firebase login
1. console.firebase.google.com → create project → **Authentication → Sign-in method**: enable Email/Password (+ Google).
2. Authentication → Users → **Add user** (the owner's email + password).
3. Project settings → General → add a **Web app** → copy config into `client/js/firebase-config.js`.
4. Project settings → **Service accounts → Generate new private key** → save as `server/config/serviceAccountKey.json`.
5. In `.env` set `ADMIN_EMAILS=owner@gmail.com`. Restart. Only that email can use the admin.
6. (Optional) store data in Firestore: enable Firestore, set `DB_DRIVER=firestore`.

## Before going live
- Set `WHATSAPP_NUMBER` (or change it in Admin → Settings).
- Uploaded photos live on the server disk; on Render/Railway/Netlify-style hosts disk is wiped, so switch uploads to Cloudinary or Firebase Storage.
- Set `NODE_ENV=production` (disables dev-mode login).
