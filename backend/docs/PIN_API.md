# PIN API Documentation

PIN-based order and item cancellation system. Only Captain and Superuser roles can use PIN functionality.

## Features

- 🔐 6-digit PIN for order cancellations
- 🚫 3 failed attempt lockout (15 minutes)
- 📊 Full order cancellation
- 🛑 Single item cancellation
- ⬇️ Item quantity reduction
- 📝 Cancellation reasons and audit trail
- 📦 Stock restoration on cancellation

---

## Setup

### 1. Add PIN Column to Users Table

Run the migration:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin VARCHAR(6) DEFAULT NULL;
```

### 2. Set User PIN

**Endpoint:** `PUT /api/users/{userId}/pin`

**Authorization:** Captain or Superuser (can set their own); Superuser (can set others)

**Request:**
```json
{
  "pin": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "captain@shaokao.com"
  },
  "message": "PIN updated successfully"
}
```

---

## API Endpoints

### 1. Verify PIN

**Endpoint:** `POST /api/stores/{storeId}/pin`

**Authorization:** Captain, Superuser

**Description:** Verify user's PIN (for UI validation before showing cancellation options)

**Request:**
```json
{
  "orderId": "order-123",
  "pin": "123456"
}
```

**Response (Valid):**
```json
{
  "success": true,
  "data": {
    "verified": true
  },
  "message": "PIN verified successfully"
}
```

**Response (Invalid - 2 attempts remaining):**
```json
{
  "success": false,
  "message": "Invalid PIN. 2 attempt(s) remaining",
  "statusCode": 401
}
```

**Response (Locked):**
```json
{
  "success": false,
  "message": "Account locked. Try again in 123 seconds",
  "statusCode": 429,
  "data": {
    "remainingSeconds": 123
  }
}
```

---

### 2. Cancel Full Order

**Endpoint:** `POST /api/stores/{storeId}/pin/orders/{orderId}/cancel-full`

**Authorization:** Captain, Superuser

**Description:** Void entire order (all items set to void, order marked as void)

**Request:**
```json
{
  "pin": "123456",
  "reason": "Customer changed mind"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "order_number": "INV-2061113.0010",
    "status": "void",
    "items": [
      {
        "id": "item-1",
        "product_name": "Nasi Goreng",
        "qty": 2,
        "status": "void",
        "notes": "[CANCELLED BY CAPTAIN] Customer changed mind"
      }
    ]
  },
  "message": "Order cancelled successfully"
}
```

---

### 3. Cancel Single Item

**Endpoint:** `POST /api/stores/{storeId}/pin/orders/{orderId}/items/{itemId}/cancel`

**Authorization:** Captain, Superuser

**Description:** Void single order item (item status set to void, stock restored)

**Request:**
```json
{
  "pin": "123456",
  "reason": "Wrong item served"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "item-1",
    "product_name": "Nasi Goreng",
    "qty": 2,
    "status": "void",
    "notes": "[CANCELLED BY CAPTAIN] Wrong item served"
  },
  "message": "Item cancelled successfully"
}
```

---

### 4. Reduce Item Quantity

**Endpoint:** `POST /api/stores/{storeId}/pin/orders/{orderId}/items/{itemId}/reduce-qty`

**Authorization:** Captain, Superuser

**Description:** Reduce item quantity (partial cancellation)

**Request:**
```json
{
  "pin": "123456",
  "qtyToRemove": 1,
  "reason": "Customer only wants 1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "item-1",
    "product_name": "Nasi Goreng",
    "qty": 1,
    "line_total": 50000,
    "status": "pending",
    "notes": "[QTY REDUCED by CAPTAIN from 2 to 1] Customer only wants 1"
  },
  "message": "Quantity reduced from 2 to 1"
}
```

---

### 5. Remove User PIN

**Endpoint:** `DELETE /api/users/{userId}/pin`

**Authorization:** Superuser only

**Description:** Remove PIN from user account

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "captain@shaokao.com"
  },
  "message": "PIN removed successfully"
}
```

---

## Error Codes

