import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { Order, Product } from '../../../types/types';
import { useBranches } from '../../../hooks/useBranches';
import { getBranchStyles } from '../../../utils/branchStyles';
import Beaker from '../../common/BeakerIcon';

interface ProductionCalendarProps {
  orders: Order[];
  products: Product[];
  onScheduleOrder: (orderId: string, startDate: string, endDate: string) => Promise<void>;
}

export default function ProductionCalendar({ orders, products, onScheduleOrder }: ProductionCalendarProps) {
  const { branches } = useBranches();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDetails, setShowDetails] = useState(true);

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Group orders by date
  const ordersByDate = orders.reduce((acc, order) => {
    if (order.productionStartDate && order.productionEndDate) {
      const start = new Date(order.productionStartDate);
      const end = new Date(order.productionEndDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        if (!acc[dateStr]) {
          acc[dateStr] = [];
        }
        acc[dateStr].push(order);
      }
    } else if (order.isRDProduct && order.rdProductData?.targetProductionDate) {
      // Handle R&D products - show on target production date
      const dateStr = new Date(order.rdProductData.targetProductionDate).toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(order);
    }
    return acc;
  }, {} as Record<string, Order[]>);

  const renderCalendarDays = () => {
    const days = [];
    const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Add month header with gradient background
    days.push(
      <div key="header" className="col-span-7 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-4 mb-6 flex justify-between items-center">
        <button 
          onClick={handlePrevMonth} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-semibold">{monthYear}</h3>
        <button 
          onClick={handleNextMonth} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );

    // Add day names with gradient text
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      days.push(
        <div key={day} className="text-center font-medium bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 py-2">
          {day}
        </div>
      );
    });

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[150px] rounded-lg border border-gray-100" />
      );
    }

    // Add calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = ordersByDate[dateStr] || [];
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`min-h-[150px] p-3 rounded-lg border transition-all duration-300 ${
            isWeekend 
              ? 'bg-gray-50/50 border-gray-100' 
              : 'bg-white border-gray-100'
          } ${
            isToday 
              ? 'ring-2 ring-pink-500 ring-offset-2' 
              : ''
          } ${
            dayOrders.length > 0 
              ? 'hover:shadow-lg transform hover:-translate-y-0.5' 
              : 'hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
              ${isToday 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium shadow-md' 
                : isWeekend 
                  ? 'text-gray-400' 
                  : 'text-gray-700'
              }`}
            >
              {day}
            </span>
            {dayOrders.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium shadow-sm">
                {dayOrders.length}
              </span>
            )}
          </div>
          
          {dayOrders.length > 0 && showDetails && (
            <div className="space-y-2">
              {dayOrders.map(order => {
                // Check if this is an R&D product
                if (order.isRDProduct && order.rdProductData) {
                  return (
                    <div 
                      key={order.id}
                      className="p-2 rounded-lg border border-cyan-200 bg-cyan-50/80 
                        transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md group"
                    >
                      <div className="flex items-center gap-1 font-medium text-sm text-cyan-800 group-hover:opacity-90">
                        <Beaker className="w-3.5 h-3.5" />
                        <span className="truncate">{order.rdProductData.name}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 group-hover:opacity-90">
                          R&D Product
                        </span>
                      </div>
                    </div>
                  );
                }
                
                const branch = branches.find(b => b.id === order.branchId);
                const styles = getBranchStyles(order.branchId);
                
                return (
                  <div 
                    key={order.id}
                    className={`p-2 rounded-lg border ${styles.gradient} ${styles.border} ${styles.shadow} 
                      transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md ${styles.hover} group`}
                  >
                    <div className={`font-medium text-sm ${styles.text} group-hover:opacity-90`}>
                      {branch?.name}
                    </div>
                    <div className="mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-md ${styles.badge} group-hover:opacity-90`}>
                        {order.products.length} product{order.products.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h3 className="font-medium">Production Calendar</h3>
            <div className="flex items-center gap-3">
              {branches.map(branch => {
                const styles = getBranchStyles(branch.id);
                return (
                  <div 
                    key={branch.id} 
                    className={`px-3 py-1.5 text-sm rounded-lg ${styles.gradient} ${styles.border} ${styles.text} 
                      transition-all duration-300 hover:shadow-md transform hover:-translate-y-0.5 ${styles.hover}`}
                  >
                    {branch.name}
                  </div>
                );
              })}
              <div 
                className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 text-cyan-800
                  transition-all duration-300 hover:shadow-md transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-1">
                  <Beaker className="w-3.5 h-3.5" />
                  <span>R&D Products</span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showDetails ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Details
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Details
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 gap-4">
          {renderCalendarDays()}
        </div>
      </div>
    </div>
  );
}