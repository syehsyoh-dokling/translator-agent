import { useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001';

function App() {
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState('id');
  const [targetLang, setTargetLang] = useState('en');
  const [mode, setMode] = useState('translate_and_answer');
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState('');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState(null);

  // State & ref untuk rekaman suara
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // DEBUG: menampilkan persis apa yang dikembalikan endpoint /transcribe
  const [rawTranscription, setRawTranscription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim()) {
      setError('Teks tidak boleh kosong.');
      return;
    }

    setLoading(true);
    setError(null);
    setTranslation('');
    setExplanation('');

    try {
      const res = await fetch(`${API_BASE}/api/translator/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang,
          mode
        })
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || 'Terjadi kesalahan dari server.');
        return;
      }

      setTranslation(json.data.translation || '');
      setExplanation(json.data.explanation || '');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setTranslation('');
      setExplanation('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Browser tidak mendukung getUserMedia / akses mic.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setIsTranscribing(true);
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');

          const res = await fetch(`${API_BASE}/api/translator/transcribe`, {
            method: 'POST',
            body: formData
          });

          const json = await res.json();

          // DEBUG: simpan raw text persis dari backend
          const transcribedText = json.data?.text || '';
          setRawTranscription(transcribedText);

          if (!json.success) {
            setError(json.error?.message || 'Gagal transkripsi audio.');
            return;
          }

          if (!transcribedText) {
            setError('Transkripsi kosong, coba bicara lebih jelas / lebih lama.');
            return;
          }

          // Isi textarea sumber dengan hasil transkripsi
          setText(transcribedText);
        } catch (err) {
          console.error(err);
          setError(err?.message || 'Gagal menghubungi server transcribe.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Gagal memulai rekaman. Pastikan mic diizinkan.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      mediaRecorderRef.current = null;
      setIsRecording(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Gagal menghentikan rekaman.');
      setIsRecording(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '1.5rem',
        background: '#0f172a',
        color: '#e5e7eb',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Translator Agent (Web MVP)
        </h1>
        <p style={{ marginBottom: '1.5rem', color: '#9ca3af' }}>
          • Form teks → kirim ke <code>/api/translator/chat</code> <br />
          • Rekam suara → kirim ke <code>/api/translator/transcribe</code>, hasilnya otomatis mengisi teks sumber.
        </p>

        {/* Blok kontrol mic */}
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            borderRadius: 12,
            border: '1px solid #1f2937',
            background:
              'radial-gradient(circle at top left, rgba(52,211,153,0.15), transparent 55%), #020617'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '9999px',
                background: isRecording ? '#ef4444' : '#22c55e'
              }}
            />
            <strong>Voice Input (Mic)</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              style={{
                padding: '0.4rem 1.1rem',
                borderRadius: 9999,
                border: 'none',
                fontWeight: 600,
                background: isRecording
                  ? '#b91c1c'
                  : 'linear-gradient(135deg,#22c55e,#3b82f6)',
                color: '#f9fafb',
                cursor: isTranscribing ? 'wait' : 'pointer'
              }}
            >
              {isRecording ? 'Stop Mic' : 'Start Mic'}
            </button>
            {isTranscribing && (
              <span style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>
                Mengirim audio & menunggu transkripsi...
              </span>
            )}
            {!isTranscribing && !isRecording && (
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                Tekan <strong>Start Mic</strong>, bicara/putar audio, lalu tekan <strong>Stop Mic</strong>.
                Hasil dari backend akan muncul di panel Raw Transcription dan teks sumber.
              </span>
            )}
          </div>
        </div>

        {/* Panel debug: raw transcription */}
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            borderRadius: 12,
            border: '1px solid #374151',
            background: '#020617'
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Raw Transcription (/api/translator/transcribe)
          </h2>
          <div
            style={{
              minHeight: '3rem',
              whiteSpace: 'pre-wrap',
              fontSize: '0.9rem',
              color: rawTranscription ? '#e5e7eb' : '#6b7280'
            }}
          >
            {rawTranscription || 'Belum ada data. Coba Start Mic → Stop Mic.'}
          </div>
        </div>

        {/* Form teks → GPT */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              Teks Sumber
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                border: '1px solid #374151',
                background: '#020617',
                color: '#e5e7eb',
                resize: 'vertical'
              }}
              placeholder="Teks dari transkripsi akan muncul di sini, atau tulis manual..."
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Bahasa Sumber
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 8,
                  border: '1px solid #374151',
                  background: '#020617',
                  color: '#e5e7eb'
                }}
              >
                <option value="auto">Auto</option>
                <option value="id">Indonesia</option>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>

            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Bahasa Target
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 8,
                  border: '1px solid #374151',
                  background: '#020617',
                  color: '#e5e7eb'
                }}
              >
                <option value="en">English</option>
                <option value="id">Indonesia</option>
                <option value="ar">Arabic</option>
              </select>
            </div>

            <div style={{ flex: '1 1 160px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 8,
                  border: '1px solid #374151',
                  background: '#020617',
                  color: '#e5e7eb'
                }}
              >
                <option value="translate_only">Translate Only</option>
                <option value="translate_and_answer">Translate + Answer</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1.25rem',
              borderRadius: 9999,
              border: 'none',
              fontWeight: 600,
              background: loading ? '#4b5563' : 'linear-gradient(135deg,#22c55e,#3b82f6)',
              color: '#f9fafb',
              cursor: loading ? 'wait' : 'pointer',
              alignSelf: 'flex-start'
            }}
          >
            {loading ? 'Memproses...' : 'Kirim ke GPT'}
          </button>
        </form>

        {error && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: '#7f1d1d',
              color: '#fee2e2'
            }}
          >
            Error: {error}
          </div>
        )}

        {(translation || explanation) && (
          <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
            {translation && (
              <div>
                <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Translation</h2>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    background: '#020617',
                    border: '1px solid #1f2937'
                  }}
                >
                  {translation}
                </div>
              </div>
            )}
            {explanation && (
              <div>
                <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Explanation / Answer</h2>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    background: '#020617',
                    border: '1px solid #1f2937'
                  }}
                >
                  {explanation}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
