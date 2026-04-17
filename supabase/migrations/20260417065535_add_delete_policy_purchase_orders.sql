/*
  # Add DELETE policy for purchase_orders

  The purchase_orders table was missing a DELETE RLS policy,
  causing delete operations to silently fail. This adds a policy
  consistent with the existing open SELECT/UPDATE/INSERT policies.
*/

CREATE POLICY "Allow delete purchase orders"
  ON purchase_orders
  FOR DELETE
  USING (true);
