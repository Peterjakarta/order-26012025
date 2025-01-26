import React from 'react';

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ defaultValue, className = '', children }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  // Clone children and pass active state
  const enhancedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        activeTab,
        onTabChange: setActiveTab,
      });
    }
    return child;
  });

  return (
    <div className={className}>
      {enhancedChildren}
    </div>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export function TabsList({ children, activeTab, onTabChange }: TabsListProps) {
  // Clone children and pass active state
  const enhancedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        active: activeTab === child.props.value,
        onClick: () => onTabChange?.(child.props.value),
      });
    }
    return child;
  });

  return (
    <div className="flex gap-2 border-b">
      {enhancedChildren}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function TabsTrigger({ value, children, active, onClick }: TabsTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors relative
        ${active 
          ? 'text-pink-600 border-b-2 border-pink-600' 
          : 'text-gray-600 hover:text-gray-900'
        }`}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
}

export function TabsContent({ value, children, activeTab }: TabsContentProps) {
  if (value !== activeTab) return null;
  return <div>{children}</div>;
}