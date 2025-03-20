import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Source project credentials
const sourceCredentials: ServiceAccount = {
  projectId: process.env.SOURCE_PROJECT_ID,
  clientEmail: process.env.SOURCE_CLIENT_EMAIL,
  privateKey: process.env.SOURCE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

// Target project credentials
const targetCredentials: ServiceAccount = {
  projectId: process.env.TARGET_PROJECT_ID,
  clientEmail: process.env.TARGET_CLIENT_EMAIL,
  privateKey: process.env.TARGET_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

// Initialize source and target apps
const sourceApp = initializeApp({ credential: cert(sourceCredentials) }, 'source');
const targetApp = initializeApp({ credential: cert(targetCredentials) }, 'target');

// Get Firestore instances
const sourceDb = getFirestore(sourceApp);
const targetDb = getFirestore(targetApp);

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
  'ingredients',
  'stock',
  'stock_history',
  'stock_categories',
  'stock_category_items'
];

export async function migrateData() {
  try {
    console.log('Starting migration...');
    
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      console.log(`Migrating ${collectionName}...`);
      
      // Get all documents from source collection
      const snapshot = await sourceDb.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`No documents found in ${collectionName}`);
        continue;
      }

      // Create batches for target writes
      const batch = targetDb.batch();
      let operationCount = 0;
      const batches = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const targetRef = targetDb.collection(collectionName).doc(doc.id);
        
        batch.set(targetRef, {
          ...data,
          // Update timestamps
          createdAt: data.createdAt || new Date(),
          updatedAt: new Date()
        });

        operationCount++;

        // Commit batch when it reaches the limit
        if (operationCount >= 500) {
          batches.push(batch.commit());
          operationCount = 0;
        }
      }

      // Commit any remaining operations
      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      // Wait for all batches to complete
      await Promise.all(batches);
      console.log(`Successfully migrated ${snapshot.size} documents in ${collectionName}`);
    }

    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

export async function validateMigration() {
  const results = [];
  
  for (const collectionName of COLLECTIONS_TO_MIGRATE) {
    const sourceSnapshot = await sourceDb.collection(collectionName).get();
    const targetSnapshot = await targetDb.collection(collectionName).get();
    
    results.push({
      collection: collectionName,
      sourceCount: sourceSnapshot.size,
      targetCount: targetSnapshot.size,
      match: sourceSnapshot.size === targetSnapshot.size
    });
  }
  
  return results;
}