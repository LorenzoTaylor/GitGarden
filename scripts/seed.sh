#!/usr/bin/env bash
# Seed local dev database with a test user and outfits.
# Requires the server to be running (npm run dev).
#
# Usage:
#   npm run seed          — create test user + outfits
#   npm run reset-db      — drop all data, recreate, re-seed

set -e

API="${API_URL:-http://localhost:3000/api}"

# Load DATABASE_URL from .env if not already set
if [ -z "$DATABASE_URL" ] && [ -f "$(dirname "$0")/../gitgarden-server/.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../gitgarden-server/.env" | grep DATABASE_URL)
fi

# --- reset-db mode ---
if [ "${1}" = "--reset" ]; then
  echo "Resetting database..."
  psql "$DATABASE_URL" <<SQL
TRUNCATE email_verification_tokens CASCADE;
TRUNCATE outfits CASCADE;
TRUNCATE users RESTART IDENTITY CASCADE;
SQL
  echo "Database cleared."
fi

# --- Create test user via signup API ---
echo "Creating test user..."
SIGNUP=$(curl -sf -X POST "$API/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@local.dev","password":"TestPass123!"}' || true)

if echo "$SIGNUP" | grep -q '"token"'; then
  TOKEN=$(echo "$SIGNUP" | sed 's/.*"token":"\([^"]*\)".*/\1/')
  echo "  Created and auto-verified (local dev mode)."
else
  # Already exists — log in instead
  echo "  User already exists, logging in..."
  LOGIN=$(curl -sf -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@local.dev","password":"TestPass123!"}')
  TOKEN=$(echo "$LOGIN" | sed 's/.*"token":"\([^"]*\)".*/\1/')
fi

echo "  username : testuser"
echo "  email    : test@local.dev"
echo "  password : TestPass123!"

# --- Outfit 1: default colorway ---
echo "Creating outfit 1 (default)..."
OUTFIT1=$(curl -sf -X POST "$API/outfit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "clothes": {
      "body":"/assets/Body/body_001.png","head":"/assets/Head/head_001.png",
      "face":"/assets/Face/face_000.png","ears":"/assets/Ears/ears_000.png",
      "horns":"/assets/Horns/horns_000.png","arms":"/assets/Arms/arms_001.png",
      "eyes":"/assets/Eyes/eyes_001.png","eyebrows":"/assets/Eyebrows/eyebrows_000.png",
      "hairA":"/assets/HairA/haira_001.png","hairB":"/assets/HairB/hairb_000.png",
      "hairC":"/assets/HairC/hairc_000.png","hairD":"/assets/HairD/haird_000.png",
      "topA":"/assets/TopA/topa_001.png","topB":"/assets/TopB/topb_000.png",
      "mid":"/assets/Mid/mid_000.png","jacketA":"/assets/JacketA/jacketa_000.png",
      "jacketB":"/assets/JacketB/jacketb_000.png",
      "shoulderA":"/assets/ShoulderA/shouldera_000.png",
      "shoulderB":"/assets/ShoulderB/shoulderb_000.png",
      "bottomA":"/assets/BottomA/bottoma_001.png","bottomB":"/assets/BottomB/bottomb_000.png",
      "shoes":"/assets/Shoes/shoes_001.png","socks":"/assets/Socks/socks_000.png",
      "gloves":"/assets/Gloves/gloves_000.png",
      "accessoryA":"/assets/AccessoryA/accessorya_000.png",
      "accessoryB":"/assets/AccessoryB/accessoryb_000.png",
      "accessoryC":"/assets/AccessoryC/accessoryc_000.png",
      "accessoryD":"/assets/AccessoryD/accessoryd_000.png",
      "backA":"/assets/BackA/backa_000.png","backB":"/assets/BackB/backb_000.png"
    },
    "colors": {
      "skin":"#e8b89d","hair":"#4a3728","face":"#4a3728","eyes":"#3d85c6",
      "horns":"#4a3728","backA":"#2563eb","topA":"#c45c5c","topB":"#8b3a3a",
      "bottomA":"#4a5568","bottomB":"#2d3748","shoes":"#1a1a1a","socks":"#ffffff",
      "gloves":"#654321","jacketA":"#2563eb","jacketB":"#1d4ed8",
      "accessoryA":"#fbbf24","accessoryB":"#f59e0b","accessoryC":"#d97706","accessoryD":"#b45309"
    }
  }')
OUTFIT1_ID=$(echo "$OUTFIT1" | sed 's/.*"id":"\([^"]*\)".*/\1/')
echo "  id: $OUTFIT1_ID"

# --- Outfit 2: dark/purple colorway ---
echo "Creating outfit 2 (dark/purple)..."
OUTFIT2=$(curl -sf -X POST "$API/outfit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "clothes": {
      "body":"/assets/Body/body_001.png","head":"/assets/Head/head_001.png",
      "face":"/assets/Face/face_000.png","ears":"/assets/Ears/ears_000.png",
      "horns":"/assets/Horns/horns_000.png","arms":"/assets/Arms/arms_001.png",
      "eyes":"/assets/Eyes/eyes_001.png","eyebrows":"/assets/Eyebrows/eyebrows_000.png",
      "hairA":"/assets/HairA/haira_001.png","hairB":"/assets/HairB/hairb_000.png",
      "hairC":"/assets/HairC/hairc_000.png","hairD":"/assets/HairD/haird_000.png",
      "topA":"/assets/TopA/topa_001.png","topB":"/assets/TopB/topb_000.png",
      "mid":"/assets/Mid/mid_000.png","jacketA":"/assets/JacketA/jacketa_000.png",
      "jacketB":"/assets/JacketB/jacketb_000.png",
      "shoulderA":"/assets/ShoulderA/shouldera_000.png",
      "shoulderB":"/assets/ShoulderB/shoulderb_000.png",
      "bottomA":"/assets/BottomA/bottoma_001.png","bottomB":"/assets/BottomB/bottomb_000.png",
      "shoes":"/assets/Shoes/shoes_001.png","socks":"/assets/Socks/socks_000.png",
      "gloves":"/assets/Gloves/gloves_000.png",
      "accessoryA":"/assets/AccessoryA/accessorya_000.png",
      "accessoryB":"/assets/AccessoryB/accessoryb_000.png",
      "accessoryC":"/assets/AccessoryC/accessoryc_000.png",
      "accessoryD":"/assets/AccessoryD/accessoryd_000.png",
      "backA":"/assets/BackA/backa_000.png","backB":"/assets/BackB/backb_000.png"
    },
    "colors": {
      "skin":"#c29068","hair":"#1a1a1a","face":"#1a1a1a","eyes":"#4ade80",
      "horns":"#1a1a1a","backA":"#8b5cf6","topA":"#22c55e","topB":"#16a34a",
      "bottomA":"#1a1a1a","bottomB":"#27272a","shoes":"#78350f","socks":"#d1d5db",
      "gloves":"#1a1a1a","jacketA":"#8b5cf6","jacketB":"#7c3aed",
      "accessoryA":"#ec4899","accessoryB":"#db2777","accessoryC":"#be185d","accessoryD":"#9d174d"
    }
  }')
OUTFIT2_ID=$(echo "$OUTFIT2" | sed 's/.*"id":"\([^"]*\)".*/\1/')
echo "  id: $OUTFIT2_ID"

# --- Set outfit 1 as active ---
curl -sf -X PUT "$API/user/current-outfit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"outfit_id\":\"$OUTFIT1_ID\"}" > /dev/null

echo ""
echo "Done! Log in at http://localhost:5173 with:"
echo "  test@local.dev / TestPass123!"
