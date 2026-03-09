import React from 'react';
import { Mail, MapPin, Edit, History } from 'lucide-react';

// ✅ Generic interface — works for both Supplier and Customer
export interface EntityBase {
  id: number;
  name: string;
  contact: string;
  email: string;
  address: string;
}

interface EntityCardProps<T extends EntityBase> {
  entity: T;
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
  onEdit: (entity: T) => void;
  onViewHistory: (entity: T) => void;
  /** Optional extra content rendered below address (e.g. Supplied Items) */
  extra?: React.ReactNode;
}

export function EntityCard<T extends EntityBase>({
  entity,
  icon,
  iconBgClass,
  iconColorClass,
  onEdit,
  onViewHistory,
  extra,
}: EntityCardProps<T>) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative group">
      {/* Action buttons — visible on hover */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onViewHistory(entity)}
          className="text-blue-600 hover:text-blue-800 p-1"
          title="View History"
        >
          <History className="h-4 w-4" />
        </button>
        <button
          onClick={() => onEdit(entity)}
          className="text-gray-400 hover:text-emerald-600 p-1"
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 ${iconBgClass} ${iconColorClass} rounded-lg`}>
          {icon}
        </div>
        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          ID: {entity.id}
        </span>
      </div>

      {/* Name & contact */}
      <h3 className="text-lg font-bold text-gray-900 mb-1">{entity.name}</h3>
      <p className="text-sm text-gray-500 mb-4">{entity.contact}</p>

      {/* Email & address */}
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{entity.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span>{entity.address}</span>
        </div>
      </div>

      {/* Optional extra slot */}
      {extra}
    </div>
  );
}
