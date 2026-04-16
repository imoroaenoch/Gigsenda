"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, ShieldCheck } from "lucide-react";

const slides = [
  {
    title: "Find Any Service",
    description: "From plumbers to tutors, find skilled professionals near you",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cdefs%3E%3ClinearGradient id='bg1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF6B6B'/%3E%3Cstop offset='100%25' style='stop-color:%23FF8E53'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23bg1)'/%3E%3C!-- Search Interface --%3E%3Crect x='50' y='50' width='300' height='40' rx='20' fill='white' opacity='0.9'/%3E%3Ccircle cx='80' cy='70' r='12' fill='%23FF6B6B'/%3E%3Cpath d='M75 70 L78 73 L85 66' stroke='white' stroke-width='2' fill='none'/%3E%3Ctext x='110' y='75' fill='%23333' font-family='Urbanist' font-size='14'%3ESearch services...%3C/text%3E%3C!-- Service Cards --%3E%3Crect x='50' y='110' width='130' height='80' rx='10' fill='white' opacity='0.8'/%3E%3Ccircle cx='90' cy='140' r='15' fill='%234ECDC4'/%3E%3Ctext x='115' y='135' fill='%23333' font-family='Urbanist' font-size='12' font-weight='bold'%3EPlumber%3C/text%3E%3Ctext x='115' y='150' fill='%23666' font-family='Urbanist' font-size='10'%3E$45/hour%3C/text%3E%3Crect x='220' y='110' width='130' height='80' rx='10' fill='white' opacity='0.8'/%3E%3Ccircle cx='260' cy='140' r='15' fill='%2395E1D3'/%3E%3Ctext x='285' y='135' fill='%23333' font-family='Urbanist' font-size='12' font-weight='bold'%3ETutor%3C/text%3E%3Ctext x='285' y='150' fill='%23666' font-family='Urbanist' font-size='10'%3E$30/hour%3C/text%3E%3C!-- Location Pin --%3E%3Cpath d='M200 220 C180 220 180 200 180 200 C180 190 200 170 200 170 C200 170 220 190 220 200 C220 200 220 220 200 220 Z' fill='white' opacity='0.9'/%3E%3Ccircle cx='200' cy='200' r='5' fill='%23FF6B6B'/%3E%3C/svg%3E",
    bgPattern: "from-red-50 to-orange-100",
  },
  {
    title: "Book Instantly",
    description: "View profiles, check ratings and book in seconds",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cdefs%3E%3ClinearGradient id='bg2' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%236C5CE7'/%3E%3Cstop offset='100%25' style='stop-color:%23A29BFE'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23bg2)'/%3E%3C!-- Profile Card --%3E%3Crect x='75' y='50' width='250' height='120' rx='15' fill='white' opacity='0.95'/%3E%3Ccircle cx='125' cy='90' r='25' fill='%236C5CE7'/%3E%3Ctext x='125' y='95' text-anchor='middle' fill='white' font-family='Urbanist' font-size='16' font-weight='bold'%3EJD%3C/text%3E%3Ctext x='165' y='75' fill='%23333' font-family='Urbanist' font-size='14' font-weight='bold'%3EJohn Doe%3C/text%3E%3Ctext x='165' y='90' fill='%23666' font-family='Urbanist' font-size='11'%3EProfessional Plumber%3C/text%3E%3C!-- Stars --%3E%3Cpath d='M165 100 L167 104 L171 104 L168 107 L169 111 L165 108 L161 111 L162 107 L159 104 L163 104 Z' fill='%23FFD93D'/%3E%3Cpath d='M175 100 L177 104 L181 104 L178 107 L179 111 L175 108 L171 111 L172 107 L169 104 L173 104 Z' fill='%23FFD93D'/%3E%3Cpath d='M185 100 L187 104 L191 104 L188 107 L189 111 L185 108 L181 111 L182 107 L179 104 L183 104 Z' fill='%23FFD93D'/%3E%3Cpath d='M195 100 L197 104 L201 104 L198 107 L199 111 L195 108 L191 111 L192 107 L189 104 L193 104 Z' fill='%23FFD93D'/%3E%3Cpath d='M205 100 L207 104 L211 104 L208 107 L209 111 L205 108 L201 111 L202 107 L199 104 L203 104 Z' fill='%23FFD93D'/%3E%3Ctext x='165' y='125' fill='%23666' font-family='Urbanist' font-size='10'%3E5.0 (127 reviews)%3C/text%3E%3C!-- Calendar --%3E%3Crect x='100' y='190' width='200' height='80' rx='10' fill='white' opacity='0.9'/%3E%3Ctext x='200' y='210' text-anchor='middle' fill='%23333' font-family='Urbanist' font-size='12' font-weight='bold'%3EAvailable Times%3C/text%3E%3Crect x='120' y='220' width='40' height='25' rx='5' fill='%236C5CE7'/%3E%3Ctext x='140' y='237' text-anchor='middle' fill='white' font-family='Urbanist' font-size='10'%3E9AM%3C/text%3E%3Crect x='170' y='220' width='40' height='25' rx='5' fill='%23A29BFE'/%3E%3Ctext x='190' y='237' text-anchor='middle' fill='white' font-family='Urbanist' font-size='10'%3E11AM%3C/text%3E%3Crect x='220' y='220' width='40' height='25' rx='5' fill='%23A29BFE'/%3E%3Ctext x='240' y='237' text-anchor='middle' fill='white' font-family='Urbanist' font-size='10'%3E2PM%3C/text%3E%3C/svg%3E",
    bgPattern: "from-purple-50 to-indigo-100",
  },
  {
    title: "Pay Securely",
    description: "Pay through the app safely. We guarantee your satisfaction",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cdefs%3E%3ClinearGradient id='bg3' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2300B894'/%3E%3Cstop offset='100%25' style='stop-color:%2300CEC9'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23bg3)'/%3E%3C!-- Payment Card --%3E%3Crect x='100' y='80' width='200' height='120' rx='15' fill='white' opacity='0.95'/%3E%3Crect x='120' y='100' width='160' height='35' rx='8' fill='%2300B894' opacity='0.1'/%3E%3Ctext x='130' y='120' fill='%2300B894' font-family='Urbanist' font-size='10'%3ECARD NUMBER%3C/text%3E%3Ctext x='130' y='135' fill='%23333' font-family='Urbanist' font-size='12'%3E•••• •••• •••• 4532%3C/text%3E%3Ctext x='130' y='155' fill='%2300B894' font-family='Urbanist' font-size='8'%3ECARD HOLDER%3C/text%3E%3Ctext x='130' y='170' fill='%23333' font-family='Urbanist' font-size='11'%3EJohn Doe%3C/text%3E%3Ctext x='230' y='155' fill='%2300B894' font-family='Urbanist' font-size='8'%3EEXPIRES%3C/text%3E%3Ctext x='230' y='170' fill='%23333' font-family='Urbanist' font-size='11'%3E12/25%3C/text%3E%3C!-- Shield --%3E%3Ccircle cx='200' cy='220' r='20' fill='white' opacity='0.9'/%3E%3Cpath d='M200 205 L190 210 L190 225 Q200 235 200 235 Q200 235 210 225 L210 210 Z' fill='%2300B894'/%3E%3Cpath d='M195 215 L198 218 L205 211' stroke='white' stroke-width='2' fill='none'/%3E%3C!-- Price --%3E%3Crect x='150' y='40' width='100' height='30' rx='15' fill='%2300CEC9'/%3E%3Ctext x='200' y='58' text-anchor='middle' fill='white' font-family='Urbanist' font-size='14' font-weight='bold'%3E$45.00%3C/text%3E%3C/svg%3E",
    bgPattern: "from-teal-50 to-cyan-100",
  },
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    router.push("/choose-account");
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Skip Button */}
      <div className="flex justify-end p-6">
        <button
          onClick={handleSkip}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slide Content */}
      <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
        {/* Image Illustration with Faded Background */}
        <div className={`mb-8 relative rounded-2xl overflow-hidden shadow-xl transform transition-all duration-500 hover:scale-105 bg-gradient-to-br ${slides[currentSlide].bgPattern}`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
            <div className="absolute top-3 right-3 w-16 h-16 bg-white/20 rounded-full blur-lg"></div>
            <div className="absolute bottom-3 left-3 w-12 h-12 bg-white/20 rounded-full blur-md"></div>
          </div>
          
          {/* Main Image */}
          <div className="relative w-48 h-36 md:w-56 md:h-42">
            <img 
              src={slides[currentSlide].image} 
              alt={slides[currentSlide].title}
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
          
          {/* Overlay Effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-2xl"></div>
        </div>
        
        {/* Text Content */}
        <h2 className="text-2xl font-medium text-gray-900 mb-4 leading-tight">
          {slides[currentSlide].title}
        </h2>
        <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
          {slides[currentSlide].description}
        </p>
      </div>

      {/* Navigation Footer */}
      <div className="mt-auto flex flex-col items-center pb-8 px-6">
        {/* Dots */}
        <div className="mb-6 flex space-x-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-6 bg-orange-500"
                  : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          className="w-full max-w-xs py-3 px-6 bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
        >
          {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
        </button>
      </div>
    </main>
  );
}
