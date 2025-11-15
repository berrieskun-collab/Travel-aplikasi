import React from 'react';
import { ItineraryDay, Activity, GroundingChunk } from '../types';
import Button from './Button';
import NumberInput from './NumberInput'; // Import NumberInput
import GlobeIcon from './GlobeIcon'; // Import GlobeIcon

interface ItineraryCardProps {
  dayData: ItineraryDay;
  groundingSources: GroundingChunk[];
  dayIndex: number; // Added to help identify activities for actual costs
  actualCosts: Record<string, number | null>; // Current actual costs state
  onActualCostChange: (dayIndex: number, activityIndex: number, value: number | null) => void; // Handler for actual cost changes
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({ dayData, groundingSources, dayIndex, actualCosts, onActualCostChange }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <h3 className="text-2xl font-bold text-indigo-700 mb-4 border-b-2 border-indigo-200 pb-2">
        Hari {dayData.day}
      </h3>
      <ul className="space-y-6">
        {dayData.activities.map((activity: Activity, activityIndex: number) => (
          <li key={`day-${dayData.day}-activity-${activityIndex}`} className="border-l-4 border-indigo-400 pl-4 py-2">
            <h4 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              {activity.name}
              <GlobeIcon className="ml-2 w-5 h-5 text-green-500" title="Data real-time diverifikasi" />
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <p className="text-gray-600 mb-1">
                  <span className="font-medium">Jam Buka/Tutup:</span> {activity.hours}
                </p>
                <p className="text-gray-600 mb-3">
                  <span className="font-medium">Estimasi Biaya:</span> {activity.cost}
                </p>
              </div>
              <div className="flex flex-col justify-start">
                <NumberInput
                  id={`actual-cost-day-${dayData.day}-activity-${activityIndex}`}
                  label="Biaya Aktual (IDR/Lokal)" // Use IDR as a general example, user can interpret
                  value={actualCosts[`day-${dayIndex}-activity-${activityIndex}`] ?? ''}
                  onChange={(e) => onActualCostChange(dayIndex, activityIndex, parseFloat(e.target.value) || null)}
                  placeholder="Masukkan biaya aktual"
                  min="0"
                  className="w-full"
                />
              </div>
            </div>
            
            {activity.priceCheckLink && activity.priceCheckLink !== 'N/A' && (
              <Button variant="outline" onClick={() => window.open(activity.priceCheckLink, '_blank')} className="text-sm mt-2">
                Link Cek Harga
              </Button>
            )}
            {activity.priceCheckLink === 'N/A' && (
              <span className="text-sm text-gray-500 italic mt-2 block">Tidak ada link harga spesifik</span>
            )}
          </li>
        ))}
      </ul>

      {/* Display grounding sources related to the entire itinerary */}
      {dayData.day === 1 && groundingSources.length > 0 && (
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h4 className="text-lg font-bold text-gray-700 mb-2">Sumber Informasi:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            {groundingSources.map((source, index) => (
              <li key={`grounding-source-${index}`}>
                {source.web && (
                  <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {source.web.title || source.web.uri}
                  </a>
                )}
                {source.maps && (
                  <a href={source.maps.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {source.maps.title || source.maps.uri} (Maps)
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500 italic">Beberapa sumber mungkin umum untuk keseluruhan rencana perjalanan.</p>
        </div>
      )}
    </div>
  );
};

export default ItineraryCard;