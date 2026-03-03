/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Euro, MapPin, Calendar, Home, MessageSquare, Plane, Hotel,
  Sun, ShieldCheck, ArrowRight, Plus, Minus, Loader2, Star,
  CheckCircle2, AlertTriangle, ChevronRight, ExternalLink, Utensils,
  Clock, Lightbulb, Smartphone, Train, Download, Search
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { generateTravelPlan, summarizeAccommodationReviews, getDestinationCountries, type TravelInputs } from './services/travelService';
import { TravelMap } from './components/TravelMap';
import 'leaflet/dist/leaflet.css';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Immagine da screenshot (thum.io) o fallback dinamico (loremflickr)
const getImageUrl = (item: any, keyword: string) => {
  // Se l'IA ha fornito un URL immagine che sembra valido, proviamo a usarlo
  if (item?.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('http')) {
    const url = item.imageUrl.trim();
    const bad = ['source.unsplash.com', 'picsum', 'google.com/imgres', 'gstatic', 'instagram', 'pinterest', 'flickr.com/photos'];
    if (!bad.some((b) => url.includes(b))) return url;
  }

  // Se c'è un sourceUrl o bookingUrl, potremmo usare thum.io, 
  // ma loremflickr è più veloce e visivamente più gradevole per i viaggi
  const kw = encodeURIComponent(keyword.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().slice(0, 60));
  
  // Usiamo un seed basato sul nome per avere immagini consistenti ma diverse tra loro
  const seed = Math.abs(keyword.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)) % 1000;
  
  return `https://loremflickr.com/800/600/${kw},travel/all?lock=${seed}`;
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const target = e.target as HTMLImageElement;
  if (!target.dataset.fallback) {
    target.dataset.fallback = '1';
    const seed = Math.floor(Math.random() * 1000);
    target.src = `https://loremflickr.com/800/600/travel,landscape/all?lock=${seed}`;
  }
};

// Link sicuri: fallback a Google Search, mai 404
const getSafeLink = (url: string | undefined, name: string, destination?: string): string => {
  if (url && typeof url === 'string' && url.startsWith('http')) {
    const trusted = ['wikipedia.org', 'tripadvisor', 'booking.com', 'expedia', 'viator', 'lonelyplanet', 'google.com', 'wikimedia'];
    if (trusted.some((t) => url.includes(t))) return url;
  }
  const query = destination ? `${name} ${destination}` : name;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
};

// ─── LOADING SCREEN ─────────────────────────────────────────────────────────

function LoadingScreen({ step }: { step: string }) {
  return (
    <div className="min-h-screen bg-brand-paper flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {/* Animazione centrale */}
        <div className="relative w-32 h-32 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full border-4 border-brand-accent/20 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-accent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-5xl">
            🌍
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            <h2 className="text-2xl mb-2">{step || 'Pianifico il tuo viaggio...'}</h2>
            <p className="text-brand-ink/50 text-sm font-sans italic">Vagabond AI sta cercando le migliori opzioni per te</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 bg-brand-accent rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── STAR RATING ─────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  const normalized = Math.min(5, value > 5 ? value / 2 : value);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('w-3 h-3', i <= Math.round(normalized) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{value}</span>
    </div>
  );
}

// ─── CARD IMMAGINE CON LINK VERIFICATO ───────────────────────────────────────

interface ImageCardProps {
  item: any;
  imageKeyword: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}

function ImageCard({ item, imageKeyword, href, children, className }: ImageCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('group block bg-white rounded-3xl shadow-sm border border-brand-ink/5 hover:shadow-lg transition-all duration-300 overflow-hidden', className)}
    >
      <div className="h-52 overflow-hidden relative">
        <img
          src={getImageUrl(item, imageKeyword)}
          alt={imageKeyword}
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-brand-accent flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-2.5 h-2.5" /> Apri
        </div>
      </div>
      {children}
    </a>
  );
}

// ─── BADGE CATEGORIA ─────────────────────────────────────────────────────────

function Badge({ children, color = 'default' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    default: 'bg-brand-ink/5 text-brand-ink/60',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md', colors[color] || colors.default)}>
      {children}
    </span>
  );
}

