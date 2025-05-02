import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package2, AlertCircle, Calendar, List } from 'lucide-react';
import { useOrders } from '../../../hooks/useOrders';
import { useStore } from '../../../store/StoreContext';
import { getInitialStartDate, getDefaultEndDate } from '../../../utils/dateUtils';
import ProductionList from './ProductionList';
import ProductionCalendar from './ProductionCalendar';
import { RDProduct } from '../../../types/rd-types';
import { Order } from '../../../types/types';
import Beaker from '../../common/BeakerIcon';

type ViewMode = 'list' | 'calendar';

// Function to get R&D products from localStorage
const getRDProductsFromStorage = (): RDProduct[] => {
  try {
    const storedProducts = localStorage.getItem('rd-products-data');
    if (storedProducts) {
      return JSON.parse(storedProducts);
    }
  } catch (error) {
    console.error('Failed to parse stored RD products:', error);
  }
  return [];
};

// Convert RD Product to Production Order format for calendar/list views
const convertRDToProductionFormat = (rdProduct: RDProduct): Order => {
  return {
    id: `rd-${rdProduct.id}`,
    branchId: 'production', // Always assign to production branch
    orderedBy: 'R&D Department',
    orderDate: rdProduct.developmentDate,
    deliveryDate: rdProduct.targetProductionDate || rdProduct.developmentDate,
    productionStartDate: rdProduct.targetProductionDate,
    productionEndDate: rdProduct.targetProductionDate,
    products: [
      {
        productId: rdProduct.id,
        quantity: rdProduct.minOrder || 1,
        producedQuantity: 0
      }
    ],
    status: 'processing',
    createdAt: rdProduct.createdAt,
    updatedAt: rdProduct.updatedAt,
    isRDProduct: true, // Special flag to identify R&D products
    rdProductData: rdProduct // Store original data
  };
};

