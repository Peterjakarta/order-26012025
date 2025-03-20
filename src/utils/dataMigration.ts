import { 
  collection,
  writeBatch,
  doc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  setDoc
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Interface for the backup data structure
interface BackupData {
  users?: Record<string, any>[];
  categories?: Record<string, any>[];
  products?: Record<string, any>[];
  orders?: Record<string, any>[];
  ingredients?: Record<string, any>[];
  recipes?: Record<string, any>[];
  stock?: Record<string, any>[];
  stock_history?: Record<string, any>[];
  stock_categories?: Record<string, any>[];
  stock_category_items?: Record<string, any>[];
  logs?: Record<string, any>[];
}

export async function importFromJSON(backupData: BackupData) {
  try {
    console.log('Starting data import...');
    
    // Process each collection in sequence
    for (const [collectionName, documents] of Object.entries(backupData)) {
      if (!Array.isArray(documents) || documents.length === 0) {
        console.log(`Skipping empty collection: ${collectionName}`);
        continue;
      }
      
      console.log(`Importing ${collectionName}...`);
      
      // Create batches array to hold all batch operations
      const batches: Promise<void>[] = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      for (const document of documents) {
        const { id, ...data } = document;
        
        if (!id) {
          console.warn('Skipping document without ID');
          continue;
        }

        // Clean up any undefined values
        Object.keys(data).forEach(key => {
          if (data[key] === undefined) delete data[key];
        });

        // Convert any timestamp strings back to server timestamps
        if (data.createdAt) data.createdAt = serverTimestamp();
        if (data.updatedAt) data.updatedAt = serverTimestamp();
        if (data.timestamp) data.timestamp = serverTimestamp();

        // Create document reference
        const docRef = doc(db, collectionName, id);

        // Add to current batch
        currentBatch.set(docRef, data);
        operationCount++;

        // If batch is full, commit it and start a new one
        if (operationCount >= 500) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      }

      // Commit final batch if there are operations
      if (operationCount > 0) {
        batches.push(currentBatch.commit());
      }

      // Wait for all batches to complete for this collection
      if (batches.length > 0) {
        try {
          await Promise.all(batches);
          console.log(`Successfully imported ${documents.length} documents to ${collectionName}`);
        } catch (err) {
          console.error(`Error importing collection ${collectionName}:`, err);
          throw err;
        }
      }
    }

    console.log('Data import completed successfully');
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

export async function validateBackupData(backupData: BackupData): Promise<string[]> {
  const errors: string[] = [];

  // Check for required collections
  const requiredCollections = [
    'users',
    'categories',
    'products',
    'orders',
    'ingredients',
    'recipes',
    'stock'
  ];

  requiredCollections.forEach(collection => {
    if (!backupData[collection]) {
      errors.push(`Missing required collection: ${collection}`);
    }
  });

  // Validate relationships
  if (backupData.products && backupData.categories) {
    const categoryIds = new Set(backupData.categories.map(c => c.id));
    backupData.products.forEach(product => {
      if (!categoryIds.has(product.category)) {
        errors.push(`Invalid category reference in product ${product.id}: ${product.category}`);
      }
    });
  }

  if (backupData.recipes && backupData.ingredients) {
    const ingredientIds = new Set(backupData.ingredients.map(i => i.id));
    backupData.recipes.forEach(recipe => {
      if (!recipe.ingredients) return;
      recipe.ingredients.forEach(ingredient => {
        if (!ingredientIds.has(ingredient.ingredientId)) {
          errors.push(`Invalid ingredient reference in recipe ${recipe.id}: ${ingredient.ingredientId}`);
        }
      });
    });
  }

  return errors;
}

export async function exportCurrentData(): Promise<BackupData> {
  const backup: BackupData = {};
  
  try {
    // Export each collection
    for (const collectionName of Object.values(COLLECTIONS)) {
      console.log(`Exporting ${collectionName}...`);
      
      const q = query(collection(db, collectionName), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      
      backup[collectionName] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    return backup;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}