/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Euro, 
  MapPin, 
  Calendar, 
  Home, 
  MessageSquare, 
  Plane, 
  Hotel, 
  Sun, 
  ShieldCheck, 
  ArrowRight, 
  Plus, 
  Minus,
  Loader2,
  Star,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Search
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateTravelPlan, type TravelInputs } from './services/travelService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getImageUrl = (item: any, fallbackKeyword: string) => {
  // Se l'IA ha fornito un URL reale e valido
  if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('http')) {
    const url = item.imageUrl.trim();
    // Evitiamo URL che sappiamo essere problematici o protetti
    if (url.includes('google.com/imgres') || url.includes('gstatic.com') || url.includes('search?')) {
       return `https://loremflickr.com/800/600/${encodeURIComponent(fallbackKeyword || 'travel')}?lock=${Math.floor(Math.random() * 1000)}`;
    }
    return url;
  }
  // Fallback dinamico usando LoremFlickr per varietà basata su keyword
  const keyword = encodeURIComponent(fallbackKeyword || 'travel');
  return `https://loremflickr.com/800/600/${keyword}?lock=${Math.floor(Math.random() * 1000)}`;
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.target as HTMLImageElement;
  // Se l'immagine fallisce, usiamo un fallback casuale basato su "travel"
  target.src = `https://loremflickr.com/800/600/travel?lock=${Math.floor(Math.random() * 1000)}`;
};

