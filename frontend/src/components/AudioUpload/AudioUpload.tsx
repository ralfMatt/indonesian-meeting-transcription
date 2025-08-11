import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, Check } from 'lucide-react';
import './AudioUpload.css';

interface AudioUploadProps {
  onUpload: (file: File) => void;
  onProgress?: (progress: number) => void;
  maxSize?: number; // in bytes
  disabled?: boolean;
}

const ACCEPTED_FORMATS = {
  'audio/mp3': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/m4a': ['.m4a'],
  'audio/mpeg': ['.mp3'],
  'audio/x-wav': ['.wav'],
  'audio/mp4': ['.m4a']
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB default

export const AudioUpload: React.FC<AudioUploadProps> = ({
  onUpload,
  onProgress,
  maxSize = MAX_FILE_SIZE,
  disabled = false
}) => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    // Check file format
    const isValidFormat = Object.keys(ACCEPTED_FORMATS).some(format => 
      file.type === format || file.name.toLowerCase().match(new RegExp(`\\${ACCEPTED_FORMATS[format as keyof typeof ACCEPTED_FORMATS][0]}$`))
    );

    if (!isValidFormat) {
      return 'Invalid file format. Supported formats: MP3, WAV, M4A';
    }

    return null;
  };

  const handleFileDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const error = validateFile(file);

    if (error) {
      setErrorMessage(error);
      setUploadStatus('error');
      return;
    }

    setErrorMessage('');
    setUploadStatus('uploading');
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setUploadStatus('success');
          onUpload(file);
          return 100;
        }
        onProgress?.(newProgress);
        return newProgress;
      });
    }, 200);

  }, [onUpload, onProgress, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: ACCEPTED_FORMATS,
    multiple: false,
    disabled: disabled || uploadStatus === 'uploading'
  });

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
  };

  const getUploadAreaContent = () => {
    if (uploadStatus === 'uploading') {
      return (
        <div className="upload-progress">
          <div className="progress-bar" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p>Uploading... {Math.round(uploadProgress)}%</p>
        </div>
      );
    }

    if (uploadStatus === 'success') {
      return (
        <div className="upload-success">
          <Check size={48} className="success-icon" />
          <h3>Upload Complete</h3>
          <p>Audio file uploaded successfully</p>
          <button onClick={resetUpload} className="btn-secondary">
            Upload Another File
          </button>
        </div>
      );
    }

    if (uploadStatus === 'error') {
      return (
        <div className="upload-error">
          <AlertCircle size={48} className="error-icon" />
          <h3>Upload Failed</h3>
          <p>{errorMessage}</p>
          <button onClick={resetUpload} className="btn-secondary">
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className="upload-prompt">
        <Upload size={48} className="upload-icon" />
        <h3>Upload Audio File</h3>
        <p className="upload-description">
          {isDragActive ? 'Drop audio file here' : 'Drag and drop audio file here, or click to browse'}
        </p>
        <p className="upload-formats">
          Supported formats: MP3, WAV, M4A (max {Math.round(maxSize / 1024 / 1024)}MB)
        </p>
      </div>
    );
  };

  return (
    <div className="audio-upload-container">
      <div
        {...getRootProps({
          className: `audio-upload-area ${isDragActive ? 'drag-active' : ''} ${uploadStatus}`,
          'aria-label': 'Upload audio file for transcription'
        })}
        role="button"
        tabIndex={0}
      >
        <input {...getInputProps({ 'aria-label': 'Upload audio file' })} />
        {getUploadAreaContent()}
      </div>

      {uploadStatus === 'idle' && (
        <div className="upload-tips">
          <h4>Tips for best results:</h4>
          <ul>
            <li>Ensure clear audio quality with minimal background noise</li>
            <li>Use a good microphone for recording meetings</li>
            <li>Keep audio files under {Math.round(maxSize / 1024 / 1024)}MB for optimal processing</li>
            <li>Indonesian language is optimized for transcription accuracy</li>
          </ul>
        </div>
      )}
    </div>
  );
};