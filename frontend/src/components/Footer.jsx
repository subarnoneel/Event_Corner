import React from "react";
import logos from "../assets/EVENT.png";
import { IoLogoGooglePlaystore } from "react-icons/io5";
import { FaApple } from "react-icons/fa";
import { FaFacebookF, FaGithub, FaLinkedinIn, FaYoutube } from "react-icons/fa";


const Footer = () => {
  return (
    <div>
      <footer className="footer flex flex-col lg:flex-row justify-between bg-gray-200 text-gray-900 p-10 border-t border-gray-200 transition-colors duration-300 space-y-8 lg:space-y-0">
        <aside>
          <img src={logos} alt="Event Lagbe" className="h-12" />
          <p className="text-gray-700 transition-colors duration-300">
            Event Corner
            <br />
            Your one click Event Finder
          </p>
        </aside>
        <nav>
          <h6 className="footer-title text-gray-900 font-semibold transition-colors duration-300">Follow Us</h6>
          <div className="grid grid-flow-col gap-4 text-2xl">
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="link link-hover text-gray-600 hover:text-blue-600 transition-colors duration-200"><FaFacebookF /></a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="link link-hover text-gray-600 hover:text-gray-900 transition-colors duration-200"><FaGithub /></a>
            <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="link link-hover text-gray-600 hover:text-blue-700 transition-colors duration-200"><FaLinkedinIn /></a>
            <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="link link-hover text-gray-600 hover:text-red-600 transition-colors duration-200"><FaYoutube /></a>
          </div>
        </nav>

        <nav>
          <h6 className="footer-title text-gray-900 font-semibold transition-colors duration-300">Download Apps</h6>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-black text-white hover:bg-gray-900 transition-colors duration-200">
            <IoLogoGooglePlaystore className="text-2xl" />
              <div className="text-left">
                <div className="text-xs text-gray-400">GET IT ON</div>
                <div className="text-base font-medium">Google Play</div>
              </div>
            </a>
            <a href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-black text-white hover:bg-gray-900 transition-colors duration-200">
            <FaApple className="text-2xl" />
              <div className="text-left">
                <div className="text-xs text-gray-400">Download on the</div>
                <div className="text-base font-medium">App Store</div>
              </div>
            </a>
          </div>
        </nav>
      </footer>
    </div>
  );
};

export default Footer;
