import { useState } from 'react';
import { Check, Clock, Package, XCircle } from 'lucide-react';

type OrderStatus = 'pending' | 'processing' | 'paid' | 'void' | 'merged';
type ItemStatus = 'pending' | 'processing' | 'ready' | 'void';

interface OrderStatusButtonProps {
  currentStatus: OrderStatus;
  orderId: string;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  disabled?: boolean;
}

interface ItemStatusButtonProps {
  currentStatus: ItemStatus;
  itemId: string;
  orderId: string;
  onStatusChange: (orderId: string, itemId: string, newStatus: ItemStatus) => Promise<void>;
  disabled?: boolean;
}

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string; color: string; icon: any }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Package },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800', icon: Check },
  { value: 'void', label: 'Void', color: 'bg-red-100 text-red-800', icon: XCircle },
];

const ITEM_STATUS_OPTIONS: { value: ItemStatus; label: string; color: string; icon: any }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Package },
  { value: 'ready', label: 'Ready', color: 'bg-green-100 text-green-800', icon: Check },
  { value: 'void', label: 'Void', color: 'bg-red-100 text-red-800', icon: XCircle },
];

export const OrderStatusButton = ({
  currentStatus,
  orderId,
  onStatusChange,
  disabled = false,
}: OrderStatusButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentOption = ORDER_STATUS_OPTIONS.find((opt) => opt.value === currentStatus);
  const CurrentIcon = currentOption?.icon || Clock;

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === currentStatus || isLoading) return;

    setIsLoading(true);
    try {
      await onStatusChange(orderId, newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          currentOption?.color || 'bg-gray-100 text-gray-800'
        } ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
      >
        <CurrentIcon className="w-4 h-4" />
        {currentOption?.label || currentStatus}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {ORDER_STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = option.value === currentStatus;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={isActive || isLoading}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{option.label}</span>
                    {isActive && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const ItemStatusButton = ({
  currentStatus,
  itemId,
  orderId,
  onStatusChange,
  disabled = false,
}: ItemStatusButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentOption = ITEM_STATUS_OPTIONS.find((opt) => opt.value === currentStatus);
  const CurrentIcon = currentOption?.icon || Clock;

  const handleStatusChange = async (newStatus: ItemStatus) => {
    if (newStatus === currentStatus || isLoading) return;

    setIsLoading(true);
    try {
      await onStatusChange(orderId, itemId, newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update item status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
          currentOption?.color || 'bg-gray-100 text-gray-800'
        } ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        {currentOption?.label || currentStatus}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {ITEM_STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = option.value === currentStatus;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={isActive || isLoading}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      isActive
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{option.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
