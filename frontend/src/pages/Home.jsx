// src/pages/Home.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../providers/AuthContext";
import {
  FiCalendar,
  FiUsers,
  FiStar,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiCheckCircle,
  FiTrendingUp,
  FiShield,
} from "react-icons/fi";
import pic1 from "../assets/bd.JPG";
import pic2 from "../assets/finals.jpg";
import pic3 from "../assets/foreign.jpg";

const Home = () => {
  const { user } = useContext(AuthContext);

  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselSlides = [
    {
      image: pic1,
      title: "One Click to Every Event",
      subtitle:
        "The ultimate platform for students and organizations to discover, create, and participate in amazing events",
      overlay: true,
    },
    {
      image: pic2,
      title: "Build Your Skills Through Real Projects",
      subtitle:
        "Join events that match your interests and showcase your talents to the world",
      overlay: true,
    },
    {
      image: pic3,
      title: "Network with Industry Professionals",
      subtitle:
        "Connect with organizations and build meaningful relationships for your future career",
      overlay: true,
    },
  ];

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselSlides.length]);

  const nextSlide = () =>
    setCurrentSlide((p) => (p + 1) % carouselSlides.length);
  const prevSlide = () =>
    setCurrentSlide(
      (p) => (p - 1 + carouselSlides.length) % carouselSlides.length
    );
  const goToSlide = (i) => setCurrentSlide(i);

  const stats = [
    { number: "500+", label: "Events Created" },
    { number: "10K+", label: "Students Connected" },
    { number: "100+", label: "Organizations" },
    { number: "50+", label: "Skills Categories" },
  ];

  const testimonials = [
    {
      name: "Nafiz Zia",
      role: "Participant",
      content:
        "Amazing opportunities to showcase my skills and connect with industry professionals.",
      rating: 5,
    },
    {
      name: "Zarek Tia",
      role: "Participant",
      content:
        "This platform has revolutionized how we organize and manage student events. Highly recommended!",
      rating: 5,
    },
    {
      name: "Nayeem Ahad",
      role: "Participant",
      content:
        "The platform makes event management so much easier. Great features and excellent support team.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Carousel Hero Section */}
      <section className="relative h-screen overflow-hidden">
        {/* Slides */}
        <div className="relative h-full">
          {carouselSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {slide.overlay && (
                <div className="absolute inset-0 bg-black bg-opacity-50" />
              )}
              <div className="relative h-full flex items-center justify-center">
                <div className="text-center text-white max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h1 className="text-4xl md:text-6xl font-bold mb-6">
                    {slide.title}
                  </h1>
                  <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      to=""
                      className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-colors duration-300 transform hover:scale-105"
                    >
                      Find Your Event
                    </Link>
                    {user && (
                      <Link
                        to="/superadmin"
                        className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <FiShield size={20} />
                        Admin Dashboard
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm"
          aria-label="Previous slide"
        >
          <FiChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm"
          aria-label="Next slide"
        >
          <FiChevronRight className="w-6 h-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-yellow-400 scale-125"
                  : "bg-white bg-opacity-50 hover:bg-opacity-75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white bg-opacity-20">
          <div
            className="h-full bg-yellow-400 transition-all duration-5000 ease-linear"
            style={{
              width: `${((currentSlide + 1) / carouselSlides.length) * 100}%`,
            }}
          />
        </div>
      </section>

      {/* Events Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Discover Amazing Events
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find the perfect events that match your interests and skills
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trending Events */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                <div className="flex items-center gap-3">
                  <FiTrendingUp className="text-2xl" />
                  <h3 className="text-xl font-bold">Trending Events</h3>
                </div>
                <p className="text-orange-100 mt-2">
                  Most popular events this week
                </p>
              </div>
              
            </div>

            {/* Latest Events */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
                <div className="flex items-center gap-3">
                  <FiCalendar className="text-2xl" />
                  <h3 className="text-xl font-bold">Latest Events</h3>
                </div>
                <p className="text-blue-100 mt-2">Fresh events just added</p>
              </div>          
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Impact in Numbers
            </h2>
            <p className="text-xl text-blue-100">
              See how we're helping students and organizations grow together
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-yellow-300 mb-2">
                  {stat.number}
                </div>
                <div className="text-lg text-blue-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Create Account
              </h3>
              <p className="text-gray-600">
                Sign up as a student or organization and complete your profile
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Discover Events
              </h3>
              <p className="text-gray-600">
                Browse events, filter by skills, and find opportunities that
                match your interests
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Connect & Participate
              </h3>
              <p className="text-gray-600">
                Join events, collaborate with others, and build your network
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
     <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <FiStar key={j} className="text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">"{t.content}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{t.name}</div>
                  <div className="text-gray-500">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> 
    </div>
  );
};

export default Home;
