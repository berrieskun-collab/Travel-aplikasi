import React, { useState, useCallback, useMemo } from 'react';
import TextInput from './components/TextInput';
import NumberInput from './components/NumberInput';
import Button from './components/Button';
import LoadingSpinner from './components/LoadingSpinner';
import ItineraryCard from './components/ItineraryCard';
import { generateTravelItinerary } from './services/geminiService';
import { ItineraryDay, GroundingChunk, Activity } from './types';

// Helper to parse cost string into a number
const parseCostToNumber = (costString: string): number => {
  if (costString.toLowerCase().includes('gratis') || costString.toLowerCase().includes('tidak tersedia')) {
    return 0;
  }
  // Extract numbers, potentially with commas/dots as thousands separators
  const numericMatch = costString.match(/(\d[\d\.,]*)/);
  if (numericMatch && numericMatch[1]) {
    // Remove non-digit, non-dot characters, then replace comma with dot for proper parsing
    const cleanedNumber = numericMatch[1].replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(cleanedNumber);
  }
  return 0;
};

const App: React.FC = () => {
  const [destination, setDestination] = useState<string>('');
  const [duration, setDuration] = useState<number>(3);
  const [interests, setInterests] = useState<string>('');
  const [totalBudget, setTotalBudget] = useState<number | ''>(''); // New state for total budget
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [groundingSources, setGroundingSources] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State to hold actual costs, indexed by day and activity index
  const [actualCosts, setActualCosts] = useState<Record<string, number | null>>({});

  const handleActualCostChange = useCallback((dayIndex: number, activityIndex: number, value: number | null) => {
    setActualCosts(prevCosts => ({
      ...prevCosts,
      [`day-${dayIndex}-activity-${activityIndex}`]: value,
    }));
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destination || duration <= 0 || !interests) {
      setError('Harap lengkapi semua bidang yang wajib: Tujuan Wisata, Durasi (Hari), dan Minat Khusus.');
      return;
    }

    setLoading(true);
    setError(null);
    setItinerary([]); // Clear previous itinerary
    setGroundingSources([]); // Clear previous grounding sources
    setActualCosts({}); // Clear actual costs for a new itinerary

    try {
      const { itinerary: generatedItinerary, groundingSources: generatedGroundingSources } = await generateTravelItinerary(
        destination,
        duration,
        interests
      );
      setItinerary(generatedItinerary);
      setGroundingSources(generatedGroundingSources);
    } catch (err: any) {
      console.error("Failed to generate itinerary:", err);
      setError(`Gagal membuat itinerary. Harap coba lagi. Error: ${err.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  }, [destination, duration, interests]);

  // Calculate budget summary whenever itinerary, actualCosts, totalBudget, or duration changes
  const { totalEstimatedCost, totalActualCost, averageDailyBudgetRemaining } = useMemo(() => {
    let currentTotalEstimatedCost = 0;
    let currentTotalActualCost = 0;

    itinerary.forEach((dayData, dayIdx) => {
      dayData.activities.forEach((activity, activityIdx) => {
        // Sum estimated costs
        currentTotalEstimatedCost += parseCostToNumber(activity.cost);

        // Sum actual costs
        const key = `day-${dayIdx}-activity-${activityIdx}`;
        const cost = actualCosts[key];
        if (typeof cost === 'number' && !isNaN(cost)) {
          currentTotalActualCost += cost;
        }
      });
    });

    let avgDailyBudgetRem = null;
    if (typeof totalBudget === 'number' && totalBudget > 0 && duration > 0) {
      const remainingTotalBudget = totalBudget - currentTotalActualCost;
      avgDailyBudgetRem = remainingTotalBudget / duration;
    }

    return {
      totalEstimatedCost: currentTotalEstimatedCost,
      totalActualCost: currentTotalActualCost,
      averageDailyBudgetRemaining: avgDailyBudgetRem,
    };
  }, [itinerary, actualCosts, totalBudget, duration]);


  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <header className="w-full max-w-4xl bg-white shadow-md rounded-lg p-6 mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-indigo-800 mb-2">Al Travel Planner</h1>
        <p className="text-lg text-gray-600">Rencanakan perjalanan impian Anda dengan bantuan AI!</p>
      </header>

      <main className="w-full max-w-4xl">
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Rencanakan Perjalanan Anda</h2>
          <TextInput
            id="destination"
            label="Tujuan Wisata"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Contoh: Kyoto, Jepang"
            required
          />
          <NumberInput
            id="duration"
            label="Durasi (Hari)"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
            min="1"
            max="30"
            required
          />
          <TextInput
            id="interests"
            label="Minat Khusus"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="Contoh: Kuliner dan Sejarah"
            required
          />
          <NumberInput
            id="totalBudget"
            label="Total Budget Anda (Opsional)"
            value={totalBudget}
            onChange={(e) => setTotalBudget(parseFloat(e.target.value) || '')}
            min="0"
            placeholder="Contoh: 1000000 (untuk IDR)"
          />
          <Button
            type="submit"
            className="w-full mt-6"
            disabled={loading}
          >
            {loading ? 'Membuat Itinerary...' : 'Buat Itinerary'}
          </Button>
        </form>

        {loading && <LoadingSpinner />}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-8" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {itinerary.length > 0 && (
          <div className="mt-8">
            <h2 className="text-3xl font-bold text-indigo-800 text-center mb-6">Itinerary Perjalanan Anda</h2>
            {itinerary.map((dayData: ItineraryDay, dayIdx: number) => (
              <ItineraryCard
                key={`day-${dayData.day}`}
                dayData={dayData}
                groundingSources={groundingSources}
                dayIndex={dayIdx}
                actualCosts={actualCosts}
                onActualCostChange={handleActualCostChange}
              />
            ))}

            {/* Budget Summary Section */}
            <div className="bg-white shadow-lg rounded-lg p-6 mt-8 mb-6">
              <h3 className="text-2xl font-bold text-green-700 mb-4 border-b-2 border-green-200 pb-2">
                Ringkasan Budget
              </h3>
              <div className="space-y-3 text-lg">
                <p>
                  <span className="font-semibold">Total Estimasi Biaya Perjalanan:</span>{' '}
                  <span className="text-green-800 font-bold">{totalEstimatedCost.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                </p>
                <p>
                  <span className="font-semibold">Total Biaya Aktual Saat Ini:</span>{' '}
                  <span className="text-blue-800 font-bold">{totalActualCost.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
                </p>
                {typeof totalBudget === 'number' && totalBudget > 0 && (
                  <>
                    <p className="border-t pt-3 mt-3 border-gray-200">
                      <span className="font-semibold">Sisa Budget Total:</span>{' '}
                      <span className={`font-bold ${totalBudget - totalActualCost < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(totalBudget - totalActualCost).toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Sisa Budget Harian Rata-rata:</span>{' '}
                      <span className={`font-bold ${averageDailyBudgetRemaining !== null && averageDailyBudgetRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {averageDailyBudgetRemaining !== null ? averageDailyBudgetRemaining.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 2}) : 'N/A'}
                      </span>
                    </p>
                  </>
                )}
                {(typeof totalBudget !== 'number' || totalBudget <= 0) && (
                  <p className="text-sm text-gray-500 italic border-t pt-3 mt-3 border-gray-200">
                    Masukkan Total Budget Anda untuk melihat Ringkasan Budget yang lebih detail.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;