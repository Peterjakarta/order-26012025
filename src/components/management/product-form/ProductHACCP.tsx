import React, { useEffect, useState } from 'react';
import { Package, X, Info } from 'lucide-react';
import type { Product, Recipe } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';

interface ProductHACCPProps {
  product?: Product | null;
  selectedCategory: string;
}

const ALLERGEN_OPTIONS = [
  'Gluten cereals',
  'Crustacean',
  'Egg',
  'Fish',
  'Peanut',
  'Soybean',
  'Milk',
  'Tree nuts',
  'Celery',
  'Mustard',
  'Sesame',
  'Sulphites',
  'Lupin',
  'Molluscs'
];

const ALLERGEN_DETAILS: Record<string, { title: string; items: string[]; notes?: string }> = {
  'Gluten cereals': {
    title: 'Cereals containing gluten',
    items: [
      'Wheat',
      'Rye',
      'Barley',
      'Oats',
      'Spelt',
      'Kamut',
      'Products derived from these (e.g., wheat flour, malt extract, barley malt)'
    ]
  },
  'Crustacean': {
    title: 'Crustaceans',
    items: [
      'Shrimp',
      'Crab',
      'Lobster'
    ],
    notes: 'Rare for chocolate, but included globally'
  },
  'Egg': {
    title: 'Eggs',
    items: [
      'Whole egg',
      'Egg powder',
      'Egg white/albumin'
    ]
  },
  'Fish': {
    title: 'Fish',
    items: [
      'Gelatin from fish (used sometimes in candy, marshmallows)'
    ]
  },
  'Peanut': {
    title: 'Peanuts',
    items: [
      'Peanut paste',
      'Peanut flour',
      'Peanut oil (unrefined)'
    ]
  },
  'Soybean': {
    title: 'Soybeans',
    items: [
      'Soy lecithin (E322)*',
      'Soy flour',
      'Soy protein'
    ],
    notes: '* Note: Soy lecithin must still be declared as potential allergen.'
  },
  'Milk': {
    title: 'Milk',
    items: [
      'Whole milk',
      'Skim milk',
      'Milk powder',
      'Whey',
      'Casein',
      'Butterfat'
    ]
  },
  'Tree nuts': {
    title: 'Tree Nuts',
    items: [
      'Almond',
      'Hazelnut',
      'Cashew',
      'Pistachio',
      'Walnut',
      'Pecan',
      'Macadamia',
      'Brazil nut'
    ],
    notes: 'Important for your chocolate business: pralines, dragees, spreads, gianduja.'
  },
  'Celery': {
    title: 'Celery',
    items: [
      'Celery root',
      'Celery powder',
      'Celery salt'
    ]
  },
  'Mustard': {
    title: 'Mustard',
    items: [
      'Mustard powder',
      'Mustard seeds',
      'Dijon mustard'
    ]
  },
  'Sesame': {
    title: 'Sesame',
    items: [
      'Sesame seeds',
      'Tahini',
      'Sesame oil (unrefined)'
    ]
  },
  'Sulphites': {
    title: 'Sulphites',
    items: [
      'Sulfites > 10 mg/kg',
      'Common in dried fruits, not common in chocolate but still in some inclusions'
    ]
  },
  'Lupin': {
    title: 'Lupin',
    items: [
      'Lupin flour',
      'Lupin protein'
    ]
  },
  'Molluscs': {
    title: 'Molluscs',
    items: [
      'Snails',
      'Mussels',
      'Clams'
    ],
    notes: 'Rare for chocolate'
  }
};

