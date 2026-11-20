#!/usr/bin/env bash
# Creates the empty FIR folder structure. Run:  bash setup-structure.sh
mkdir -p fir-shoes/{server/{config,db,middleware,routes,data,uploads},client/{css,js,img}} && cd fir-shoes
touch package.json .env .gitignore README.md \
  server/{index.js,events.js} server/config/firebase.js server/middleware/auth.js server/db/store.js \
  server/routes/{products,orders,settings}.js server/data/seed.js server/uploads/.gitkeep \
  client/{index.html,admin.html} client/css/{style,admin}.css client/js/{api,shop,admin,firebase-config}.js
echo "Done. Open the folder in VS Code:  code ."
