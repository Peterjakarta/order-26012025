import { supabase } from '../lib/supabase';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../types/types';

function rowToPO(row: any): PurchaseOrder {
  return {
    id: row.id,
    reference: row.reference ?? '',
    supplier: row.supplier ?? '',
    orderDate: row.order_date ?? '',
    expectedDate: row.expected_date ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status ?? 'draft',
    items: row.items ?? [],
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    closedAt: row.closed_at ?? undefined,
  };
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToPO);
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToPO(data);
}

export async function createPurchaseOrder(
  data: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const { data: row, error } = await supabase
    .from('purchase_orders')
    .insert({
      reference: data.reference,
      supplier: data.supplier,
      order_date: data.orderDate,
      expected_date: data.expectedDate ?? null,
      notes: data.notes ?? null,
      status: data.status,
      items: data.items,
      closed_at: data.closedAt ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return row.id;
}

export async function updatePurchaseOrder(
  id: string,
  data: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>
): Promise<void> {
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };

  if (data.reference !== undefined) patch.reference = data.reference;
  if (data.supplier !== undefined) patch.supplier = data.supplier;
  if (data.orderDate !== undefined) patch.order_date = data.orderDate;
  if (data.expectedDate !== undefined) patch.expected_date = data.expectedDate;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.status !== undefined) patch.status = data.status;
  if (data.items !== undefined) patch.items = data.items;
  if (data.closedAt !== undefined) patch.closed_at = data.closedAt;

  const { error } = await supabase
    .from('purchase_orders')
    .update(patch)
    .eq('id', id);

  if (error) throw error;
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function receiveAgainstPO(
  po: PurchaseOrder,
  receipts: Record<string, number>,
  updateStockLevel: (ingredientId: string, data: { quantity: number; changeType: string }) => Promise<void>,
  currentStockLevels: Record<string, { quantity: number }>
): Promise<PurchaseOrder> {
  const updatedItems: PurchaseOrderItem[] = po.items.map((item) => {
    const received = receipts[item.id] ?? 0;
    return {
      ...item,
      quantityReceived: item.quantityReceived + received,
    };
  });

  const allReceived = updatedItems.every(
    (item) => item.quantityReceived >= item.quantityOrdered
  );
  const anyReceived = updatedItems.some((item) => item.quantityReceived > 0);

  let newStatus: PurchaseOrderStatus = po.status;
  if (allReceived) {
    newStatus = 'received';
  } else if (anyReceived) {
    newStatus = 'partial';
  }

  for (const item of po.items) {
    const unitsToAdd = receipts[item.id] ?? 0;
    if (unitsToAdd <= 0) continue;
    const currentQty = currentStockLevels[item.ingredientId]?.quantity ?? 0;
    await updateStockLevel(item.ingredientId, {
      quantity: currentQty + unitsToAdd,
      changeType: 'receipt',
    });
  }

  const updateData: Partial<PurchaseOrder> = {
    items: updatedItems,
    status: newStatus,
  };
  if (newStatus === 'received') {
    updateData.closedAt = new Date().toISOString();
  }

  await updatePurchaseOrder(po.id, updateData);

  return { ...po, ...updateData, updatedAt: new Date().toISOString() };
}