export default function ProductHACCP({ product, selectedCategory }: ProductHACCPProps) {
  const { ingredients, recipes, categories } = useStore();
  const [recipeIngredients, setRecipeIngredients] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(product?.haccp?.allergens || []);
  const [showAllergenInfo, setShowAllergenInfo] = useState(false);

  // Find recipe for this product and extract its ingredients
  useEffect(() => {
    if (product?.id) {
      const productRecipe = recipes.find(r => r.productId === product.id);
      if (productRecipe) {
        const ingredientIds = [
          ...productRecipe.ingredients.map(i => i.ingredientId),
          ...(productRecipe.shellIngredients || []).map(i => i.ingredientId)
        ];
        // Remove duplicates
        const uniqueIngredients = Array.from(new Set(ingredientIds));
        setRecipeIngredients(uniqueIngredients);
      }
    }
  }, [product, recipes]);

  // Generate shelf life options (1-20 weeks + 6, 12, 18, 24 months)
  const shelfLifeOptions = [
    ...Array.from({ length: 20 }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i + 1 === 1 ? 'week' : 'weeks'}` })),
    { value: 26, label: '6 months' },
    { value: 52, label: '12 months' },
    { value: 78, label: '18 months' },
    { value: 104, label: '24 months' }
  ];

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens(prev => {
      if (prev.includes(allergen)) {
        return prev.filter(a => a !== allergen);
      } else {
        return [...prev, allergen];
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
        <Package className="w-5 h-5" />
        <h3>HACCP Management</h3>
      </div>

      {/* Product Information */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium text-gray-900">Product Information</h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="haccp_internalProductionCode" className="block text-sm font-medium text-gray-700">
              Internal Production Code
            </label>
            <input
              type="text"
              id="haccp_internalProductionCode"
              name="haccp_internalProductionCode"
              defaultValue={product?.haccp?.internalProductionCode || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              placeholder="e.g., PRD-001"
            />
          </div>

          <div>
            <label htmlFor="haccp_productCategories" className="block text-sm font-medium text-gray-700">
              Product Categories
            </label>
            <select
              id="haccp_productCategories"
              name="haccp_productCategories"
              defaultValue={product?.haccp?.productCategories || selectedCategory}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">Select Category</option>
              {Object.entries(categories).map(([key, { name }]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="haccp_productDescription" className="block text-sm font-medium text-gray-700">
              Product Description
            </label>
            <textarea
              id="haccp_productDescription"
              name="haccp_productDescription"
              defaultValue={product?.haccp?.productDescription || ''}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              placeholder="Detailed product description for HACCP documentation"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredients
            </label>
            <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
              {recipeIngredients.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 mb-2">
                    Ingredients from recipe (automatically populated):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recipeIngredients.map((ingredientId) => {
                      const ingredient = ingredients.find(i => i.id === ingredientId);
                      return ingredient ? (
                        <span
                          key={ingredientId}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800"
                        >
                          {ingredient.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No recipe found for this product. Create a recipe in Pricing & Recipes to see ingredients here.
                </p>
              )}
            </div>
            <input
              type="hidden"
              name="haccp_ingredients"
              value={JSON.stringify(recipeIngredients)}
            />
          </div>

          <div>
            <label htmlFor="haccp_shelfLifeWeeks" className="block text-sm font-medium text-gray-700">
              Shelf Life
            </label>
            <select
              id="haccp_shelfLifeWeeks"
              name="haccp_shelfLifeWeeks"
              defaultValue={product?.haccp?.shelfLifeWeeks || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">Select shelf life</option>
              {shelfLifeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="haccp_awValue" className="block text-sm font-medium text-gray-700">
              AW Value
            </label>
            <input
              type="text"
              id="haccp_awValue"
              name="haccp_awValue"
              defaultValue={product?.haccp?.awValue || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              placeholder="e.g., 0.85"
            />
          </div>

          <div>
            <label htmlFor="haccp_storageTemperature" className="block text-sm font-medium text-gray-700">
              Storage Temperature
            </label>
            <input
              type="text"
              id="haccp_storageTemperature"
              name="haccp_storageTemperature"
              defaultValue={product?.haccp?.storageTemperature || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              placeholder="e.g., 15-20°C"
            />
          </div>

          <div>
            <label htmlFor="haccp_storageHumidity" className="block text-sm font-medium text-gray-700">
              Storage Humidity
            </label>
            <input
              type="text"
              id="haccp_storageHumidity"
              name="haccp_storageHumidity"
              defaultValue={product?.haccp?.storageHumidity || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              placeholder="e.g., 40-60%"
            />
          </div>
        </div>
      </div>

      {/* Allergen Information */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Allergen Information</h4>
          <button
            type="button"
            onClick={() => setShowAllergenInfo(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-pink-600 hover:bg-pink-50 rounded-md border border-pink-200 transition-colors"
          >
            <Info className="w-4 h-4" />
            View Allergen Details
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Allergens
          </label>
          <div className="space-y-2">
            {ALLERGEN_OPTIONS.map((allergen) => (
              <label
                key={allergen}
                className="flex items-center gap-3 p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedAllergens.includes(allergen)}
                  onChange={() => toggleAllergen(allergen)}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <span className="text-sm">{allergen}</span>
              </label>
            ))}
          </div>

          {selectedAllergens.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Selected Allergens:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedAllergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                  >
                    {allergen}
                    <button
                      type="button"
                      onClick={() => toggleAllergen(allergen)}
                      className="hover:bg-yellow-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <input
            type="hidden"
            name="haccp_allergens"
            value={JSON.stringify(selectedAllergens)}
          />
        </div>
      </div>

      {/* Allergen Information Modal */}
      {showAllergenInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Allergen Information</h3>
              <button
                type="button"
                onClick={() => setShowAllergenInfo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6">
              {ALLERGEN_OPTIONS.map((allergen) => {
                const details = ALLERGEN_DETAILS[allergen];
                if (!details) return null;

                return (
                  <div key={allergen} className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {allergen}
                      </span>
                      <span>{details.title}</span>
                    </h4>
                    <ul className="space-y-1 ml-4">
                      {details.items.map((item, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-pink-500 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    {details.notes && (
                      <p className="mt-3 text-sm text-gray-600 italic bg-blue-50 p-2 rounded border border-blue-100">
                        {details.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t p-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllergenInfo(false)}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Packing Information */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium text-gray-900">Packing Information</h4>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="haccp_innerPackingId" className="block text-sm font-medium text-gray-700">
              Inner Packing
            </label>
            <select
              id="haccp_innerPackingId"
              name="haccp_innerPackingId"
              defaultValue={product?.haccp?.innerPackingId || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">Select Inner Packing</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="haccp_innerPackingHasDoc"
                defaultChecked={product?.haccp?.innerPackingHasDoc || false}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span>Has Documentation</span>
            </label>
          </div>

          <div>
            <label htmlFor="haccp_outerPackingId" className="block text-sm font-medium text-gray-700">
              Outer Packing
            </label>
            <select
              id="haccp_outerPackingId"
              name="haccp_outerPackingId"
              defaultValue={product?.haccp?.outerPackingId || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">Select Outer Packing</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="haccp_outerPackingHasDoc"
                defaultChecked={product?.haccp?.outerPackingHasDoc || false}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span>Has Documentation</span>
            </label>
          </div>

          <div>
            <label htmlFor="haccp_shippingPackingId" className="block text-sm font-medium text-gray-700">
              Shipping Packing
            </label>
            <select
              id="haccp_shippingPackingId"
              name="haccp_shippingPackingId"
              defaultValue={product?.haccp?.shippingPackingId || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">Select Shipping Packing</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="haccp_shippingPackingHasDoc"
                defaultChecked={product?.haccp?.shippingPackingHasDoc || false}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span>Has Documentation</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
