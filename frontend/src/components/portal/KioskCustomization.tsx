'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Image as ImageIcon, Type, Plus, Trash2 } from 'lucide-react';

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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/settings/kiosk_slides`);
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
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
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return; // keep at least one
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Kiosk Branding</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize the background images and welcome text shown on the visitor kiosk.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md flex items-center gap-2"
        >
          <Save size={18} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 bg-muted/30/50 flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Settings size={18} className="text-blue-500" /> Kiosk Slides
          </h3>
          <button onClick={addSlide} className="text-sm text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1">
            <Plus size={16} /> Add Slide
          </button>
        </div>
        
        <div className="p-5 space-y-6">
          {slides.map((slide, index) => (
            <div key={index} className="flex flex-col gap-4 p-4 border border-border rounded-xl bg-slate-50/50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm text-slate-500">Slide {index + 1}</span>
                {slides.length > 1 && (
                  <button onClick={() => removeSlide(index)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <ImageIcon size={14} /> Background Image URL
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={slide.image}
                      onChange={(e) => updateSlide(index, 'image', e.target.value)}
                      className="flex-1 text-sm p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                      placeholder="url('/my-image.jpg')"
                    />
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-3 py-2.5 rounded-lg border border-slate-200 transition-colors whitespace-nowrap">
                      Upload
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
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Type size={14} /> Welcome Text
                  </label>
                  <input
                    type="text"
                    value={slide.text}
                    onChange={(e) => updateSlide(index, 'text', e.target.value)}
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                    placeholder="Welcome to our office"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