export default function ProductionSchedule() {
  const { orderId } = useParams();
  const { orders, updateOrderStatus, updateOrderProduction } = useOrders();
  const { products } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [error, setError] = useState<string | null>(null);
  const [rdProducts, setRdProducts] = useState<RDProduct[]>([]);
  const [isLoadingRdProducts, setIsLoadingRdProducts] = useState(false);

  const startDate = getInitialStartDate();
  const endDate = getDefaultEndDate(startDate);

  // Get all non-completed orders that either:
  // 1. Are in the URL parameters (newly selected orders)
  // 2. Have production dates set (already scheduled orders)
  const orderIds = orderId?.split(',') || [];
  const relevantOrders = orders.filter(order => 
    (orderIds.includes(order.id) || (order.productionStartDate && order.productionEndDate)) &&
    order.status !== 'completed'
  );

  // Load R&D products from localStorage
  useEffect(() => {
    const loadRDProducts = async () => {
      setIsLoadingRdProducts(true);
      try {
        // Get products from localStorage
        const products = getRDProductsFromStorage();
        
        // Only keep products with target production dates
        const productsWithDates = products.filter(p => p.targetProductionDate);
        setRdProducts(productsWithDates);
      } catch (err) {
        console.error('Error loading R&D products:', err);
        setError('Failed to load R&D products');
      } finally {
        setIsLoadingRdProducts(false);
      }
    };

    loadRDProducts();
  }, []);

  // Convert RD Products to production orders for display
  const rdProductionOrders = rdProducts
    .filter(product => product.targetProductionDate || product.developmentDate)
    .map(convertRDToProductionFormat);

  // Combine regular orders with RD production orders
  const allProductionOrders = [...relevantOrders, ...rdProductionOrders];

  const handleSchedule = async (orderId: string, startDate: string, endDate: string) => {
    try {
      setError(null);
      
      // Check if this is an R&D product order
      if (orderId.startsWith('rd-')) {
        // For R&D products, we update the localStorage entry
        const rdProductId = orderId.replace('rd-', '');
        const updatedRdProducts = rdProducts.map(product => {
          if (product.id === rdProductId) {
            return {
              ...product,
              targetProductionDate: startDate,
              updatedAt: new Date().toISOString()
            };
          }
          return product;
        });
        
        setRdProducts(updatedRdProducts);
        localStorage.setItem('rd-products-data', JSON.stringify(updatedRdProducts));
        return;
      }
      
      // For regular orders
      await updateOrderProduction(orderId, startDate, endDate);
    } catch (err) {
      console.error('Error scheduling production:', err);
      setError('Failed to schedule production');
      throw err;
    }
  };

  const handleComplete = async (
    orderId: string, 
    producedQuantities: Record<string, number>,
    stockQuantities: Record<string, number>,
    rejectQuantities: Record<string, number>,
    rejectNotes: Record<string, string>
  ) => {
    try {
      setError(null);
      
      // Check if this is an R&D product order
      if (orderId.startsWith('rd-')) {
        // For R&D products, we update the status in localStorage
        const rdProductId = orderId.replace('rd-', '');
        const updatedRdProducts = rdProducts.map(product => {
          if (product.id === rdProductId) {
            return {
              ...product,
              status: 'approved',
              updatedAt: new Date().toISOString()
            };
          }
          return product;
        });
        
        setRdProducts(updatedRdProducts);
        localStorage.setItem('rd-products-data', JSON.stringify(updatedRdProducts));
        return;
      }
      
      // For regular orders
      await updateOrderStatus(
        orderId, 
        'completed', 
        producedQuantities,
        stockQuantities,
        rejectQuantities,
        rejectNotes
      );
    } catch (err) {
      console.error('Error completing order:', err);
      setError('Failed to complete order');
      throw err;
    }
  };

  const handleRemoveFromProduction = async (orderId: string) => {
    try {
      setError(null);
      
      // Check if this is an R&D product order
      if (orderId.startsWith('rd-')) {
        // For R&D products, we remove the target production date
        const rdProductId = orderId.replace('rd-', '');
        const updatedRdProducts = rdProducts.map(product => {
          if (product.id === rdProductId) {
            const { targetProductionDate, ...rest } = product;
            return {
              ...rest,
              updatedAt: new Date().toISOString()
            };
          }
          return product;
        });
        
        setRdProducts(updatedRdProducts);
        localStorage.setItem('rd-products-data', JSON.stringify(updatedRdProducts));
        return;
      }
      
      // For regular orders
      await updateOrderProduction(orderId, '', ''); // Clear production dates
      await updateOrderStatus(orderId, 'pending'); // Reset status to pending
    } catch (err) {
      console.error('Error removing from production:', err);
      setError('Failed to remove from production');
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package2 className="w-6 h-6" />
          Production Schedule
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              viewMode === 'list' 
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg hover:from-pink-700 hover:to-purple-700' 
                : 'text-gray-600 hover:bg-gray-50/80 hover:shadow-sm'
            }`}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              viewMode === 'calendar' 
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg hover:from-pink-700 hover:to-purple-700' 
                : 'text-gray-600 hover:bg-gray-50/80 hover:shadow-sm'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar View
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm">
        {viewMode === 'calendar' ? (
          <ProductionCalendar
            orders={allProductionOrders}
            products={products}
            onScheduleOrder={handleSchedule}
          />
        ) : (
          <ProductionList
            startDate={startDate}
            endDate={endDate}
            orders={allProductionOrders}
            products={products}
            onSchedule={handleSchedule}
            onComplete={handleComplete}
            onRemove={handleRemoveFromProduction}
          />
        )}
      </div>

      {/* R&D Products Section */}
      {rdProducts.length > 0 && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Beaker className="w-5 h-5 text-cyan-700" />
            <span className="text-cyan-800">R&D Products in Production Pipeline</span>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rdProducts.map(product => (
              <div key={product.id} className="bg-white p-4 rounded-lg border border-cyan-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-cyan-900">{product.name}</h4>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 text-cyan-800 font-medium">
                        {product.status}
                      </span>
                    </div>
                    <p className="text-sm text-cyan-700">
                      Target Date: {new Date(product.targetProductionDate || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}