'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Image as ImageIcon, Type, Plus, Trash2, ChevronRight } from 'lucide-react';

interface KioskCustomizationProps {
  currentUser: any;
}

export default function KioskCustomization({ currentUser }: KioskCustomizationProps) {
  const [slides, setSlides] = useState([
    { image: "url('/matrix 1.png')", text: "Welcome to Matrix Technologies" },
    { image: "url('/matrix 2.png')", text: "Seamlessly Connect with Our Team" },
    { image: "url('/matrix 3.png')", text: "Your Modern Receptionist Experience" }
  ]);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/settings/kiosk_slides`);
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            setSlides(data.data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch kiosk slides", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/settings/kiosk_slides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: slides })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save kiosk slides", e);
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/settings/upload/image`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        updateSlide(index, 'image', `url('${data.url}')`);
      }
    } catch (e) {
      console.error("Failed to upload image", e);
    }
  };

  const updateSlide = (index: number, field: 'image' | 'text', value: string) => {
    const newSlides = [...slides];
    newSlides[index][field] = value;
    setSlides(newSlides);
  };

  const addSlide = () => {
    setSlides([...slides, { image: "url('/matrix 1.png')", text: "New Slide Text" }]);
    setActiveSlideIndex(slides.length);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return; // keep at least one
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (activeSlideIndex >= newSlides.length) {
      setActiveSlideIndex(newSlides.length - 1);
    }
  };

  const activeSlide = slides[activeSlideIndex] || slides[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Branding</h1>
          <p className="text-base text-muted-foreground mt-1">
            Design the welcome experience.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Save size={18} />
          {saved ? 'Saved!' : 'Publish'}
        </button>
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-8">
        
        {/* Left: Slide Editor */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Settings size={20} className="text-primary" /> Slide Sequence
            </h3>
            <button onClick={addSlide} className="text-sm bg-muted/50 hover:bg-muted text-foreground font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
              <Plus size={16} /> Add Slide
            </button>
          </div>

          <div className="space-y-4">
            {slides.map((slide, index) => {
              const isActive = index === activeSlideIndex;
              return (
                <div 
                  key={index} 
                  className={`border transition-all duration-300 overflow-hidden ${isActive ? 'border-primary shadow-md rounded-2xl bg-card' : 'border-border hover:border-primary/50 rounded-xl bg-muted/20 cursor-pointer'}`}
                  onClick={() => !isActive && setActiveSlideIndex(index)}
                >
                  {/* Accordion Header */}
                  <div className={`px-5 py-4 flex items-center justify-between ${isActive ? 'bg-primary/5 border-b border-primary/10' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {index + 1}
                      </div>
                      <span className={`font-semibold truncate max-w-[200px] sm:max-w-[300px] ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {slide.text || 'Untitled Slide'}
                      </span>
                    </div>
                    {slides.length > 1 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeSlide(index); }} 
                        className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete Slide"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Accordion Body (Editor) */}
                  {isActive && (
                    <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                      
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Type size={16} className="text-primary" /> Display Text
                        </label>
                        <input
                          type="text"
                          value={slide.text}
                          onChange={(e) => updateSlide(index, 'text', e.target.value)}
                          className="w-full text-base p-3.5 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground shadow-sm"
                          placeholder="e.g. Welcome to Matrix Technologies"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                          <ImageIcon size={16} className="text-primary" /> Background Media
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={slide.image}
                            onChange={(e) => updateSlide(index, 'image', e.target.value)}
                            className="flex-1 text-sm p-3.5 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background text-foreground font-mono shadow-sm"
                            placeholder="url('/my-image.jpg')"
                          />
                          <label className="cursor-pointer bg-card hover:bg-muted text-foreground border border-border text-sm font-bold px-6 py-3.5 rounded-xl transition-all whitespace-nowrap shadow-sm text-center flex items-center justify-center">
                            Upload File
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImageUpload(index, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">Use high-resolution images (1920x1080 recommended) for best results on the kiosk.</p>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="w-full lg:w-[400px] xl:w-[500px] shrink-0">
          <div className="sticky top-8">
            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              Live Preview
            </h3>
            
            {/* The Kiosk Frame (iPad Style Bezel) */}
            <div className="relative w-full aspect-[4/3] rounded-[2rem] p-3 bg-muted/40 border border-border/50 shadow-2xl backdrop-blur-sm">
              
              {/* Inner Screen */}
              <div className="w-full h-full rounded-[1.25rem] relative overflow-hidden shadow-inner ring-1 ring-black/5">
                <div 
                  className="w-full h-full relative flex flex-col items-center justify-center text-center p-8 transition-all duration-700 ease-in-out bg-cover bg-center"
                  style={{ backgroundImage: activeSlide.image }}
                >
                  {/* Subtle Gradient Overlay only at the bottom for readability */}
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  {/* Simulated Kiosk Content */}
                  <div className="relative z-10 flex flex-col items-center gap-8 w-full">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center mb-4">
                       {/* Simulated Logo */}
                       <div className="w-8 h-8 rounded-full bg-white"></div>
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight drop-shadow-md">
                      {activeSlide.text || 'Welcome'}
                    </h1>
                    
                    <div className="mt-8">
                      <div className="bg-white text-black px-8 py-4 rounded-full font-bold text-sm shadow-xl inline-flex items-center gap-2 cursor-default border border-black/5">
                        Tap to Check In
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Simulated Kiosk Progress/Dots */}
                  <div className="absolute bottom-6 flex gap-2 z-10">
                    {slides.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSlideIndex ? 'w-6 bg-white shadow-sm' : 'w-2 bg-white/40'}`}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground text-center mt-6 font-medium">
              This is exactly how visitors will see this slide on the physical iPad kiosk.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
