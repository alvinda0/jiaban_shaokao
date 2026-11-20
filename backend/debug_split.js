// Test split by amount calculation

const orderGrandTotal = 115500; // Example: Rp 115,500
const orderSubtotal = 100000;
const orderDiscount = 0;

// Split into 2 bills
const splits = [
  { id: '1', label: 'Bill 1', item_ids: [], amount: 57750 },  // Half of grand total
  { id: '2', label: 'Bill 2', item_ids: [], amount: 57750 }
];

const scRule = { rate: 5 };
const pb1Rule = { rate: 10 };

console.log('📋 Order Info:');
console.log(`  Grand Total: ${orderGrandTotal}`);
console.log(`  Subtotal: ${orderSubtotal}`);
console.log(`  Discount: ${orderDiscount}`);

const discountRatio = orderSubtotal > 0 ? orderDiscount / orderSubtotal : 0;
console.log(`\n💸 Discount ratio: ${(discountRatio * 100).toFixed(2)}%`);

splits.forEach((split, i) => {
  console.log(`\n🔍 Split ${i + 1}:`);
  
  const grandTotal = split.amount;
  console.log(`  Input grand_total: ${grandTotal}`);
  
  const subtotalAfterDiscount = Math.round(grandTotal / 1.155);
  console.log(`  Calculated subtotal_after_discount: ${subtotalAfterDiscount}`);
  
  let subtotal = 0;
  if (discountRatio > 0) {
    subtotal = Math.round(subtotalAfterDiscount / (1 - discountRatio));
  } else {
    subtotal = subtotalAfterDiscount;
  }
  console.log(`  Calculated subtotal (before discount): ${subtotal}`);
  
  let bill_discount = 0;
  if (discountRatio > 0) {
    bill_discount = Math.round(subtotal * discountRatio);
  }
  console.log(`  Bill discount: ${bill_discount}`);
  
  const subtotal_after_discount_calc = subtotal - bill_discount;
  console.log(`  Subtotal after discount (calc): ${subtotal_after_discount_calc}`);
  
  let service_charge_total = 0;
  if (scRule) {
    service_charge_total = Math.round((subtotal_after_discount_calc * scRule.rate) / 100);
  }
  console.log(`  Service charge (5%): ${service_charge_total}`);
  
  let tax_total = 0;
  if (pb1Rule) {
    const base_for_pb1 = subtotal_after_discount_calc + service_charge_total;
    tax_total = Math.round((base_for_pb1 * pb1Rule.rate) / 100);
  }
  console.log(`  Tax total (10%): ${tax_total}`);
  
  const grand_total_calc = subtotal_after_discount_calc + service_charge_total + tax_total;
  console.log(`  Calculated grand_total: ${grand_total_calc}`);
  console.log(`  Match input? ${grand_total_calc === grandTotal ? '✓ YES' : '✗ NO'}`);
});
