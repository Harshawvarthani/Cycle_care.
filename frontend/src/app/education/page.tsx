'use client';

import React, { useState } from 'react';
import { BookOpen, HelpCircle, ShieldAlert, Sparkles, Plus, Minus, Heart } from 'lucide-react';

interface Article {
  title: string;
  category: string;
  readTime: string;
  summary: string;
  content: string;
}

interface FAQItem {
  question: string;
  myth: boolean;
  answer: string;
}

export default function EducationPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const articles: Article[] = [
    {
      title: 'Understanding Your Menstrual Cycle Phases',
      category: 'Cycle Health',
      readTime: '4 min read',
      summary: 'Your cycle consists of four key stages, each driven by shifts in estrogen and progesterone.',
      content: 'Your menstrual cycle is much more than just your period. It consists of four distinct phases:\n\n1. Menstrual Phase (Days 1-5): The shedding of the uterine lining. Estrogen and progesterone are at their lowest. Focus on resting, warm tea, and hydration.\n\n2. Follicular Phase (Days 1-13): Estrogen levels rise as follicles mature. Energy peaks, making it a great phase for learning, socializing, and setting new goals.\n\n3. Ovulation Phase (Approx. Day 14): The ovary releases an egg. Your fertile window peaks, and energy levels are at their highest. Discharge may become egg-white and stretchy.\n\n4. Luteal Phase (Days 15-28): Progesterone increases to prepare the uterus for potential pregnancy. If not pregnant, hormone levels plunge, causing PMS symptoms (mood swings, bloating, cravings).'
    },
    {
      title: 'Period Hygiene: Choosing What Is Best For You',
      category: 'Hygiene & Care',
      readTime: '3 min read',
      summary: 'From pads and tampons to menstrual cups and underwear, understand your options and best change intervals.',
      content: 'Everyone\'s body is different, and so are hygiene product preferences:\n\n• Sanitary Pads: Best for beginners, easy to change, and come in various thicknesses. Should be changed every 3-5 hours on heavy flow days.\n\n• Tampons: Inserted internally, great for swimming and sports. Crucial: Change every 4-8 hours to prevent Toxic Shock Syndrome (TSS). Never leave a tampon in for more than 8 hours.\n\n• Menstrual Cups: Reusable silicone cups that collect flow. Environmentally friendly and can be worn for up to 12 hours before emptying.\n\n• Period Underwear: Specially designed, reusable absorbency underwear. Great as backup or for light/moderate flow days.'
    },
    {
      title: 'Demystifying Basal Body Temperature (BBT)',
      category: 'Fertility Tracking',
      readTime: '3 min read',
      summary: 'How monitoring your resting temperature first thing in the morning can help identify ovulation.',
      content: 'Basal Body Temperature is your body temperature when you are fully at rest. Tracking it daily can identify when ovulation has occurred:\n\n• How to measure: Use a digital basal thermometer (accurate to 0.01 degrees) first thing in the morning, before sitting up, speaking, or drinking water.\n\n• The shift: Before ovulation, BBT averages around 36.1°C to 36.4°C. Right after ovulation, progesterone causes a distinct temperature rise (typically 0.3°C - 0.5°C) which remains elevated until your next period.\n\n• Keep in mind: BBT confirms ovulation occurred after the fact, but it doesn\'t predict it in advance. Combine it with cycle length tracking for the best results.'
    }
  ];

  const faqs: FAQItem[] = [
    {
      question: 'Myth: "You cannot get pregnant if you have sex during your period."',
      myth: true,
      answer: 'Busted! While pregnancy is less likely on period days, it is not impossible. Sperm can survive inside your reproductive tract for up to 5 days. If you have a short cycle (e.g. 21 days), you could ovulate soon after your period ends, meaning sex on your final period days could result in conception.'
    },
    {
      question: 'Myth: "Women living together synchronize their periods."',
      myth: true,
      answer: 'Busted! The idea of period syncing (the McClintock effect) has been extensively researched and debunked. While periods can overlap by pure statistical chance, there is no biological mechanism or chemical pheromones synchronizing menstrual cycles between cohabitating women.'
    },
    {
      question: 'Myth: "Exercising during your period is harmful."',
      myth: true,
      answer: 'Busted! Gentle to moderate exercise is actually highly beneficial during your period. Exercise releases endorphins, which act as natural pain relievers, helping to ease cramps, reduce bloating, and lift mood. Listen to your body and opt for walking, yoga, or light aerobics.'
    },
    {
      question: 'Question: "What constitutes an irregular cycle?"',
      myth: false,
      answer: 'Answer: An adult cycle is generally considered irregular if it is shorter than 21 days, longer than 35 days, or varies significantly from month to month (by more than 7-9 days). Occasional fluctuations are normal due to stress, diet, or illness, but persistent irregularities should be discussed with a doctor.'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary shadow-sm">
          <BookOpen className="h-6 w-6" />
        </span>
        <h2 className="text-3xl font-extrabold text-text-dark">
          Education Hub
        </h2>
        <p className="text-xs text-text-muted">
          Reliable health insights, period care guidance, and evidence-based myth busting.
        </p>
      </div>

      {/* Articles Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-text-dark flex items-center gap-2 border-b border-border-soft pb-2">
          <Heart className="h-5 w-5 text-primary fill-current" />
          Featured Care Articles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((art, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-border-soft p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-[10px] font-bold text-text-muted mb-3">
                  <span className="px-2.5 py-1 rounded-full bg-secondary-light/30 text-secondary-dark">{art.category}</span>
                  <span>{art.readTime}</span>
                </div>
                <h4 className="text-sm font-bold text-text-dark mb-2 leading-snug">{art.title}</h4>
                <p className="text-xs text-text-muted leading-relaxed mb-4">{art.summary}</p>
              </div>

              {/* Expander text details */}
              <div className="mt-auto border-t border-border-soft pt-4">
                <details className="group">
                  <summary className="list-none text-xs font-bold text-primary hover:text-primary-dark cursor-pointer flex justify-between items-center focus:outline-none">
                    <span>Read Article Details</span>
                    <span className="text-lg leading-none group-open:rotate-180 transition-transform">↓</span>
                  </summary>
                  <p className="mt-3 text-xs text-text-muted whitespace-pre-line leading-relaxed border-l-2 border-primary-light pl-3">
                    {art.content}
                  </p>
                </details>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ & Myth Busters */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-text-dark flex items-center gap-2 border-b border-border-soft pb-2">
          <HelpCircle className="h-5 w-5 text-secondary" />
          Menstrual Myths & Facts
        </h3>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-border-soft overflow-hidden shadow-sm transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full flex justify-between items-center p-5 text-left font-bold text-sm text-text-dark hover:bg-bg-base/40 focus:outline-none"
                >
                  <span className="flex items-center gap-2 pr-4">
                    {faq.myth ? (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[10px] uppercase font-bold shrink-0">Myth Buster</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-600 text-[10px] uppercase font-bold shrink-0">FAQ</span>
                    )}
                    {faq.question}
                  </span>
                  {isOpen ? <Minus className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-text-muted leading-relaxed border-t border-border-soft/60 whitespace-pre-line bg-bg-base/20">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