function AccommodationReviewer() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !city) return;
    setLoading(true);
    setError(null);
    try {
      const data = await summarizeAccommodationReviews(name, city);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Errore durante la ricerca delle recensioni.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass p-8 rounded-[2rem] mt-12 print:hidden">
      <h3 className="text-2xl mb-4 flex items-center gap-2">
        <Search className="w-5 h-5 text-brand-accent" /> Analizza recensioni alloggio
      </h3>
      <p className="text-sm text-brand-ink/60 mb-6">
        Inserisci il nome di un alloggio per cercare recensioni su Booking e TripAdvisor.
      </p>
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Nome alloggio (es. Hilton)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-white border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:border-brand-accent outline-none"
          required
        />
        <input
          type="text"
          placeholder="Città (es. Roma)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="flex-1 bg-white border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:border-brand-accent outline-none"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-accent text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Cerca
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border border-brand-ink/5">
          <p className="text-sm leading-relaxed mb-6">{result.summary}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">Punti di forza</h4>
              <ul className="space-y-2">
                {(result.pros || []).map((pro: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <Plus className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-3">Punti deboli</h4>
              <ul className="space-y-2">
                {(result.cons || []).map((con: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <Minus className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-brand-ink/5 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-brand-ink/40 mb-3">Cerca su</h4>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://www.google.com/search?q=booking+${encodeURIComponent(name)}+${encodeURIComponent(city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-brand-ink/5 hover:bg-brand-ink/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
              >
                Booking.com <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`https://www.google.com/search?q=tripadvisor+${encodeURIComponent(name)}+${encodeURIComponent(city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-brand-ink/5 hover:bg-brand-ink/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
              >
                TripAdvisor <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function ResultsView({ plan, inputs, onReset, onModify }: { plan: any; inputs: any; onReset: () => void; onModify: (request: string) => void }) {
  const [modifyText, setModifyText] = useState("");
  const [selectedAccommodations, setSelectedAccommodations] = useState<Record<number, any>>({});
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const heroUrl = getImageUrl({ imageUrl: plan.destinationOverview?.heroImageUrl }, plan.destinationOverview?.title + ' landscape');

  // Costruisci mapPoints aggregando tutti i punti con coordinate valide
  const allMapPoints = [
    ...(plan.mapPoints || []),
    ...(plan.destinationOverview?.attractions || []).map((a: any) => ({
      lat: a.lat, lng: a.lng, label: a.name, type: 'attraction'
    })),
    ...(plan.accommodations || []).flatMap((s: any) =>
      (s.options || []).map((h: any) => ({ lat: h.lat, lng: h.lng, label: h.name, type: 'hotel' }))
    ),
    ...(plan.bestRestaurants || []).map((r: any) => ({ lat: r.lat, lng: r.lng, label: r.name, type: 'restaurant' })),
  ].filter((p: any) => p.lat && p.lng && p.lat !== 0 && p.lng !== 0 && !isNaN(p.lat) && !isNaN(p.lng));

  const handleSaveItinerary = () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    try {
      // Clone the document to modify it for saving
      const clone = document.documentElement.cloneNode(true) as HTMLElement;
      
      // Remove scripts to prevent React hydration issues when opening the static HTML
      const scripts = clone.querySelectorAll('script');
      scripts.forEach(s => s.remove());
      
      // Remove UI elements that shouldn't be in the saved file (like buttons)
      const hiddenElements = clone.querySelectorAll('.print\\:hidden');
      hiddenElements.forEach(e => e.remove());

      // Get the full HTML string
      const htmlContent = "<!DOCTYPE html>\n" + clone.outerHTML;
      
      // Create a Blob and trigger download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `itinerario-${plan.destinationOverview?.title?.toLowerCase().replace(/\s+/g, '-') || 'viaggio'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving HTML:', error);
      alert('Si è verificato un errore durante il salvataggio dell\'itinerario. Riprova.');
    }
  };

  const totalActivitiesCost = (plan.itinerary || []).reduce((sum: number, day: any) => {
    return sum + (day.activities || []).reduce((daySum: number, act: any) => {
      return daySum + ((act.costEstimate || 0) * (inputs.people.adults + inputs.people.children.length));
    }, 0);
  }, 0);

  const totalAccommodationsCost = Object.entries(selectedAccommodations).reduce((sum: number, [stopIndex, hotel]: [string, any]) => {
    const nights = plan.accommodations[parseInt(stopIndex)]?.nights || 1;
    return sum + (hotel.estimatedPricePerNight * nights);
  }, 0);

  const totalFlightCost = selectedFlight ? (selectedFlight.estimatedPrice * (inputs.people.adults + inputs.people.children.length)) : 0;

  const totalCost = totalActivitiesCost + totalAccommodationsCost + totalFlightCost;

  const handleExportExcel = () => {
    try {
      const numPeople = inputs.people.adults + inputs.people.children.length;
      const rows: any[] = [];

      // Aggiungi le righe dell'itinerario
      plan.itinerary?.forEach((day: any) => {
        rows.push({
          'Data / Ora': `Giorno ${day.day} - ${day.title}`,
          'Luogo': '',
          'Attività': '',
          'Durata': '',
          'Costo Stimato': ''
        });

        day.activities?.forEach((act: any) => {
          const actTotal = (act.costEstimate || 0) * numPeople;
          rows.push({
            'Data / Ora': act.time,
            'Luogo': act.location || '-',
            'Attività': act.name || act.description,
            'Durata': act.duration || '-',
            'Costo Stimato': act.costEstimate ? `€${actTotal} (€${act.costEstimate} x ${numPeople} pers.)` : 'Gratis / N.D.'
          });
        });
      });

      // Aggiungi il volo selezionato
      if (selectedFlight) {
        rows.push({
          'Data / Ora': 'Volo Selezionato',
          'Luogo': '-',
          'Attività': `${selectedFlight.airline} (${selectedFlight.route})`,
          'Durata': selectedFlight.duration || '-',
          'Costo Stimato': `€${selectedFlight.estimatedPrice * numPeople} (€${selectedFlight.estimatedPrice} x ${numPeople} pers.)`
        });
      }

      // Aggiungi gli alloggi selezionati
      if (Object.keys(selectedAccommodations).length > 0) {
        rows.push({
          'Data / Ora': 'Alloggi Selezionati',
          'Luogo': '',
          'Attività': '',
          'Durata': '',
          'Costo Stimato': ''
        });

        Object.entries(selectedAccommodations).forEach(([stopIndex, hotel]: [string, any]) => {
          const nights = plan.accommodations[parseInt(stopIndex)]?.nights || 1;
          rows.push({
            'Data / Ora': '-',
            'Luogo': plan.accommodations[parseInt(stopIndex)]?.stopName || '-',
            'Attività': hotel.name,
            'Durata': `${nights} ${nights === 1 ? 'notte' : 'notti'}`,
            'Costo Stimato': `€${hotel.estimatedPricePerNight * nights} (€${hotel.estimatedPricePerNight}/notte)`
          });
        });
      }

      // Aggiungi il totale
      rows.push({
        'Data / Ora': '',
        'Luogo': '',
        'Attività': '',
        'Durata': 'Totale Stimato:',
        'Costo Stimato': `€${totalCost}`
      });

      // Crea il foglio di lavoro e la cartella di lavoro
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Itinerario");

      // Imposta la larghezza delle colonne
      const wscols = [
        { wch: 25 }, // Data / Ora
        { wch: 20 }, // Luogo
        { wch: 50 }, // Attività
        { wch: 15 }, // Durata
        { wch: 25 }  // Costo Stimato
      ];
      worksheet['!cols'] = wscols;

      // Salva il file
      XLSX.writeFile(workbook, `itinerario-${plan.destinationOverview?.title?.toLowerCase().replace(/\s+/g, '-') || 'viaggio'}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Si è verificato un errore durante l\'esportazione in Excel. Riprova.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-paper pb-24" id="pdf-content">
      {/* HERO */}
      <section className="relative h-[85vh] print:h-auto print:min-h-[300px] overflow-hidden">
        <img
          src={heroUrl}
          alt={plan.destinationOverview?.title}
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover print:relative print:max-h-[300px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-brand-paper print:hidden" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent print:hidden" />

        <div className="absolute top-8 left-8 flex gap-4 z-10 print:hidden">
          <button
            onClick={onReset}
            className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white transition-colors shadow-md"
          >
            <ArrowRight className="rotate-180 w-4 h-4" /> Nuova ricerca
          </button>
          <button
            onClick={handleSaveItinerary}
            className="bg-brand-accent text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-brand-accent/90 transition-colors shadow-md"
          >
            <Download className="w-4 h-4" /> Salva Itinerario
          </button>
        </div>

        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 lg:p-24 print:relative print:p-8 print:bg-white">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
            {plan.destinationOverview?.tagline && (
              <p className="text-white/70 print:text-brand-ink/70 text-sm font-sans uppercase tracking-[0.2em] mb-3">
                {plan.destinationOverview.tagline}
              </p>
            )}
            <h1 className="text-7xl md:text-[7rem] text-white print:text-brand-ink leading-none mb-6 drop-shadow-lg print:drop-shadow-none">
              {plan.destinationOverview?.title}
            </h1>
            <p className="text-xl text-white/85 print:text-brand-ink/85 font-serif italic max-w-2xl leading-relaxed">
              {plan.destinationOverview?.description}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pt-4">

        {/* BUDGET WARNING */}
        {plan.budgetWarning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 bg-amber-50 border-2 border-amber-200 p-8 rounded-[2rem] flex items-start gap-5 shadow-sm"
          >
            <div className="p-3 bg-amber-100 rounded-2xl shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h3 className="text-xl font-serif mb-2 text-amber-900">Nota sul budget</h3>
              <p className="text-amber-800 leading-relaxed">{plan.budgetWarning}</p>
            </div>
          </motion.div>
        )}

        {/* ATTRAZIONI */}
        <section className="mb-20">
          <h2 className="text-5xl mb-2">Da vedere</h2>
          <p className="text-brand-ink/50 mb-8 font-sans text-sm">Le attrazioni imperdibili della destinazione</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(plan.destinationOverview?.attractions || []).map((attr: any, i: number) => (
              <motion.a
                key={i}
                href={getSafeLink(attr.sourceUrl, attr.name)}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="group relative bg-white border border-brand-ink/5 p-6 rounded-3xl shadow-sm block hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col h-full">
                  {attr.category && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-2">{attr.category}</span>
                  )}
                  <h3 className="text-2xl text-brand-ink mb-2 leading-tight group-hover:text-brand-accent transition-colors">
                    {attr.name}
                  </h3>
                  <p className="text-brand-ink/70 text-sm leading-relaxed flex-grow">{attr.description}</p>
                  {attr.estimatedVisitTime && (
                    <div className="mt-4 flex items-center gap-1.5 text-brand-ink/50 text-xs">
                      <Clock className="w-3 h-3" /> {attr.estimatedVisitTime}
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-1.5 text-[10px] text-brand-accent font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3 h-3" /> Scopri di più
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </section>

        {/* METEO + SICUREZZA */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">
          {/* Meteo */}
          <div className="glass p-8 rounded-[2rem] lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 rounded-2xl">
                  <Sun className="text-amber-500 w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-3xl">Meteo e stagione</h2>
                  {plan.weatherInfo?.averageTemp && (
                    <p className="text-brand-ink/40 text-sm">{plan.weatherInfo.averageTemp} in media</p>
                  )}
                </div>
              </div>
              <a 
                href={`https://www.google.com/search?q=site:climaeviaggi.it+${encodeURIComponent(plan.destinationOverview?.country || inputs?.destination || plan.destinationOverview?.title || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-4 py-2 rounded-full hover:bg-amber-100 transition-colors"
              >
                Clima e Viaggi <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-brand-ink/80 leading-relaxed mb-6">{plan.weatherInfo?.summary}</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-emerald-50 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 block mb-2">Punti di forza</span>
                <p className="text-sm text-emerald-900 leading-relaxed">{plan.weatherInfo?.pros}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 block mb-2">Da tenere a mente</span>
                <p className="text-sm text-amber-900 leading-relaxed">{plan.weatherInfo?.cons}</p>
              </div>
            </div>
            {plan.weatherInfo?.packingTips && (
              <div className="bg-blue-50 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 block mb-2">Cosa mettere in valigia</span>
                <p className="text-sm text-blue-900 leading-relaxed">{plan.weatherInfo.packingTips}</p>
              </div>
            )}
          </div>

          {/* Sicurezza */}
          <div className="glass p-8 rounded-[2rem]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <ShieldCheck className="text-emerald-600 w-6 h-6" />
                </div>
                <h2 className="text-3xl">Sicurezza</h2>
              </div>
              <a 
                href={`https://www.google.com/search?q=site:viaggiaresicuri.it+${encodeURIComponent(plan.destinationOverview?.country || inputs?.destination || plan.destinationOverview?.title || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 transition-colors"
              >
                Viaggiare Sicuri <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {plan.safetyAndHealth?.safetyLevel && (
              <div className="mb-4">
                <Badge color={plan.safetyAndHealth.safetyLevel === 'Alto' ? 'green' : plan.safetyAndHealth.safetyLevel === 'Basso' ? 'red' : 'amber'}>
                  Livello {plan.safetyAndHealth.safetyLevel}
                </Badge>
              </div>
            )}
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-1">Avvertenze</p>
                <p className="text-brand-ink/80 leading-relaxed">{plan.safetyAndHealth?.safetyWarnings}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-1">Vaccinazioni</p>
                <p className="text-brand-ink/80 leading-relaxed">{plan.safetyAndHealth?.vaccinationsRequired}</p>
              </div>
              {plan.safetyAndHealth?.emergencyNumbers && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-1">Numeri utili</p>
                  <p className="text-brand-ink/80 leading-relaxed">{plan.safetyAndHealth.emergencyNumbers}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* BUDGET BREAKDOWN */}
        <section className="glass p-8 md:p-12 rounded-[2rem] mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-brand-accent/10 rounded-2xl">
              <Euro className="text-brand-accent w-6 h-6" />
            </div>
            <div>
              <h2 className="text-4xl">Budget stimato</h2>
              <p className="text-brand-ink/40 text-sm">Stime basate sui prezzi medi del periodo</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Voli', icon: Plane, key: 'flights', color: 'bg-blue-50 text-blue-600' },
              { label: 'Alloggi', icon: Hotel, key: 'accommodation', color: 'bg-purple-50 text-purple-600' },
              { label: 'Attività', icon: MapPin, key: 'activities', color: 'bg-green-50 text-green-600' },
              { label: 'Cibo', icon: Utensils, key: 'food', color: 'bg-orange-50 text-orange-600' },
              { label: 'Trasporti', icon: Train, key: 'transport', color: 'bg-cyan-50 text-cyan-600' },
              { label: 'Extra', icon: Euro, key: 'misc', color: 'bg-gray-50 text-gray-600' },
            ].map((item) => (
              <div key={item.key} className={cn('p-5 rounded-2xl text-center', item.color.split(' ')[0])}>
                <item.icon className={cn('w-5 h-5 mx-auto mb-2', item.color.split(' ')[1])} />
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="text-xl font-bold text-gray-800">€{plan.budgetBreakdown?.[item.key] ?? '—'}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-6 border-t border-brand-ink/10">
            <span className="text-2xl font-serif italic text-brand-ink/60">Totale stimato</span>
            <div className="text-right">
              <span className="text-4xl font-bold text-brand-accent">€{plan.budgetBreakdown?.totalEstimated}</span>
              {plan.budgetBreakdown?.perPersonPerDay && (
                <p className="text-xs text-brand-ink/40 mt-1">≈ €{plan.budgetBreakdown.perPersonPerDay} / persona / giorno</p>
              )}
            </div>
          </div>
        </section>

        {/* ITINERARIO */}
        <section className="mb-20">
          <h2 className="text-5xl mb-2">Il tuo itinerario</h2>
          <p className="text-brand-ink/50 mb-12 font-sans text-sm">Ogni giornata pensata per vivere la destinazione in modo autentico</p>

          <div className="space-y-16">
            {(plan.itinerary || []).map((day: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative pl-8 md:pl-20"
              >
                <div className="absolute left-0 top-0 bottom-0 w-px bg-brand-ink/10" />
                <div className="absolute left-[-8px] top-2 w-4 h-4 rounded-full bg-brand-accent ring-4 ring-brand-paper" />

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">
                      Giorno {day.day}
                    </span>
                    {day.theme && <Badge>{day.theme}</Badge>}
                  </div>
                  <h3 className="text-4xl">{day.title}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(day.activities || []).map((act: any, j: number) => (
                    <a
                      key={j}
                      href={getSafeLink(act.sourceUrl, act.name || act.description, plan.destinationOverview?.title || inputs?.destination)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-white rounded-3xl border border-brand-ink/5 p-6 hover:shadow-md transition-all block"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-brand-paper px-2 py-0.5 rounded-md text-brand-ink/60">{act.time}</span>
                          {act.duration && (
                            <span className="text-xs text-brand-ink/40 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {act.duration}
                            </span>
                          )}
                        </div>
                        {act.costEstimate !== undefined && (
                          <span className="text-sm font-bold text-brand-accent">
                            {act.costEstimate === 0 ? 'Gratis' : `€${act.costEstimate}`}
                          </span>
                        )}
                      </div>
                      {act.name && <h4 className="text-lg font-serif mb-2 leading-tight group-hover:text-brand-accent transition-colors">{act.name}</h4>}
                      <p className="text-brand-ink/70 text-sm leading-relaxed">{act.description}</p>
                      
                      {(act.transport || act.travelTime) && (
                        <div className="mt-4 pt-4 border-t border-brand-ink/5 flex flex-wrap gap-3">
                          {act.transport && (
                            <div className="flex items-center gap-1.5 text-xs text-brand-ink/50">
                              <Train className="w-3.5 h-3.5" /> {act.transport}
                            </div>
                          )}
                          {act.travelTime && (
                            <div className="flex items-center gap-1.5 text-xs text-brand-ink/50">
                              <Clock className="w-3.5 h-3.5" /> {act.travelTime}
                            </div>
                          )}
                        </div>
                      )}

                      {act.tips && (
                        <div className="mt-3 flex items-start gap-2 bg-amber-50 p-3 rounded-xl">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800 leading-relaxed">{act.tips}</p>
                        </div>
                      )}
                      <div className="mt-4 flex items-center gap-1.5 text-[10px] text-brand-accent font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-3 h-3" /> Verifica sul web
                      </div>
                    </a>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* MAPPA INTERATTIVA */}
        {allMapPoints.length > 0 && (
          <section className="mb-20">
            <h2 className="text-5xl mb-2">Mappa dell'itinerario</h2>
            <p className="text-brand-ink/50 mb-8 font-sans text-sm">
              {allMapPoints.length} punti di interesse — la linea tratteggiata mostra il percorso suggerito
            </p>
            <div className="rounded-[2rem] overflow-hidden shadow-xl border border-brand-ink/5">
              <TravelMap points={allMapPoints} destination={plan.destinationOverview?.title || ''} />
            </div>
          </section>
        )}

        {/* VOLI */}
        <section className="mb-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-4xl mb-2 flex items-center gap-3">
                <Plane className="w-7 h-7" /> Voli suggeriti
              </h2>
              <p className="text-brand-ink/50 font-sans text-sm">Prezzi indicativi — verifica disponibilità sulle piattaforme di prenotazione</p>
            </div>
            <a
              href={`https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(inputs?.destination || plan.destinationOverview?.title || '')}%20from%20${encodeURIComponent(inputs?.departureCity || '')}%20on%20${inputs?.startDate || ''}%20through%20${inputs?.endDate || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-6 py-3 rounded-full font-bold text-sm hover:bg-blue-100 transition-colors"
            >
              Cerca su Google Flights <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(plan.flights || []).map((flight: any, i: number) => (
              <div
                key={i}
                className={cn("glass p-7 rounded-3xl hover:shadow-md transition-all group block relative",
                  selectedFlight?.airline === flight.airline && selectedFlight?.route === flight.route ? "border-brand-accent ring-2 ring-brand-accent/20" : ""
                )}
              >
                {selectedFlight?.airline === flight.airline && selectedFlight?.route === flight.route && (
                  <div className="absolute top-4 right-4 bg-brand-accent text-white p-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-xl">{flight.airline}</p>
                    <p className="text-brand-ink/50 text-sm mt-0.5">{flight.route}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-brand-accent">€{flight.estimatedPrice * (inputs.people.adults + inputs.people.children.length)}</p>
                    <p className="text-xs text-brand-ink/40">€{flight.estimatedPrice} x {inputs.people.adults + inputs.people.children.length} pers.</p>
                    {flight.duration && <p className="text-xs text-brand-ink/40 mt-1">{flight.duration}</p>}
                  </div>
                </div>
                {(flight.options || []).length > 0 && (
                  <ul className="space-y-1.5 mt-4 pt-4 border-t border-brand-ink/5">
                    {flight.options.map((opt: string, j: number) => (
                      <li key={j} className="text-sm text-brand-ink/60 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-brand-accent shrink-0" /> {opt}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 flex items-center justify-between pt-4 border-t border-brand-ink/5">
                  <a 
                    href={getSafeLink(flight.bookingUrl, flight.airline + ' ' + flight.route)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs font-bold uppercase tracking-widest text-brand-accent hover:underline flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3 h-3" /> Cerca voli
                  </a>
                  <button 
                    onClick={() => setSelectedFlight(flight)}
                    className={cn("text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-colors",
                      selectedFlight?.airline === flight.airline && selectedFlight?.route === flight.route ? "bg-brand-accent text-white" : "bg-brand-paper hover:bg-brand-ink/5"
                    )}
                  >
                    {selectedFlight?.airline === flight.airline && selectedFlight?.route === flight.route ? 'Scelto' : 'Scegli'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ALLOGGI */}
        <section className="mb-20">
          <h2 className="text-4xl mb-2 flex items-center gap-3">
            <Hotel className="w-7 h-7" /> Alloggi consigliati
          </h2>
          <p className="text-brand-ink/50 mb-10 font-sans text-sm">Strutture selezionate in base alle tue preferenze</p>
          <div className="space-y-14">
            {(plan.accommodations || []).map((stop: any, i: number) => (
              <div key={i}>
                <h3 className="text-2xl mb-6 text-brand-accent italic flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> {stop.stopName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(stop.options || []).map((hotel: any, j: number) => (
                    <div
                      key={j}
                      className={cn("group block bg-white rounded-3xl shadow-sm border p-6 hover:shadow-md transition-all duration-300 relative", 
                        selectedAccommodations[i]?.name === hotel.name ? "border-brand-accent ring-2 ring-brand-accent/20" : "border-brand-ink/5"
                      )}
                    >
                      {selectedAccommodations[i]?.name === hotel.name && (
                        <div className="absolute top-4 right-4 bg-brand-accent text-white p-1 rounded-full">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-lg font-serif leading-tight group-hover:text-brand-accent transition-colors pr-2">
                          {hotel.name}
                        </h4>
                        {hotel.stars && (
                          <div className="flex shrink-0">
                            {Array.from({ length: hotel.stars }).map((_, k) => (
                              <Star key={k} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-brand-ink/40 uppercase tracking-widest mb-3">{hotel.type}</p>
                      {hotel.rating && <StarRating value={hotel.rating} />}
                      {hotel.address && (
                        <p className="text-xs text-brand-ink/40 mt-2 flex items-start gap-1">
                          <MapPin className="w-3 h-3 shrink-0 mt-0.5" /> {hotel.address}
                        </p>
                      )}
                      <p className="text-sm text-brand-ink/60 mt-3 italic leading-relaxed line-clamp-2">
                        "{hotel.reviewSummary}"
                      </p>
                      {(hotel.amenities || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {hotel.amenities.slice(0, 3).map((a: string, k: number) => (
                            <Badge key={k}>{a}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-4 mt-4 border-t border-brand-ink/5">
                        <div>
                          <span className="text-xs text-brand-ink/40 block">per notte</span>
                          <span className="font-bold text-lg">€{hotel.estimatedPricePerNight}</span>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href={getSafeLink(hotel.bookingUrl, hotel.name + ' hotel')} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs font-bold uppercase tracking-widest text-brand-accent hover:underline flex items-center"
                          >
                            Vedi
                          </a>
                          <button 
                            onClick={() => setSelectedAccommodations(prev => ({ ...prev, [i]: hotel }))}
                            className={cn("text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors",
                              selectedAccommodations[i]?.name === hotel.name ? "bg-brand-accent text-white" : "bg-brand-paper hover:bg-brand-ink/5"
                            )}
                          >
                            {selectedAccommodations[i]?.name === hotel.name ? 'Scelto' : 'Scegli'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <AccommodationReviewer />
        </section>

        {/* RISTORANTI */}
        {plan.bestRestaurants?.length > 0 && (
          <section className="mb-20">
            <h2 className="text-4xl mb-2 flex items-center gap-3">
              <Utensils className="w-7 h-7" /> Dove mangiare
            </h2>
            <p className="text-brand-ink/50 mb-10 font-sans text-sm">Ristoranti locali autentici, selezionati per qualità e genuinità</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {plan.bestRestaurants.map((rest: any, i: number) => (
                <a
                  key={i}
                  href={getSafeLink(rest.sourceUrl, rest.name + ' ristorante')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white rounded-3xl shadow-sm border border-brand-ink/5 p-6 hover:shadow-md transition-all duration-300"
                >
                  <h4 className="text-lg font-serif mb-0.5 group-hover:text-brand-accent transition-colors">{rest.name}</h4>
                  <p className="text-[10px] text-brand-ink/40 uppercase tracking-widest mb-3">{rest.cuisineType}</p>
                  {rest.rating && <StarRating value={rest.rating} />}
                  {rest.address && (
                    <p className="text-xs text-brand-ink/40 mt-2 flex items-start gap-1">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" /> {rest.address}
                    </p>
                  )}
                  <p className="text-sm text-brand-ink/60 mt-3 italic leading-relaxed line-clamp-2">
                    "{rest.reviewSummary}"
                  </p>
                  {rest.mustTry && (
                    <div className="mt-3 bg-orange-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-0.5">Da provare</p>
                      <p className="text-xs text-orange-800">{rest.mustTry}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-brand-ink/5">
                    <span className="text-xs text-brand-ink/40">Fascia di prezzo</span>
                    <span className="font-bold">{rest.priceRange}</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* CONSIGLI LOCALI + TRASPORTI */}
        {(plan.localTips?.length > 0 || plan.transportInfo) && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20">
            {plan.localTips?.length > 0 && (
              <div className="glass p-8 rounded-[2rem]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-yellow-50 rounded-2xl">
                    <Lightbulb className="w-6 h-6 text-yellow-500" />
                  </div>
                  <h2 className="text-3xl">Consigli locali</h2>
                </div>
                <ul className="space-y-4">
                  {plan.localTips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-brand-ink/80 text-sm leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.transportInfo && (
              <div className="glass p-8 rounded-[2rem]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-cyan-50 rounded-2xl">
                    <Train className="w-6 h-6 text-cyan-600" />
                  </div>
                  <h2 className="text-3xl">Come muoversi</h2>
                </div>
                <p className="text-brand-ink/80 leading-relaxed mb-6 text-sm">{plan.transportInfo.localTransport}</p>
                {plan.transportInfo.bestApps?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 mb-3 flex items-center gap-2">
                      <Smartphone className="w-3 h-3" /> App consigliate
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plan.transportInfo.bestApps.map((app: string, i: number) => (
                        <Badge key={i} color="blue">{app}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {plan.transportInfo.estimatedLocalCost && (
                  <p className="mt-4 text-sm text-brand-ink/60 border-t border-brand-ink/5 pt-4">
                    Costo locale stimato: <strong>{plan.transportInfo.estimatedLocalCost}</strong>
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* TABELLA RIASSUNTIVA ITINERARIO */}
        {plan.itinerary && plan.itinerary.length > 0 && (
          <section className="mb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-4xl flex items-center gap-3">
                <Calendar className="w-7 h-7" /> Riassunto Itinerario
              </h2>
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center justify-center gap-2 bg-green-50 text-green-600 px-6 py-3 rounded-full font-bold text-sm hover:bg-green-100 transition-colors print:hidden"
              >
                <Download className="w-4 h-4" /> Esporta in Excel
              </button>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-brand-ink/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-paper/50 border-b border-brand-ink/5 text-[10px] uppercase tracking-widest text-brand-ink/40">
                      <th className="p-4 font-bold whitespace-nowrap">Data / Ora</th>
                      <th className="p-4 font-bold">Luogo</th>
                      <th className="p-4 font-bold">Attività</th>
                      <th className="p-4 font-bold whitespace-nowrap">Durata</th>
                      <th className="p-4 font-bold whitespace-nowrap text-right">Costo Stimato</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {plan.itinerary.map((day: any, i: number) => (
                      <React.Fragment key={i}>
                        <tr className="bg-brand-paper/20">
                          <td colSpan={5} className="p-3 font-serif font-medium text-brand-accent border-y border-brand-ink/5">
                            Giorno {day.day} - {day.title}
                          </td>
                        </tr>
                        {day.activities?.map((act: any, j: number) => {
                          const numPeople = inputs.people.adults + inputs.people.children.length;
                          const actTotal = (act.costEstimate || 0) * numPeople;
                          return (
                            <tr key={`${i}-${j}`} className="border-b border-brand-ink/5 last:border-0 hover:bg-brand-paper/30 transition-colors">
                              <td className="p-4 text-brand-ink/60 whitespace-nowrap font-mono text-xs">{act.time}</td>
                              <td className="p-4 text-brand-ink/60 whitespace-nowrap">{act.location || '-'}</td>
                              <td className="p-4 font-medium">{act.name || act.description}</td>
                              <td className="p-4 text-brand-ink/60 whitespace-nowrap">{act.duration || '-'}</td>
                              <td className="p-4 text-right font-medium whitespace-nowrap">
                                {act.costEstimate ? (
                                  <>
                                    €{actTotal} <span className="text-xs text-brand-ink/40 font-normal">(€{act.costEstimate} x {numPeople} pers.)</span>
                                  </>
                                ) : 'Gratis / N.D.'}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {selectedFlight && (
                      <>
                        <tr className="bg-brand-paper/20">
                          <td colSpan={5} className="p-3 font-serif font-medium text-brand-accent border-y border-brand-ink/5">
                            Volo Selezionato
                          </td>
                        </tr>
                        <tr className="border-b border-brand-ink/5 last:border-0 hover:bg-brand-paper/30 transition-colors">
                          <td className="p-4 text-brand-ink/60 whitespace-nowrap font-mono text-xs">-</td>
                          <td className="p-4 text-brand-ink/60 whitespace-nowrap">-</td>
                          <td className="p-4 font-medium">
                            {selectedFlight.airline} <span className="text-xs text-brand-ink/40 font-normal">({selectedFlight.route})</span>
                          </td>
                          <td className="p-4 text-brand-ink/60 whitespace-nowrap">{selectedFlight.duration || '-'}</td>
                          <td className="p-4 text-right font-medium whitespace-nowrap">
                            €{selectedFlight.estimatedPrice * (inputs.people.adults + inputs.people.children.length)} <span className="text-xs text-brand-ink/40 font-normal">(€{selectedFlight.estimatedPrice} x {inputs.people.adults + inputs.people.children.length} pers.)</span>
                          </td>
                        </tr>
                      </>
                    )}
                    {Object.keys(selectedAccommodations).length > 0 && (
                      <>
                        <tr className="bg-brand-paper/20">
                          <td colSpan={5} className="p-3 font-serif font-medium text-brand-accent border-y border-brand-ink/5">
                            Alloggi Selezionati
                          </td>
                        </tr>
                        {Object.entries(selectedAccommodations).map(([stopIndex, hotel]: [string, any]) => {
                          const nights = plan.accommodations[parseInt(stopIndex)]?.nights || 1;
                          return (
                            <tr key={`hotel-${stopIndex}`} className="border-b border-brand-ink/5 last:border-0 hover:bg-brand-paper/30 transition-colors">
                              <td className="p-4 text-brand-ink/60 whitespace-nowrap font-mono text-xs">-</td>
                              <td className="p-4 text-brand-ink/60 whitespace-nowrap">{plan.accommodations[parseInt(stopIndex)]?.stopName}</td>
                              <td className="p-4 font-medium">
                                {hotel.name}
                              </td>
                              <td className="p-4 text-brand-ink/60 whitespace-nowrap">{nights} {nights === 1 ? 'notte' : 'notti'}</td>
                              <td className="p-4 text-right font-medium whitespace-nowrap">
                                €{hotel.estimatedPricePerNight * nights} <span className="text-xs text-brand-ink/40 font-normal">(€{hotel.estimatedPricePerNight}/notte)</span>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-brand-ink/5 border-t-2 border-brand-ink/10">
                      <td colSpan={4} className="p-4 text-right font-serif font-bold text-lg">
                        Totale Stimato:
                      </td>
                      <td className="p-4 text-right font-bold text-xl text-brand-accent whitespace-nowrap">
                        €{totalCost}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TRAVEL BLOGS */}
        {plan.travelBlogs && plan.travelBlogs.length > 0 && (
          <section className="mb-20">
            <h2 className="text-5xl mb-2">Ispirazioni</h2>
            <p className="text-brand-ink/50 mb-8 font-sans text-sm">Articoli e blog di viaggio per approfondire</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {plan.travelBlogs.map((blog: any, i: number) => (
                <a
                  key={i}
                  href={getSafeLink(blog.url, blog.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white rounded-3xl shadow-sm border border-brand-ink/5 p-6 hover:shadow-md transition-all duration-300"
                >
                  <h4 className="text-lg font-serif mb-2 group-hover:text-brand-accent transition-colors leading-tight">{blog.title}</h4>
                  {blog.description && (
                    <p className="text-sm text-brand-ink/60 leading-relaxed line-clamp-3">
                      {blog.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-1.5 text-[10px] text-brand-accent font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3 h-3" /> Leggi l'articolo
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* MODIFY REQUEST */}
        <section className="mb-20">
          <div className="bg-brand-paper p-8 rounded-[2rem] border border-brand-ink/10 shadow-sm">
            <h3 className="text-2xl font-serif mb-4 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-brand-accent" />
              Vuoi modificare o aggiungere qualcosa?
            </h3>
            <p className="text-brand-ink/60 text-sm mb-6">
              L'itinerario non è perfetto? Chiedimi di cambiare hotel, aggiungere un giorno, o cercare attività diverse.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                <MessageSquare className="w-3 h-3" /> Desideri e note per l'aggiornamento
              </label>
              <textarea 
                className="w-full bg-white border border-brand-ink/10 rounded-2xl p-5 min-h-[120px] text-sm leading-relaxed focus:ring-2 ring-brand-accent/20 outline-none transition-all resize-none placeholder:text-brand-ink/25"
                placeholder="Es. Aggiungi un giorno a Parigi, cambia l'hotel con uno più economico..."
                value={modifyText}
                onChange={(e) => setModifyText(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => onModify(modifyText)}
                disabled={!modifyText.trim()}
                className="bg-brand-accent text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-brand-accent/85 transition-all disabled:opacity-50 shadow-lg shadow-brand-accent/25 group w-full md:w-auto justify-center"
              >
                Aggiorna Itinerario <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── FORM VIEW ────────────────────────────────────────────────────────────────

function FormView({ onSubmit, loading }: { onSubmit: (inputs: TravelInputs) => void; loading: boolean }) {
  const [bgSeed] = useState(() => Math.floor(Math.random() * 1000));
  const [inputs, setInputs] = useState<TravelInputs & { budgetInput: string }>({
    people: { adults: 2, children: [] },
    budget: 2000,
    budgetInput: '2000',
    departureCity: '',
    destination: '',
    startDate: '',
    endDate: '',
    isPeriodFlexible: false,
    accommodationType: 'Hotel di charme',
    notes: '',
  });

  const handleAddChild = () =>
    setInputs((p) => ({ ...p, people: { ...p.people, children: [...p.people.children, { age: 8 }] } }));

  const handleRemoveChild = (i: number) =>
    setInputs((p) => ({ ...p, people: { ...p.people, children: p.people.children.filter((_, j) => j !== i) } }));

  const handleChildAge = (i: number, age: number) =>
    setInputs((p) => {
      const c = [...p.people.children];
      c[i].age = age;
      return { ...p, people: { ...p.people, children: c } };
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalInputs = { ...inputs, budget: parseInt(inputs.budgetInput) || 0 };
    onSubmit(finalInputs);
  };

  return (
    <div className="min-h-screen bg-brand-paper flex flex-col lg:flex-row">
      {/* Left Side - Image & Branding */}
      <div className="lg:w-5/12 relative min-h-[40vh] lg:min-h-screen flex flex-col justify-end p-8 md:p-16 overflow-hidden">
        <img 
          src={`https://loremflickr.com/1080/1920/travel,landscape/all?lock=${bgSeed}`} 
          alt="Travel Inspiration" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-brand-ink/10" />
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10">
          <h1 className="text-5xl md:text-7xl xl:text-8xl mb-4 text-white leading-none drop-shadow-lg font-bold tracking-tight">
            Vagabond
          </h1>
          <p className="text-lg md:text-xl font-serif italic text-white/90 max-w-md drop-shadow-md">
            Il tuo concierge digitale per viaggi autentici e indimenticabili.
          </p>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="lg:w-7/12 flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 md:p-12 lg:p-16 xl:p-20">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-3xl md:text-4xl mb-2 font-serif">Crea il tuo itinerario</h2>
            <p className="text-brand-ink/50 mb-10 text-sm">Raccontami i tuoi desideri, penserò io a tutto il resto.</p>

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Partenza & Destinazione */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                    <Plane className="w-3 h-3" /> Da dove parti?
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Milano, Roma…"
                    className="w-full bg-transparent border-b-2 border-brand-ink/10 py-3 text-xl focus:border-brand-accent outline-none transition-colors placeholder:text-brand-ink/20"
                    value={inputs.departureCity}
                    onChange={(e) => setInputs((p) => ({ ...p, departureCity: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                    <MapPin className="w-3 h-3" /> Dove vuoi andare?
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Islanda, Giappone, Bali…"
                    className="w-full bg-transparent border-b-2 border-brand-ink/10 py-3 text-xl focus:border-brand-accent outline-none transition-colors placeholder:text-brand-ink/20"
                    value={inputs.destination}
                    onChange={(e) => setInputs((p) => ({ ...p, destination: e.target.value }))}
                  />
                </div>
              </div>

              {/* Stopover & Orario Partenza */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                    <Plane className="w-3 h-3" /> Eventuale stop over (opzionale)
                  </label>
                  <input
                    type="text"
                    placeholder="Es. Dubai, Londra..."
                    className="w-full bg-transparent border-b-2 border-brand-ink/10 py-3 text-lg focus:border-brand-accent outline-none transition-colors placeholder:text-brand-ink/20"
                    value={inputs.stopover || ''}
                    onChange={(e) => setInputs((p) => ({ ...p, stopover: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                    <Clock className="w-3 h-3" /> Orario di partenza preferito
                  </label>
                  <select
                    className="w-full bg-transparent border-b-2 border-brand-ink/10 py-3 text-lg focus:border-brand-accent outline-none transition-colors appearance-none cursor-pointer"
                    value={inputs.departureTimePreference || 'Indifferente'}
                    onChange={(e) => setInputs((p) => ({ ...p, departureTimePreference: e.target.value }))}
                  >
                    <option value="Indifferente">Indifferente</option>
                    <option value="Mattina">Mattina</option>
                    <option value="Pomeriggio">Pomeriggio</option>
                    <option value="Sera">Sera</option>
                  </select>
                </div>
              </div>

              {/* Chi viaggia + Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                    <Users className="w-3 h-3" /> Chi viaggia?
                  </label>
                  <div className="flex items-center gap-8">
                    <div>
                      <span className="text-xs text-brand-ink/40 block mb-2">Adulti</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setInputs((p) => ({ ...p, people: { ...p.people, adults: Math.max(1, p.people.adults - 1) } }))}
                          className="w-8 h-8 rounded-full border border-brand-ink/20 flex items-center justify-center hover:bg-brand-ink/5 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-2xl font-serif w-6 text-center">{inputs.people.adults}</span>
                        <button type="button" onClick={() => setInputs((p) => ({ ...p, people: { ...p.people, adults: p.people.adults + 1 } }))}
                          className="w-8 h-8 rounded-full border border-brand-ink/20 flex items-center justify-center hover:bg-brand-ink/5 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-brand-ink/40 block mb-2">Bambini</span>
                      <button type="button" onClick={handleAddChild}
                        className="flex items-center gap-1.5 text-brand-accent text-sm font-bold hover:text-brand-accent/70 transition-colors">
                        <Plus className="w-4 h-4" /> Aggiungi
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {inputs.people.children.length > 0 && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2">
                        {inputs.people.children.map((child, i) => (
                          <div key={i} className="flex items-center justify-between bg-brand-ink/5 p-3 rounded-xl">
                            <span className="text-sm text-brand-ink/60">Bambino {i + 1}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => handleChildAge(i, Math.max(0, child.age - 1))}
                                  className="w-6 h-6 rounded-full bg-white border border-brand-ink/10 flex items-center justify-center">
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="text-sm font-bold w-4 text-center">{child.age}</span>
                                <button type="button" onClick={() => handleChildAge(i, Math.min(17, child.age + 1))}
                                  className="w-6 h-6 rounded-full bg-white border border-brand-ink/10 flex items-center justify-center">
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              <span className="text-xs text-brand-ink/40">anni</span>
                              <button type="button" onClick={() => handleRemoveChild(i)} className="text-red-400 hover:text-red-600 transition-colors">
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                    <Euro className="w-3 h-3" /> Budget totale
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      min="0"
                      className="w-full bg-transparent border-b-2 border-brand-ink/10 py-3 text-2xl focus:border-brand-accent outline-none transition-colors pr-8"
                      value={inputs.budgetInput}
                      onChange={(e) => setInputs((p) => ({ ...p, budgetInput: e.target.value }))}
                    />
                    <span className="absolute right-0 bottom-3.5 text-xl text-brand-ink/30">€</span>
                  </div>
                  <p className="text-[10px] text-brand-ink/30 italic">Include voli, alloggi, attività e pasti.</p>
                </div>
              </div>

              {/* Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                    <Calendar className="w-3 h-3" /> Quando?
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-brand-ink/30 uppercase block mb-1">Partenza</span>
                      <input required type="date" className="w-full bg-transparent border-b-2 border-brand-ink/10 py-2 text-base focus:border-brand-accent outline-none transition-colors"
                        value={inputs.startDate} onChange={(e) => {
                          const newStart = e.target.value;
                          setInputs((p) => ({ 
                            ...p, 
                            startDate: newStart,
                            endDate: p.endDate && p.endDate < newStart ? newStart : p.endDate
                          }));
                        }} />
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-ink/30 uppercase block mb-1">Ritorno</span>
                      <input required type="date" min={inputs.startDate} className="w-full bg-transparent border-b-2 border-brand-ink/10 py-2 text-base focus:border-brand-accent outline-none transition-colors"
                        value={inputs.endDate} onChange={(e) => setInputs((p) => ({ ...p, endDate: e.target.value }))} />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group mt-2">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={inputs.isPeriodFlexible}
                        onChange={(e) => setInputs((p) => ({ ...p, isPeriodFlexible: e.target.checked }))} />
                      <div className={cn('w-10 h-5 rounded-full transition-colors duration-300', inputs.isPeriodFlexible ? 'bg-brand-accent' : 'bg-brand-ink/15')} />
                      <div className={cn('absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow transition-transform duration-300', inputs.isPeriodFlexible && 'translate-x-5')} />
                    </div>
                    <span className="text-sm text-brand-ink/50 group-hover:text-brand-ink transition-colors">Date flessibili (±3 giorni)</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                    <Home className="w-3 h-3" /> Tipologia alloggio
                  </label>
                  <select
                    className="w-full bg-transparent border-b-2 border-brand-ink/10 py-3 text-lg focus:border-brand-accent outline-none transition-colors appearance-none cursor-pointer"
                    value={inputs.accommodationType}
                    onChange={(e) => setInputs((p) => ({ ...p, accommodationType: e.target.value }))}
                  >
                    <option>Hotel di charme</option>
                    <option>No Resort — Boutique Hotel</option>
                    <option>B&B locali</option>
                    <option>Appartamenti o ville</option>
                    <option>Esperienze uniche (glamping, ryokan…)</option>
                  </select>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                  <MessageSquare className="w-3 h-3" /> Desideri e note
                </label>
                <textarea
                  placeholder="Es: voglio evitare le zone turistiche, preferisco ristoranti dove mangiano i locali, mi piace l'arte contemporanea…"
                  className="w-full bg-brand-ink/5 rounded-2xl p-5 min-h-[120px] text-sm leading-relaxed focus:ring-2 ring-brand-accent/20 outline-none transition-all resize-none placeholder:text-brand-ink/25"
                  value={inputs.notes}
                  onChange={(e) => setInputs((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-brand-accent text-white py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 hover:bg-brand-accent/85 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-accent/25 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Elaborazione in corso…
                  </>
                ) : (
                  <>
                    Pianifica il mio viaggio
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [lastInputs, setLastInputs] = useState<TravelInputs | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (inputs: TravelInputs) => {
    setLoading(true);
    setLoadingStep('Inizializzazione...');
    setError(null);
    try {
      setLastInputs(inputs);
      const result = await generateTravelPlan(inputs, (step) => setLoadingStep(step));
      setPlan(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error generating plan:', err);
      // Show the actual error message from the backend
      setError(err.message || 'Si è verificato un errore durante la generazione del piano. Riprova tra qualche istante.');
    } finally {
      setLoading(false);
    }
  };

  const handleModify = async (request: string) => {
    if (!lastInputs || !plan) return;
    setLoading(true);
    setLoadingStep('Aggiorno l\'itinerario...');
    setError(null);
    try {
      const modifiedInputs = {
        ...lastInputs,
        modificationRequest: request,
        previousPlan: plan
      };
      const result = await generateTravelPlan(modifiedInputs, (step) => setLoadingStep(step));
      setPlan(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error modifying plan:', err);
      setError(err.message || 'Si è verificato un errore durante l\'aggiornamento del piano. Riprova tra qualche istante.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen step={loadingStep} />;

  if (error) {
    return (
      <div className="min-h-screen bg-brand-paper flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl mb-3">Errore</h2>
          <p className="text-brand-ink/60 mb-6">{error}</p>
          <button onClick={() => setError(null)} className="bg-brand-accent text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-accent/85 transition-colors">
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (plan) return <ResultsView plan={plan} inputs={lastInputs} onReset={() => setPlan(null)} onModify={handleModify} />;

  return <FormView onSubmit={handleSubmit} loading={loading} />;
}
