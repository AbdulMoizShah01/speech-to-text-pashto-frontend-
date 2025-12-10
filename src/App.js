import React, { useState, useRef, useEffect } from 'react';
import { 
  FaMicrophone, 
  FaStopCircle, 
  FaFileAudio, 
  FaPaperPlane, 
  FaSpinner, 
  FaCircle,
  FaRobot,
  FaUser,
  FaWaveSquare,
  FaUpload
} from 'react-icons/fa';
import { GiSoundWaves } from 'react-icons/gi';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://4d3ac419aa84.ngrok-free.app';

function App() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const animationRef = useRef(null);

  // Audio visualization effect
  useEffect(() => {
    if (recording && mediaStreamRef.current) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(mediaStreamRef.current);
      source.connect(analyser);
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setAudioLevel(0);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [recording]);

  // Recording effect
  useEffect(() => {
    if (recording) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          recordedChunksRef.current = [];
          mediaStreamRef.current = stream;
          mediaRecorderRef.current = new MediaRecorder(stream);

          mediaRecorderRef.current.ondataavailable = e => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };

          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'audio/wav' });
            setAudioBlob(blob);
            setMessages(prev => [...prev, {
              type: 'user',
              content: (
                <div className="audio-message">
                  <div className="user-avatar">
                    <FaUser />
                  </div>
                  <div className="audio-content">
                    <div className="message-header">
                      <span>You</span>
                      <span className="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <audio
                      controls
                      src={URL.createObjectURL(blob)}
                      className="audio-player"
                    />
                  </div>
                </div>
              )
            }]);
          };

          mediaRecorderRef.current.start();
        })
        .catch(err => {
          console.error('Error accessing microphone', err);
          setRecording(false);
        });
    }

    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [recording]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File upload handler
  const handleFileChange = e => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setAudioBlob(file);
      setMessages(prev => [...prev, {
        type: 'user',
        content: (
          <div className="audio-message">
            <div className="user-avatar">
              <FaUser />
            </div>
            <div className="audio-content">
              <div className="message-header">
                <span>You</span>
                <span className="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <audio
                controls
                src={URL.createObjectURL(file)}
                className="audio-player"
              />
            </div>
          </div>
        )
      }]);
    }
  };

  // Handle submit (send to backend)
  const handleSubmit = async () => {
    if (!audioBlob) return;

    setLoading(true);
    setMessages(prev => [...prev, { 
      type: 'status', 
      content: (
        <div className="status-content">
          <FaSpinner className="spinner" />
          <span>Processing your audio...</span>
        </div>
      )
    }]);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const res = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessages(prev => [
          ...prev.filter(msg => msg.type !== 'status'),
          { 
            type: 'bot', 
            content: (
              <div className="bot-message">
                <div className="bot-avatar">
                  <FaRobot />
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span>Pashto Transcription</span>
                    <span className="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="transcription-text">{data.pashto_transcription}</div>
                </div>
              </div>
            )
          },
          { 
            type: 'bot', 
            content: (
              <div className="bot-message">
                <div className="bot-avatar">
                  <FaRobot />
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span>Urdu Translation</span>
                    <span className="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="translation-text">{data.urdu_translation}</div>
                </div>
              </div>
            )
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev.filter(msg => msg.type !== 'status'),
          { 
            type: 'bot', 
            content: (
              <div className="error-message">
                <div className="error-icon">⚠️</div>
                <span>Server error occurred. Please try again.</span>
              </div>
            )
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev.filter(msg => msg.type !== 'status'),
        { 
          type: 'bot', 
          content: (
            <div className="error-message">
              <div className="error-icon">⚠️</div>
              <span>Error processing your request. Please try again.</span>
            </div>
          )
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <GiSoundWaves className="header-icon" />
          <h1>Pashto Voice Assistant</h1>
          <span className="beta-tag">BETA</span>
        </div>
      </div>

      <div className="chat-messages-area">
        <div className="welcome-message">
          <div className="bot-bubble">
            <div className="welcome-header">
              <FaRobot className="welcome-icon" />
              <h2>Pashto Transcription & Urdu Translation</h2>
            </div>
            <p>Speak in Pashto and get instant transcription with Urdu translation</p>
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon recording">
                  <FaMicrophone />
                </div>
                <div className="feature-text">
                  <strong>Record Audio</strong>
                  <span>Use microphone for real-time recording</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon upload">
                  <FaUpload />
                </div>
                <div className="feature-text">
                  <strong>Upload Files</strong>
                  <span>Support for existing audio files</span>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon process">
                  <FaPaperPlane />
                </div>
                <div className="feature-text">
                  <strong>Get Results</strong>
                  <span>Instant transcription and translation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`message-container ${msg.type}`}>
            {msg.content}
          </div>
        ))}

        <div ref={chatEndRef} className="scroll-anchor" />
      </div>

      <div className="input-controls">
        {recording && (
          <div className="recording-visualization">
            <div className="visualization-bar">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i}
                  className="visualization-column"
                  style={{
                    height: `${audioLevel * 100 * Math.random()}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <div className="recording-status">
              <FaCircle className="recording-indicator" />
              <span>Recording... Speak now</span>
            </div>
          </div>
        )}

        <div className="input-group">
          <button
            className={`record-button ${recording ? 'recording' : ''}`}
            onClick={() => setRecording(prev => !prev)}
            disabled={loading}
          >
            {recording ? (
              <FaStopCircle className="button-icon" />
            ) : (
              <FaMicrophone className="button-icon" />
            )}
            <span>{recording ? 'Stop' : 'Record'}</span>
          </button>

          <label className="file-upload-button">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={loading}
            />
            <FaFileAudio className="button-icon" />
            <span>{audioBlob ? 'Change File' : 'Upload Audio'}</span>
          </label>

          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={!audioBlob || loading}
          >
            {loading ? (
              <>
                <FaSpinner className="button-icon spinner" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <FaPaperPlane className="button-icon" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
