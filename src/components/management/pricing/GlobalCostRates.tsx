import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Calculator, AlertCircle, DollarSign, Info } from 'lucide-react';
import { 
  loadGlobalCostRates, 
  saveGlobalCostRates, 
  DEFAULT_COST_RATES 
} from '../../../utils/recipeWeightCalculations';

interface GlobalCostRatesProps {
  onSave?: () => void;
  onClose?: () => void;
}

export default function GlobalCostRates({ onSave, onClose }: GlobalCostRatesProps) {
  const [laborCostPerGram, setLaborCostPerGram] = useState<number>(DEFAULT_COST_RATES.laborCostPerGram);
  const [electricityCostPerGram, setElectricityCostPerGram] = useState<number>(DEFAULT_COST_RATES.electricityCostPerGram);
  const [equipmentCostPerGram, setEquipmentCostPerGram] = useState<number>(DEFAULT_COST_RATES.equipmentCostPerGram);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved rates on component mount
  useEffect(() => {
    const savedRates = loadGlobalCostRates();
    setLaborCostPerGram(savedRates.laborCostPerGram);
    setElectricityCostPerGram(savedRates.electricityCostPerGram);
    setEquipmentCostPerGram(savedRates.equipmentCostPerGram);
  }, []);

  const handleSave = () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate cost rates
      if (laborCostPerGram < 0 || electricityCostPerGram < 0 || equipmentCostPerGram < 0) {
        throw new Error('All cost rates must be non-negative');
      }
      
      // Save to localStorage
      saveGlobalCostRates({
        laborCostPerGram,
        electricityCostPerGram,
        equipmentCostPerGram
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      if (onSave) onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cost rates');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLaborCostPerGram(DEFAULT_COST_RATES.laborCostPerGram);
    setElectricityCostPerGram(DEFAULT_COST_RATES.electricityCostPerGram);
    setEquipmentCostPerGram(DEFAULT_COST_RATES.equipmentCostPerGram);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-medium">Global Cost Rates (IDR per gram)</h3>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 bg-green-50 text-green-600 p-4 rounded-lg">
          <Save className="w-5 h-5 flex-shrink-0" />
          <p>Cost rates saved successfully!</p>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">How Weight-Based Calculation Works</p>
            <p>These rates determine overhead costs automatically based on recipe weight:</p>
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li>System calculates total recipe weight in grams</li>
              <li>Multiplies each cost rate by the total weight</li>
              <li>Applies these values to Labor, Electricity, and Equipment costs</li>
              <li>Updates are applied when editing recipes or using batch updates</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label htmlFor="laborCostPerGram" className="block text-sm font-medium text-gray-700">
            Labor Cost per Gram
          </label>
          <div className="relative">
            <input
              type="number"
              id="laborCostPerGram"
              value={laborCostPerGram}
              onChange={(e) => setLaborCostPerGram(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
            />
            <DollarSign className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="electricityCostPerGram" className="block text-sm font-medium text-gray-700">
            Electricity Cost per Gram
          </label>
          <div className="relative">
            <input
              type="number"
              id="electricityCostPerGram"
              value={electricityCostPerGram}
              onChange={(e) => setElectricityCostPerGram(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
            />
            <DollarSign className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="equipmentCostPerGram" className="block text-sm font-medium text-gray-700">
            Equipment Cost per Gram
          </label>
          <div className="relative">
            <input
              type="number"
              id="equipmentCostPerGram"
              value={equipmentCostPerGram}
              onChange={(e) => setEquipmentCostPerGram(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
            />
            <DollarSign className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
        <button
          onClick={handleReset}
          type="button"
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          Reset to Defaults
        </button>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Cost Rates'}
        </button>
      </div>
    </div>
  );
}