| Code | Status | Message | Reason |
|------|--------|---------|--------|
| 400 | Bad Request | Order ID and PIN are required | Missing required fields |
| 401 | Unauthorized | Invalid PIN | PIN doesn't match |
| 403 | Forbidden | Unauthorized. Only Captain and Superuser... | User role not authorized |
| 404 | Not Found | Order/Item not found | Invalid order or item ID |
| 429 | Too Many Requests | Account locked... | 3 failed attempts, locked for 15 min |

---

## Usage Flow

### Cancel Full Order Flow

```
1. User clicks "Cancel Order" button
   ↓
2. UI shows PIN input dialog
   ↓
3. User enters PIN and reason
   ↓
4. Frontend calls: POST /stores/{storeId}/pin/orders/{orderId}/cancel-full
   ↓
5. Backend verifies PIN:
   - Check user role (captain/superuser)
   - Verify PIN matches stored PIN
   - Check attempt count
   ↓
6. If valid:
   - Void all order items
   - Restore stock
   - Update order status to 'void'
   - Record cancellation reason in notes
   - Recalculate totals
   ↓
7. Return updated order
```

### Cancel Item Flow

```
1. User clicks "Cancel" on specific item
   ↓
2. UI shows PIN input dialog
   ↓
3. User enters PIN and reason
   ↓
4. Frontend calls: POST /stores/{storeId}/pin/orders/{orderId}/items/{itemId}/cancel
   ↓
5. Backend verifies PIN and cancels item
   ↓
6. Recalculate order totals
   ↓
7. Return updated item
```

### Reduce Quantity Flow

```
1. User clicks "Reduce Qty" on item
   ↓
2. UI shows quantity and PIN input
   ↓
3. User enters new quantity and PIN
   ↓
4. Frontend calls: POST /stores/{storeId}/pin/orders/{orderId}/items/{itemId}/reduce-qty
   ↓
5. Backend verifies PIN and reduces qty
   ↓
6. Restore partial stock
   ↓
7. Recalculate totals
   ↓
8. Return updated item
```

---

## Security Notes

⚠️ **Important**: In production, implement:

1. **Hash PINs** using bcrypt (currently plain text for testing)
2. **Use Redis** for failed attempt tracking (currently in-memory)
3. **Log PIN operations** to audit trail
4. **Rate limit** PIN endpoints globally
5. **Add email notifications** when PIN is changed
6. **Require PIN change** on first login for captain/superuser

---

## Example Frontend Implementation

```javascript
// Verify PIN before showing cancellation dialog
async function verifyPin(orderId, pin) {
  const response = await fetch(`/api/stores/${storeId}/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, pin })
  });
  return response.ok;
}

// Cancel full order
async function cancelFullOrder(orderId, pin, reason) {
  const response = await fetch(
    `/api/stores/${storeId}/pin/orders/${orderId}/cancel-full`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, reason })
    }
  );
  return response.json();
}

// Cancel single item
async function cancelItem(orderId, itemId, pin, reason) {
  const response = await fetch(
    `/api/stores/${storeId}/pin/orders/${orderId}/items/${itemId}/cancel`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, reason })
    }
  );
  return response.json();
}

// Reduce item quantity
async function reduceItemQty(orderId, itemId, pin, qtyToRemove, reason) {
  const response = await fetch(
    `/api/stores/${storeId}/pin/orders/${orderId}/items/${itemId}/reduce-qty`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, qtyToRemove, reason })
    }
  );
  return response.json();
}
```

---

## Testing

```bash
# 1. Set PIN for captain user
curl -X PUT http://localhost:3000/api/users/captain-user-id/pin \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"pin": "123456"}'

# 2. Verify PIN
curl -X POST http://localhost:3000/api/stores/store-123/pin \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-123", "pin": "123456"}'

# 3. Cancel full order
curl -X POST http://localhost:3000/api/stores/store-123/pin/orders/order-123/cancel-full \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"pin": "123456", "reason": "Customer changed mind"}'

# 4. Cancel single item
curl -X POST http://localhost:3000/api/stores/store-123/pin/orders/order-123/items/item-1/cancel \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"pin": "123456", "reason": "Wrong item"}'

# 5. Reduce quantity
curl -X POST http://localhost:3000/api/stores/store-123/pin/orders/order-123/items/item-1/reduce-qty \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"pin": "123456", "qtyToRemove": 1, "reason": "Customer only wants 1"}'
```
