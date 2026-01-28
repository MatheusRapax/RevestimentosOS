#!/bin/bash

# Professionals CRUD API Testing Script
# Tests all endpoints with proper authentication and tenant context

echo "=== Professionals CRUD API Tests ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
API_URL="http://localhost:3000"
EMAIL="matheus@example.com"  # Update with actual user
PASSWORD="password123"        # Update with actual password

echo "Step 1: Health Check"
HEALTH=$(curl -s "$API_URL/health")
echo "Response: $HEALTH"
echo ""

echo "Step 2: Login to get token"
echo "Email: $EMAIL"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "Login Response: $LOGIN_RESPONSE"

# Extract token (adjust based on your response structure)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to get token. Please check credentials.${NC}"
    echo "Available users in database:"
    echo "Run: npx prisma studio"
    exit 1
fi

echo -e "${GREEN}✅ Token obtained${NC}"
echo ""

# Get clinic ID (you'll need to update this)
CLINIC_ID="your-clinic-id-here"  # Update with actual clinic ID

echo "Step 3: List current professionals"
PROFESSIONALS=$(curl -s -X GET "$API_URL/professionals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinic-Id: $CLINIC_ID")

echo "Current Professionals: $PROFESSIONALS"
echo ""

# You'll need a valid user ID to test create
USER_ID="user-id-to-add"  # Update with actual user ID

echo "Step 4: Create new professional"
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/professionals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinic-Id: $CLINIC_ID" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\"}")

echo "Create Response: $CREATE_RESPONSE"
echo ""

echo "Step 5: Test duplicate creation (should return 409)"
DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/professionals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinic-Id: $CLINIC_ID" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\"}")

echo "Duplicate Response: $DUPLICATE_RESPONSE"
echo ""

echo "Step 6: Deactivate professional"
DEACTIVATE_RESPONSE=$(curl -s -X PATCH "$API_URL/professionals/$USER_ID/deactivate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinic-Id: $CLINIC_ID")

echo "Deactivate Response: $DEACTIVATE_RESPONSE"
echo ""

echo "Step 7: Activate professional"
ACTIVATE_RESPONSE=$(curl -s -X PATCH "$API_URL/professionals/$USER_ID/activate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinic-Id: $CLINIC_ID")

echo "Activate Response: $ACTIVATE_RESPONSE"
echo ""

echo "Step 8: Test self-removal protection"
CURRENT_USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
SELF_REMOVE_RESPONSE=$(curl -s -X DELETE "$API_URL/professionals/$CURRENT_USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinic-Id: $CLINIC_ID")

echo "Self-removal Response (should be 403): $SELF_REMOVE_RESPONSE"
echo ""

echo "Step 9: Remove professional (soft delete)"
REMOVE_RESPONSE=$(curl -s -X DELETE "$API_URL/professionals/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinic-Id: $CLINIC_ID")

echo "Remove Response: $REMOVE_RESPONSE"
echo ""

echo "Step 10: Verify professional was soft-deleted (should not appear in list)"
FINAL_LIST=$(curl -s -X GET "$API_URL/professionals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Clinic-Id: $CLINIC_ID")

echo "Final Professionals List: $FINAL_LIST"
echo ""

echo -e "${GREEN}=== Tests Complete ===${NC}"
echo ""
echo "Manual verification needed:"
echo "1. Check Prisma Studio - professional should have active=false"
echo "2. Verify no errors in backend logs"
echo "3. Confirm tenant isolation (try with different clinic ID)"
