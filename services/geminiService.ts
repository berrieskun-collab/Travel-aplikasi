import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ItineraryDay, Activity, GroundingChunk } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Function to safely decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Function to decode audio data, if needed for future features. Not used in current text-only app.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export async function generateTravelItinerary(
  destination: string,
  duration: number,
  interests: string
): Promise<{ itinerary: ItineraryDay[]; groundingSources: GroundingChunk[] }> {
  const prompt = `Buatkan saya itinerary perjalanan detail harian untuk ${duration} hari di ${destination} dengan minat utama ${interests}.
Untuk setiap kegiatan, sertakan:
- **Nama Tempat/Aktivitas:** [Nama]
- **Jam Buka/Tutup:** [Jam]
- **Estimasi Biaya:** [Mata uang lokal] [Jumlah] (misal: IDR 50.000, JPY 1000, Gratis)
- **Link Cek Harga:** [URL Placeholder, contoh: https://www.google.com/search?q=Harga+Tiket+Museum+Kyoto atau 'N/A' jika tidak relevan]

Pastikan informasi jam buka/tutup dan estimasi biaya adalah yang paling baru dan akurat, menggunakan informasi real-time jika memungkinkan. Gunakan bahasa Indonesia.
Format respons Anda dengan mengikuti struktur Markdown ini secara ketat:

**Hari 1:**
- **Nama Tempat/Aktivitas:** [Nama Aktivitas 1.1]
  - **Jam Buka/Tutup:** [Jam Buka - Jam Tutup]
  - **Estimasi Biaya:** [Mata Uang Jumlah]
  - **Link Cek Harga:** [URL atau N/A]
- **Nama Tempat/Aktivitas:** [Nama Aktivitas 1.2]
  - **Jam Buka/Tutup:** [Jam Buka - Jam Tutup]
  - **Estimasi Biaya:** [Mata Uang Jumlah]
  - **Link Cek Harga:** [URL atau N/A]

**Hari 2:**
- **Nama Tempat/Aktivitas:** [Nama Aktivitas 2.1]
  - **Jam Buka/Tutup:** [Jam Buka - Jam Tutup]
  - **Estimasi Biaya:** [Mata Uang Jumlah]
  - **Link Cek Harga:** [URL atau N/A]
...
(Lanjutkan untuk semua hari)
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7, // Adjust temperature for more creative or factual responses
        topK: 64,
        topP: 0.95,
      },
    });

    const markdownText = response.text.trim();
    const groundingSources: GroundingChunk[] = [];
    
    // Extract grounding chunks
    const rawGroundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(rawGroundingChunks)) {
      rawGroundingChunks.forEach(chunk => {
        if (chunk.web) {
          groundingSources.push({ web: { uri: chunk.web.uri, title: chunk.web.title } });
        } else if (chunk.maps) {
          groundingSources.push({ maps: { uri: chunk.maps.uri, title: chunk.maps.title } });
        }
      });
    }

    const itinerary: ItineraryDay[] = parseItineraryMarkdown(markdownText);
    return { itinerary, groundingSources };

  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw new Error(`Failed to generate itinerary. Please try again. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseItineraryMarkdown(markdown: string): ItineraryDay[] {
  const itinerary: ItineraryDay[] = [];
  const lines = markdown.split('\n');
  let currentDay: ItineraryDay | null = null;
  let currentActivity: Activity | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Match "Hari X:"
    const dayMatch = trimmedLine.match(/^\*\*Hari (\d+):?\*\*/);
    if (dayMatch) {
      if (currentDay) {
        itinerary.push(currentDay);
      }
      currentDay = { day: parseInt(dayMatch[1], 10), activities: [] };
      currentActivity = null; // Reset activity for a new day
      continue;
    }

    if (!currentDay) continue; // Skip if no day has been identified yet

    // Match "- **Nama Tempat/Aktivitas:** [Name]"
    const nameMatch = trimmedLine.match(/^- \*\*Nama Tempat\/Aktivitas:\*\* (.+)$/);
    if (nameMatch) {
      if (currentActivity) { // If there was a previous activity, push it.
        currentDay.activities.push(currentActivity);
      }
      currentActivity = {
        name: nameMatch[1].trim(),
        hours: 'Tidak tersedia',
        cost: 'Tidak tersedia',
        priceCheckLink: 'N/A',
      };
      continue;
    }

    if (!currentActivity) continue; // Skip if no current activity to add details to

    // Match "- **Jam Buka/Tutup:** [Hours]"
    const hoursMatch = trimmedLine.match(/^- \*\*Jam Buka\/Tutup:\*\* (.+)$/);
    if (hoursMatch) {
      currentActivity.hours = hoursMatch[1].trim();
      continue;
    }

    // Match "- **Estimasi Biaya:** [Cost]"
    const costMatch = trimmedLine.match(/^- \*\*Estimasi Biaya:\*\* (.+)$/);
    if (costMatch) {
      currentActivity.cost = costMatch[1].trim();
      continue;
    }

    // Match "- **Link Cek Harga:** [URL or N/A]"
    const linkMatch = trimmedLine.match(/^- \*\*Link Cek Harga:\*\* (.+)$/);
    if (linkMatch) {
      currentActivity.priceCheckLink = linkMatch[1].trim();
      continue;
    }
  }

  // Push the last currentDay if it exists
  if (currentDay && currentActivity) {
      currentDay.activities.push(currentActivity);
      itinerary.push(currentDay);
  } else if (currentDay) { // Day exists but no activities found or last activity wasn't pushed
      itinerary.push(currentDay);
  }

  return itinerary;
}
