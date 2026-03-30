import { supabase } from '../lib/supabase';

export interface BackupData {
  timestamp: string;
  version: string;
  data: {
    categories?: any[];
    products?: any[];
    branches?: any[];
    orders?: any[];
    completed_orders?: any[];
    ingredients?: any[];
    recipes?: any[];
    stock_history?: any[];
    logbook?: any[];
    rd_categories?: any[];
    rd_products?: any[];
    approval_forms?: any[];
    document_categories?: any[];
    documents?: any[];
  };
}

export interface BackupFile {
  name: string;
  created_at: string;
  size: number;
  id: string;
}

/**
 * Export all data from the database
 */
async function exportAllData(): Promise<BackupData['data']> {
  const data: BackupData['data'] = {};

  try {
    // Export categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (categories) data.categories = categories;

    // Export products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (products) data.products = products;

    // Export branches
    const { data: branches } = await supabase
      .from('branches')
      .select('*')
      .order('name');
    if (branches) data.branches = branches;

    // Export orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (orders) data.orders = orders;

    // Export completed orders
    const { data: completed_orders } = await supabase
      .from('completed_orders')
      .select('*')
      .order('completed_at', { ascending: false });
    if (completed_orders) data.completed_orders = completed_orders;

    // Export ingredients
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');
    if (ingredients) data.ingredients = ingredients;

    // Export recipes
    const { data: recipes } = await supabase
      .from('recipes')
      .select('*')
      .order('product_id');
    if (recipes) data.recipes = recipes;

    // Export stock history
    const { data: stock_history } = await supabase
      .from('stock_history')
      .select('*')
      .order('created_at', { ascending: false });
    if (stock_history) data.stock_history = stock_history;

    // Export logbook
    const { data: logbook } = await supabase
      .from('logbook')
      .select('*')
      .order('created_at', { ascending: false });
    if (logbook) data.logbook = logbook;

    // Export R&D categories
    const { data: rd_categories } = await supabase
      .from('rd_categories')
      .select('*')
      .order('name');
    if (rd_categories) data.rd_categories = rd_categories;

    // Export R&D products
    const { data: rd_products } = await supabase
      .from('rd_products')
      .select('*')
      .order('name');
    if (rd_products) data.rd_products = rd_products;

    // Export approval forms
    const { data: approval_forms } = await supabase
      .from('approval_forms')
      .select('*')
      .order('created_at', { ascending: false });
    if (approval_forms) data.approval_forms = approval_forms;

    // Export document categories
    const { data: document_categories } = await supabase
      .from('document_categories')
      .select('*')
      .order('name');
    if (document_categories) data.document_categories = document_categories;

    // Export documents
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (documents) data.documents = documents;

    return data;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
}

/**
 * Create a backup and upload to Supabase Storage
 */
export async function createBackup(): Promise<string> {
  try {
    // Export all data
    const data = await exportAllData();

    // Create backup object
    const backup: BackupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data,
    };

    // Convert to JSON
    const jsonData = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.json`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, blob, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload backup: ${uploadError.message}`);
    }

    // Clean up old backups (keep last 30 days)
    await cleanupOldBackups();

    return filename;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<BackupFile[]> {
  try {
    const { data, error } = await supabase.storage
      .from('backups')
      .list('', {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Error listing backups:', error);
      throw new Error(`Failed to list backups: ${error.message}`);
    }

    return (data || []).map((file) => ({
      name: file.name,
      created_at: file.created_at || '',
      size: file.metadata?.size || 0,
      id: file.id,
    }));
  } catch (error) {
    console.error('Error listing backups:', error);
    throw error;
  }
}

/**
 * Download a backup file
 */
export async function downloadBackup(filename: string): Promise<BackupData> {
  try {
    const { data, error } = await supabase.storage
      .from('backups')
      .download(filename);

    if (error) {
      console.error('Download error:', error);
      throw new Error(`Failed to download backup: ${error.message}`);
    }

    const text = await data.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Error downloading backup:', error);
    throw error;
  }
}

/**
 * Delete a backup file
 */
export async function deleteBackup(filename: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('backups')
      .remove([filename]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting backup:', error);
    throw error;
  }
}

/**
 * Clean up backups older than 30 days
 */
export async function cleanupOldBackups(): Promise<number> {
  try {
    const backups = await listBackups();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldBackups = backups.filter((backup) => {
      const backupDate = new Date(backup.created_at);
      return backupDate < thirtyDaysAgo;
    });

    if (oldBackups.length === 0) {
      return 0;
    }

    const filenames = oldBackups.map((b) => b.name);
    const { error } = await supabase.storage
      .from('backups')
      .remove(filenames);

    if (error) {
      console.error('Cleanup error:', error);
      throw new Error(`Failed to cleanup old backups: ${error.message}`);
    }

    return oldBackups.length;
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
    return 0;
  }
}

/**
 * Get the last backup date from localStorage
 */
export function getLastBackupDate(): Date | null {
  const lastBackup = localStorage.getItem('lastBackupDate');
  return lastBackup ? new Date(lastBackup) : null;
}

/**
 * Set the last backup date in localStorage
 */
export function setLastBackupDate(date: Date = new Date()): void {
  localStorage.setItem('lastBackupDate', date.toISOString());
}

/**
 * Check if a backup should be created today
 */
export function shouldBackupToday(): boolean {
  const lastBackup = getLastBackupDate();

  if (!lastBackup) {
    return true;
  }

  const today = new Date();
  const lastBackupDate = new Date(lastBackup);

  // Check if last backup was on a different day
  return (
    today.getDate() !== lastBackupDate.getDate() ||
    today.getMonth() !== lastBackupDate.getMonth() ||
    today.getFullYear() !== lastBackupDate.getFullYear()
  );
}