const getSafeLink = (url: string, name: string) => {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return `https://www.google.com/search?q=${encodeURIComponent(name)}`;
  }
  return url;
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [inputs, setInputs] = useState<TravelInputs>({
    people: { adults: 2, children: [] },
    budget: 2000,
    departureCity: '',
    destination: '',
    startDate: '',
    endDate: '',
    isPeriodFlexible: false,
    accommodationType: 'Hotel di charme',
    notes: ''
  });

  const handleAddChild = () => {
    setInputs(prev => ({
      ...prev,
      people: {
        ...prev.people,
        children: [...prev.people.children, { age: 5 }]
      }
    }));
  };

  const handleRemoveChild = (index: number) => {
    setInputs(prev => ({
      ...prev,
      people: {
        ...prev.people,
        children: prev.people.children.filter((_, i) => i !== index)
      }
    }));
  };

  const handleChildAgeChange = (index: number, age: number) => {
    setInputs(prev => {
      const newChildren = [...prev.people.children];
      newChildren[index].age = age;
      return {
        ...prev,
        people: { ...prev.people, children: newChildren }
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await generateTravelPlan(inputs);
      setPlan(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error generating plan:", error);
      alert("Si è verificato un errore durante la generazione del piano. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  if (plan) {
    return (
      <div className="min-h-screen bg-brand-paper pb-20">
        {/* Hero Section */}
        <section className="relative h-[80vh] overflow-hidden">
          <img 
            src={`https://picsum.photos/seed/${plan.destinationOverview.title}/1920/1080`}
            alt={plan.destinationOverview.title}
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-brand-paper" />
          <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-20">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl"
            >
              <h1 className="text-6xl md:text-9xl text-white mb-4 leading-none">
                {plan.destinationOverview.title}
              </h1>
              <p className="text-xl md:text-2xl text-white/90 font-serif italic max-w-2xl">
                {plan.destinationOverview.description}
              </p>
            </motion.div>
          </div>
          <button 
            onClick={() => setPlan(null)}
            className="absolute top-8 left-8 glass px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white transition-colors"
          >
            <ArrowRight className="rotate-180 w-4 h-4" />
            Nuova Ricerca
          </button>
        </section>

        <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-10">
          {/* Budget Warning */}
          {plan.budgetWarning && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-12 bg-red-50 border-2 border-red-200 p-8 rounded-[2rem] flex items-start gap-6 shadow-xl"
            >
              <div className="p-4 bg-red-100 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-2xl text-red-900 mb-2">Attenzione al Budget</h3>
                <p className="text-red-800 text-lg leading-relaxed">{plan.budgetWarning}</p>
              </div>
            </motion.div>
          )}

          {/* Attractions Grid */}
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plan.destinationOverview.attractions.map((attr: any, i: number) => (
                <motion.a 
                  key={i}
                  href={getSafeLink(attr.sourceUrl, attr.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative aspect-[4/5] overflow-hidden rounded-3xl shadow-xl block"
                >
                  <img 
                    src={getImageUrl(attr, attr.name)}
                    alt={attr.name}
                    onError={handleImageError}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                    <h3 className="text-2xl text-white mb-2 flex items-center gap-2">
                      {attr.name} <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-white/70 text-sm line-clamp-2">{attr.description}</p>
                    <div className="mt-4 flex gap-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest border border-white/20 px-2 py-1 rounded flex items-center gap-1">
                        <Search className="w-3 h-3" /> Vedi Dettagli
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </section>

          {/* Weather & Safety */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
            <div className="space-y-8">
              <div className="glass p-8 rounded-[2rem]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-brand-accent/10 rounded-2xl">
                    <Sun className="text-brand-accent w-6 h-6" />
                  </div>
                  <h2 className="text-3xl">Meteo & Periodo</h2>
                </div>
                <p className="text-lg mb-6 text-brand-ink/80">{plan.weatherInfo.summary}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-700 block mb-2">Pro</span>
                    <p className="text-sm text-emerald-900">{plan.weatherInfo.pros}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl">
                    <span className="text-xs uppercase tracking-wider font-bold text-amber-700 block mb-2">Contro</span>
                    <p className="text-sm text-amber-900">{plan.weatherInfo.cons}</p>
                  </div>
                </div>
              </div>

              <div className="glass p-8 rounded-[2rem]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-brand-accent/10 rounded-2xl">
                    <ShieldCheck className="text-brand-accent w-6 h-6" />
                  </div>
                  <h2 className="text-3xl">Sicurezza & Salute</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold text-sm uppercase text-brand-ink/50">Avvertenze</p>
                      <p>{plan.safetyAndHealth.safetyWarnings}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-sm uppercase text-brand-ink/50">Vaccinazioni</p>
                      <p>{plan.safetyAndHealth.vaccinationsRequired}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Breakdown */}
            <div className="glass p-8 rounded-[2rem] h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-brand-accent/10 rounded-2xl">
                  <Euro className="text-brand-accent w-6 h-6" />
                </div>
                <h2 className="text-3xl">Budget Stimato</h2>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Voli', value: plan.budgetBreakdown.flights, icon: Plane },
                  { label: 'Alloggi', value: plan.budgetBreakdown.accommodation, icon: Hotel },
                  { label: 'Attività', value: plan.budgetBreakdown.activities, icon: MapPin },
                  { label: 'Cibo & Altro', value: plan.budgetBreakdown.food, icon: Users },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-brand-ink/5 pb-4">
                    <div className="flex items-center gap-4">
                      <item.icon className="w-5 h-5 opacity-40" />
                      <span className="text-lg">{item.label}</span>
                    </div>
                    <span className="text-xl font-medium">{item.value}€</span>
                  </div>
                ))}
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-2xl font-serif italic">Totale Stimato</span>
                  <span className="text-3xl font-bold text-brand-accent">{plan.budgetBreakdown.totalEstimated}€</span>
                </div>
                <p className="text-xs text-brand-ink/40 text-center italic">
                  *I costi sono stime basate sui prezzi medi del periodo scelto.
                </p>
              </div>
            </div>
          </section>

          {/* Itinerary */}
          <section className="mb-20">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
              <h2 className="text-5xl">Il Tuo Itinerario</h2>
              <div className="flex gap-4">
                {plan.overallMapUrl && (
                  <a 
                    href={plan.overallMapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="glass px-6 py-3 rounded-2xl flex items-center gap-3 hover:bg-brand-accent hover:text-white transition-all group"
                  >
                    <MapPin className="w-5 h-5 text-brand-accent group-hover:text-white" />
                    <span className="font-bold">Apri Mappa Completa</span>
                  </a>
                )}
              </div>
            </div>

            {/* Map Embed */}
            <div className="mb-12 rounded-[2rem] overflow-hidden shadow-2xl h-[400px] border border-brand-ink/10">
              <iframe 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                loading="lazy" 
                allowFullScreen 
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(plan.destinationOverview.title)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
              />
            </div>

            <div className="space-y-12">
              {plan.itinerary.map((day: any, i: number) => (
                <div key={i} className="relative pl-12 md:pl-24">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-brand-ink/10" />
                  <div className="absolute left-[-8px] top-0 w-4 h-4 rounded-full bg-brand-accent" />
                  <div className="mb-8">
                    <span className="text-brand-accent font-bold tracking-widest uppercase text-sm">Giorno {day.day}</span>
                    <h3 className="text-4xl mt-2">{day.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {day.activities.map((act: any, j: number) => (
                      <a 
                        key={j} 
                        href={getSafeLink(act.sourceUrl, act.description)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white rounded-3xl shadow-sm border border-brand-ink/5 hover:shadow-md transition-all group block overflow-hidden"
                      >
                        {(act.imageUrl || act.imageSearchKeyword) && (
                          <div className="h-48 overflow-hidden">
                            <img 
                              src={getImageUrl(act, act.imageSearchKeyword || act.description)}
                              alt={act.description}
                              onError={handleImageError}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-mono bg-brand-paper px-2 py-1 rounded-md w-fit">{act.time}</span>
                              {act.lat && act.lng && (
                                <span className="text-[10px] text-brand-accent flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> Posizione verificata
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-brand-accent">{act.costEstimate}€</span>
                              <ChevronRight className="w-4 h-4 text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <p className="text-brand-ink/80 leading-relaxed mb-4">{act.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-brand-accent font-bold uppercase tracking-widest">
                            <Search className="w-3 h-3" /> Verifica su Google
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Flights & Accommodations */}
          <section className="space-y-20">
            <div>
              <h2 className="text-4xl mb-8 flex items-center gap-4">
                <Plane className="w-8 h-8" /> Voli Suggeriti
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plan.flights.map((flight: any, i: number) => (
                  <div key={i} className="glass p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-xl">{flight.airline}</span>
                      <span className="text-brand-accent font-bold">{flight.estimatedPrice}€</span>
                    </div>
                    <p className="text-brand-ink/60 mb-4">{flight.route}</p>
                    <ul className="space-y-2">
                      {flight.options.map((opt: string, j: number) => (
                        <li key={j} className="text-sm flex items-center gap-2">
                          <ChevronRight className="w-3 h-3 text-brand-accent" /> {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-4xl mb-8 flex items-center gap-4">
                <Hotel className="w-8 h-8" /> Alloggi Consigliati
              </h2>
              <div className="space-y-12">
                {plan.accommodations.map((stop: any, i: number) => (
                  <div key={i}>
                    <h3 className="text-2xl mb-6 text-brand-accent italic">Tappa: {stop.stopName}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {stop.options.map((hotel: any, j: number) => (
                        <a 
                          key={j} 
                          href={getSafeLink(hotel.bookingUrl, hotel.name)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-all border border-brand-ink/5 block group overflow-hidden"
                        >
                          <div className="h-48 overflow-hidden relative">
                            <img 
                              src={getImageUrl(hotel, hotel.name)}
                              alt={hotel.name}
                              onError={handleImageError}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 text-amber-500 shadow-sm">
                              <Star className="w-3 h-3 fill-current" />
                              <span className="text-xs font-bold">{hotel.rating}</span>
                            </div>
                          </div>
                          <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-xl font-bold leading-tight group-hover:text-brand-accent transition-colors">{hotel.name}</h4>
                            </div>
                            <p className="text-xs text-brand-ink/40 uppercase tracking-widest mb-4">{hotel.type}</p>
                            {hotel.lat && hotel.lng && (
                              <div className="flex items-center gap-1 text-[10px] text-brand-accent mb-2">
                                <MapPin className="w-3 h-3" /> Posizione verificata
                              </div>
                            )}
                            <p className="text-sm text-brand-ink/70 mb-6 italic">"{hotel.reviewSummary}"</p>
                            <div className="flex justify-between items-center pt-4 border-t border-brand-ink/5">
                              <span className="text-xs text-brand-ink/40">Prezzo stimato</span>
                              <span className="font-bold">{hotel.estimatedPricePerNight}€ / notte</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-[10px] text-brand-accent font-bold uppercase tracking-widest">
                              <Search className="w-3 h-3" /> Controlla Disponibilità
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {plan.bestRestaurants && (
              <div>
                <h2 className="text-4xl mb-8 flex items-center gap-4">
                  <Users className="w-8 h-8" /> Migliori Ristoranti Locali
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plan.bestRestaurants.map((rest: any, i: number) => (
                    <a 
                      key={i} 
                      href={getSafeLink(rest.sourceUrl, rest.name)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-all border border-brand-ink/5 block group overflow-hidden"
                    >
                      <div className="h-48 overflow-hidden relative">
                        <img 
                          src={getImageUrl(rest, rest.name)}
                          alt={rest.name}
                          onError={handleImageError}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 text-amber-500 shadow-sm">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs font-bold">{rest.rating}</span>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xl font-bold leading-tight group-hover:text-brand-accent transition-colors">{rest.name}</h4>
                        </div>
                        <p className="text-xs text-brand-ink/40 uppercase tracking-widest mb-2">{rest.cuisineType}</p>
                        {rest.lat && rest.lng && (
                          <div className="flex items-center gap-1 text-[10px] text-brand-accent mb-2">
                            <MapPin className="w-3 h-3" /> Posizione verificata
                          </div>
                        )}
                        <p className="text-sm text-brand-ink/70 mb-6 italic">"{rest.reviewSummary}"</p>
                        <div className="flex justify-between items-center pt-4 border-t border-brand-ink/5">
                          <span className="text-xs text-brand-ink/40">Fascia di prezzo</span>
                          <span className="font-bold">{rest.priceRange}</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-brand-accent font-bold uppercase tracking-widest">
                          <Search className="w-3 h-3" /> Leggi Recensioni
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-paper flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-8xl mb-4">Vagabond AI</h1>
          <p className="text-xl md:text-2xl font-serif italic text-brand-ink/60">
            Il tuo agente di viaggio personale, per esperienze autentiche.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass p-8 md:p-12 rounded-[3rem] shadow-2xl space-y-8">
          {/* Departure & Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-ink/40">
                <Plane className="w-3 h-3" /> Da dove parti?
              </label>
              <input 
                required
                type="text"
                placeholder="Città, Nazione"
                className="w-full bg-transparent border-b-2 border-brand-ink/10 py-4 text-2xl focus:border-brand-accent outline-none transition-colors"
                value={inputs.departureCity}
                onChange={e => setInputs(prev => ({ ...prev, departureCity: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-ink/40">
                <MapPin className="w-3 h-3" /> Dove vuoi andare?
              </label>
              <input 
                required
                type="text"
                placeholder="Es: Islanda, Bali..."
                className="w-full bg-transparent border-b-2 border-brand-ink/10 py-4 text-2xl focus:border-brand-accent outline-none transition-colors"
                value={inputs.destination}
                onChange={e => setInputs(prev => ({ ...prev, destination: e.target.value }))}
              />
            </div>
          </div>

          {/* People */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-ink/40">
                <Users className="w-3 h-3" /> Chi viaggia?
              </label>
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-sm">Adulti</span>
                  <div className="flex items-center gap-3 mt-2">
                    <button 
                      type="button"
                      onClick={() => setInputs(prev => ({ ...prev, people: { ...prev.people, adults: Math.max(1, prev.people.adults - 1) } }))}
                      className="p-1 rounded-full border border-brand-ink/20 hover:bg-brand-ink/5"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-bold w-4 text-center">{inputs.people.adults}</span>
                    <button 
                      type="button"
                      onClick={() => setInputs(prev => ({ ...prev, people: { ...prev.people, adults: prev.people.adults + 1 } }))}
                      className="p-1 rounded-full border border-brand-ink/20 hover:bg-brand-ink/5"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm">Bambini</span>
                  <button 
                    type="button"
                    onClick={handleAddChild}
                    className="mt-2 flex items-center gap-2 text-brand-accent text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" /> Aggiungi
                  </button>
                </div>
              </div>
              
              <AnimatePresence>
                {inputs.people.children.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 pt-2"
                  >
                    {inputs.people.children.map((child, i) => (
                      <div key={i} className="flex items-center justify-between bg-brand-ink/5 p-2 rounded-xl">
                        <span className="text-sm">Età bambino {i + 1}</span>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number"
                            min="0"
                            max="17"
                            className="w-12 bg-white rounded-md px-2 py-1 text-sm border border-brand-ink/10"
                            value={child.age}
                            onChange={e => handleChildAgeChange(i, parseInt(e.target.value))}
                          />
                          <button 
                            type="button"
                            onClick={() => handleRemoveChild(i)}
                            className="text-red-500"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Budget */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-ink/40">
                <Euro className="w-3 h-3" /> Budget Totale
              </label>
              <div className="relative">
                <input 
                  required
                  type="number"
                  className="w-full bg-transparent border-b-2 border-brand-ink/10 py-2 text-2xl focus:border-brand-accent outline-none transition-colors pr-8"
                  value={inputs.budget}
                  onChange={e => setInputs(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                />
                <span className="absolute right-0 bottom-3 text-xl opacity-40">€</span>
              </div>
              <p className="text-[10px] text-brand-ink/40 italic">Include trasporti, alloggi e tour.</p>
            </div>
          </div>

          {/* Period & Flexible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-ink/40">
                <Calendar className="w-3 h-3" /> Quando?
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-[10px] uppercase text-brand-ink/30 block">Da</span>
                  <input 
                    required
                    type="date"
                    className="w-full bg-transparent border-b-2 border-brand-ink/10 py-2 text-lg focus:border-brand-accent outline-none transition-colors"
                    value={inputs.startDate}
                    onChange={e => setInputs(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] uppercase text-brand-ink/30 block">A</span>
                  <input 
                    required
                    type="date"
                    className="w-full bg-transparent border-b-2 border-brand-ink/10 py-2 text-lg focus:border-brand-accent outline-none transition-colors"
                    value={inputs.endDate}
                    onChange={e => setInputs(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer group pt-2">
                <div className="relative">
                  <input 
                    type="checkbox"
                    className="sr-only"
                    checked={inputs.isPeriodFlexible}
                    onChange={e => setInputs(prev => ({ ...prev, isPeriodFlexible: e.target.checked }))}
                  />
                  <div className={cn(
                    "w-10 h-5 rounded-full transition-colors",
                    inputs.isPeriodFlexible ? "bg-brand-accent" : "bg-brand-ink/20"
                  )} />
                  <div className={cn(
                    "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform",
                    inputs.isPeriodFlexible && "translate-x-5"
                  )} />
                </div>
                <span className="text-sm text-brand-ink/60 group-hover:text-brand-ink transition-colors">Date flessibili</span>
              </label>
            </div>

            {/* Accommodation Type */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-ink/40">
                <Home className="w-3 h-3" /> Tipologia Alloggio
              </label>
              <select 
                className="w-full bg-transparent border-b-2 border-brand-ink/10 py-2 text-xl focus:border-brand-accent outline-none transition-colors appearance-none"
                value={inputs.accommodationType}
                onChange={e => setInputs(prev => ({ ...prev, accommodationType: e.target.value }))}
              >
                <option>Hotel di charme</option>
                <option>No Resort / Boutique Hotel</option>
                <option>B&B Locali</option>
                <option>Appartamenti / Ville</option>
                <option>Esperienze Uniche (Glamping, etc)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-ink/40">
              <MessageSquare className="w-3 h-3" /> Note & Desideri
            </label>
            <textarea 
              placeholder="Es: Voglio posti non turistici, esperienze uniche, ristoranti locali autentici..."
              className="w-full bg-brand-ink/5 rounded-2xl p-4 min-h-[120px] focus:ring-2 ring-brand-accent/20 outline-none transition-all"
              value={inputs.notes}
              onChange={e => setInputs(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-brand-accent text-white py-6 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 hover:bg-brand-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-accent/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Sto creando il tuo viaggio...
              </>
            ) : (
              <>
                Pianifica il mio Viaggio
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
