import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const ImageUpload = ({ value, onChange, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; 
  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('סוג קובץ לא נתמך. אנא העלה תמונה (JPG, PNG, GIF, WebP)');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('הקובץ גדול מדי. מקסימום 5MB');
      return false;
    }
    setError('');
    return true;
  };

  const processFile = useCallback((file) => {
    if (!validateFile(file)) return;

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      onChange(dataUrl);
      setIsLoading(false);
      setError('');
    };

    reader.onerror = () => {
      setError('שגיאה בקריאת הקובץ');
      setIsLoading(false);
    };

    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
    setError('');
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDropZoneKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (value) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative group">
          <img 
            src={value} 
            alt="" 
            className="w-full h-48 object-contain rounded-2xl border border-zinc-800 bg-zinc-900"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 left-2 bg-red-600 hover:bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            type="button"
            aria-label="הסר תמונה"
          >
            <X size={16} aria-hidden="true" />
          </button>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-2xl flex items-center justify-center">
            <button
              onClick={handleClick}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 bg-zinc-900/90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-opacity"
              type="button"
            >
              החלף תמונה
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        {error && (
          <p className="text-red-300 text-xs mt-2 text-right" role="alert">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-label="גרור תמונה לכאן או לחץ לבחירה"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleDropZoneKey}
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-red-600 bg-red-600/10' 
            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/30'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        {isLoading ? (
          <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" aria-hidden="true"></div>
            <p className="text-zinc-300 text-sm">טוען תמונה...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center" aria-hidden="true">
              <Upload size={24} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-white font-bold mb-1">גרור תמונה לכאן או לחץ לבחירה</p>
              <p className="text-zinc-400 text-xs">JPG, PNG, GIF או WebP (מקסימום 5MB)</p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-300 text-xs mt-2 text-right" role="alert">{error}</p>
      )}
      {!value && !error && (
        <div className="mt-2 text-right">
          <label htmlFor="image-upload-url" className="text-zinc-400 text-xs">או הזן כתובת URL:</label>
          <input
            id="image-upload-url"
            type="text"
            placeholder="https://..."
            className="w-full mt-2 bg-black/40 border border-zinc-800 p-3 rounded-xl focus:border-red-600 outline-none text-white text-right text-sm"
            onBlur={(e) => {
              const url = e.target.value.trim();
              if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                onChange(url);
              } else if (url) {
                setError('אנא הזן כתובת URL תקינה');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;






