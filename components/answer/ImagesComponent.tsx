'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

interface Image {
  link: string;
  alt?: string;
}

interface ImagesComponentProps {
  images: Image[];
}

export default function ImagesComponent({ images }: ImagesComponentProps) {
  const [loadedImages, setLoadedImages] = useState<boolean[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setLoadedImages(Array(images.length).fill(false));
  }, [images]);

  const handleImageLoad = (index: number) => {
    setLoadedImages((prevLoadedImages) => {
      const updatedLoadedImages = [...prevLoadedImages];
      updatedLoadedImages[index] = true;
      return updatedLoadedImages;
    });
  };

  const nextImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const openLightbox = (index: number) => {
    setPhotoIndex(index);
    setIsOpen(true);
  };

  const ImagesSkeleton = () => (
    <div className="w-full h-40 bg-gray-800 rounded-lg animate-pulse"></div>
  );

  return (
    <div className="bg-neutral-800 rounded-lg border border-stone-700 p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 10C9.32843 10 10 9.32843 10 8.5C10 7.67157 9.32843 7 8.5 7C7.67157 7 7 7.67157 7 8.5C7 9.32843 7.67157 10 8.5 10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 15L16 10L5 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-gray-200">Images</h2>

        {images.length > 1 && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={prevImage}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={nextImage}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {images.length === 0 ? (
        <ImagesSkeleton />
      ) : (
        <div className="relative overflow-hidden rounded-lg aspect-video">
          {images.map((image, index) => (
            <div
              key={image.link}
              className={`absolute inset-0 transition-opacity duration-300 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
              {!loadedImages[index] && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin"></div>
                </div>
              )}
              <img
                src={image.link || '/placeholder.svg'}
                alt={image.alt || 'Image'}
                className={`w-full h-full object-cover ${loadedImages[index] ? 'block' : 'hidden'}`}
                onLoad={() => handleImageLoad(index)}
              />
              <button
                onClick={() => openLightbox(index)}
                className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800/80 text-gray-300 hover:text-white transition-colors">
                <ZoomIn size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white transition-colors">
            <X size={20} />
          </button>

          <button
            onClick={() => setPhotoIndex((photoIndex - 1 + images.length) % images.length)}
            className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>

          <img
            src={images[photoIndex].link || '/placeholder.svg'}
            alt={images[photoIndex].alt || 'Image'}
            className="max-w-full max-h-[80vh] object-contain"
          />

          <button
            onClick={() => setPhotoIndex((photoIndex + 1) % images.length)}
            className="absolute right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-neutral-800/80 rounded-full px-3 py-1.5">
            <span className="text-sm text-gray-300">
              {photoIndex + 1} / {images.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
