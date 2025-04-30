import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package2, AlertCircle, Calendar, List } from 'lucide-react';
import { useOrders } from '../../../hooks/useOrders';
import { useStore } from '../../../store/StoreContext';
import { getInitialStartDate, getDefaultEndDate } from '../../../utils/dateUtils';
import ProductionList from './ProductionList';
import ProductionCalendar from './ProductionCalendar';
import { RDProduct } from '../../../types/rd-types';

type ViewMode = 'list' | 'calendar';

// Mock function to fetch R&D products with target production dates
const fetchRDProductsInProduction = (): Promise<RDProduct[]> => {
  // In a real application, this would be a database call
  // For demo purposes, we'll return some mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'rd-product-1',
          name: 'Ruby Chocolate Pralines',
          category: 'pralines',
          description: 'Premium pralines made with ruby chocolate and raspberry filling',
          unit: 'boxes',
          minOrder: 5,
          price: 32.99,
          showPrice: true,
          showDescription: true,
          showUnit: true,
          showMinOrder: true,
          developmentDate: '2025-01-10',
          targetProductionDate: '2025-07-15',
          status: 'development',
          notes: 'Working on stabilizing the raspberry filling. Need to test shelf life at room temperature.',
          imageUrls: [
            'https://images.unsplash.com/photo-1548907040-4baa42d10919?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHJ1Ynklc2hvY29sYXRlfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60',
          ],
          costEstimate: 15.75,
          createdBy: 'admin',
          createdAt: '2025-01-10T09:30:00Z',
          updatedAt: '2025-01-15T14:20:00Z'
        },
        {
          id: 'rd-product-6',
          name: 'Experimental Whiskey Ganache',
          category: 'rd-category-1', // Experimental Truffles
          description: 'Dark chocolate ganache infused with single malt whiskey',
          unit: 'boxes',
          minOrder: 3,
          price: 45.99,
          showPrice: true,
          showDescription: true,
          showUnit: true,
          showMinOrder: true,
          developmentDate: '2025-01-15',
          targetProductionDate: '2025-03-30',
          status: 'testing',
          notes: 'Testing different whiskey varieties. Need to balance alcohol content for flavor vs shelf stability.',
          imageUrls: [
            'https://images.unsplash.com/photo-1620504600375-4793e85ecbd8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2hvY29sYXRlJTIwZ2FuYWNoZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60'
          ],
          createdBy: 'admin',
          createdAt: '2025-01-15T15:20:00Z',
          updatedAt: '2025-02-05T10:10:00Z'
        }
      ]);
    }, 500);
  });
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

  // Fetch R&D products that have target production dates
  useEffect(() => {
    const loadRDProducts = async () => {
      setIsLoadingRdProducts(true);
      try {
        const products = await fetchRDProductsInProduction();
        setRdProducts(products);
      } catch (err) {
        console.error('Error loading R&D products:', err);
        setError('Failed to load R&D products');
      } finally {
        setIsLoadingRdProducts(false);
      }
    };

    loadRDProducts();
  }, []);

  const handleSchedule = async (orderId: string, startDate: string, endDate: string) => {
    try {
      setError(null);
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
      await updateOrderProduction(orderId, '', ''); // Clear production dates
      await updateOrderStatus(orderId, 'pending'); // Reset status to pending
    } catch (err) {
      console.error('Error removing from production:', err);
      setError('Failed to remove from production');
      throw err;
    }
  };

  // Render R&D products section
  const renderRDProductsSection = () => {
    if (rdProducts.length === 0) return null;

    return (
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-medium mb-4">R&D Products in Production Pipeline</h3>
        <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
          <div className="space-y-4">
            {rdProducts.map(product => (
              <div key={product.id} className="bg-white p-4 rounded-lg border border-cyan-100 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{product.name}</h4>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                      R&D
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Target Production: {new Date(product.targetProductionDate || '').toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => alert('View R&D details - feature coming soon')}
                    className="px-3 py-1.5 text-sm border border-cyan-200 text-cyan-700 rounded-md hover:bg-cyan-50"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
            orders={relevantOrders}
            products={products}
            onScheduleOrder={handleSchedule}
          />
        ) : (
          <ProductionList
            startDate={startDate}
            endDate={endDate}
            orders={relevantOrders}
            products={products}
            onSchedule={handleSchedule}
            onComplete={handleComplete}
            onRemove={handleRemoveFromProduction}
          />
        )}
      </div>

      {/* Render R&D Products in Production Pipeline */}
      {renderRDProductsSection()}
    </div>
  );
}