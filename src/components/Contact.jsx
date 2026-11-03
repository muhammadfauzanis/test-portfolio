import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowUpRight, Check, ImagePlus, Mail, MessageSquare, Send, UserRound } from 'lucide-react';
import SmartImage from './SmartImage';
import { supabase } from '../lib/supabase';
import { contact, seedComments, socials } from '../data/content';

const STORAGE_KEY = 'portfolio-contact-comments';
const COOLDOWN_SECONDS = 60;
const MAX_COMMENTS = 100;
const CONTACT_SOCIAL_ORDER = ['instagram', 'tiktok', 'github'];
// Optional: set VITE_FORMSPREE_ENDPOINT (e.g. https://formspree.io/f/xxxx) to actually send messages.
const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT;

const readLocalComments = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(parsed) ? parsed : seedComments;
  } catch {
    return seedComments;
  }
};

const saveLocalComments = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage failures.
  }
};

const fromRow = (row) => ({
  id: row.id,
  name: row.name,
  message: row.comment,
  photo: row.avatar_url,
  createdAt: row.created_at,
});

const timeAgo = (iso) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'Waktu tidak diketahui';
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} jam lalu` : `${Math.floor(hours / 24)} hari lalu`;
};

const formatCountdown = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Crop to a square and downscale to a 128px JPEG data URL.
const toAvatar = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        if (!ctx) return reject(new Error('Canvas tidak tersedia'));
        canvas.width = 128;
        canvas.height = 128;
        ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 128, 128);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState({ name: '', message: '', photo: '', photoName: '' });
  const [commentError, setCommentError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [cooldownTotal, setCooldownTotal] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldown((s) => Math.max(0, s - 1));
      if (cooldown <= 1) setCommentError('');
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!supabase) {
      setComments(readLocalComments());
      setLoadingComments(false);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('id, name, comment, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(MAX_COMMENTS);
      if (!active) return;
      if (error) setCommentError('Komentar gagal dimuat. Coba muat ulang halaman.');
      else setComments((data || []).map(fromRow));
      setLoadingComments(false);
    })();

    const channel = supabase
      .channel('comments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = fromRow(payload.new);
          setComments((list) => [row, ...list.filter((c) => c.id !== row.id)].slice(0, MAX_COMMENTS));
        } else if (payload.eventType === 'UPDATE') {
          const row = fromRow(payload.new);
          setComments((list) => list.map((c) => (c.id === row.id ? row : c)));
        } else if (payload.eventType === 'DELETE') {
          setComments((list) => list.filter((c) => c.id !== payload.old.id));
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && active)
          setCommentError('Koneksi realtime komentar terputus. Coba muat ulang halaman.');
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCommentError('Pilih file gambar yang valid.');
    } else if (file.size > 5 * 1024 * 1024) {
      setCommentError('Ukuran foto maksimal 5 MB.');
      e.target.value = '';
    } else {
      try {
        const photo = await toAvatar(file);
        setDraft((d) => ({ ...d, photo, photoName: file.name }));
        setCommentError('');
      } catch {
        setCommentError('Foto tidak dapat dibaca. Coba pilih gambar lain.');
      }
    }
  };

  const onComment = async (e) => {
    e.preventDefault();
    setCommentError('');
    const name = draft.name.trim();
    const message = draft.message.trim();
    setPosting(true);
    try {
      let created;
      if (supabase) {
        const { data, error } = await supabase
          .from('comments')
          .insert({ name, comment: message, avatar_url: draft.photo || null })
          .select('id, name, comment, avatar_url, created_at')
          .single();
        if (error) {
          setCommentError(`Supabase: ${error.message || 'Komentar gagal dikirim. Coba lagi sebentar.'}`);
          return;
        }
        created = fromRow(data);
      } else {
        created = { id: `local-${Date.now()}`, name, message, photo: draft.photo || null, createdAt: new Date().toISOString() };
      }
      setComments((list) => {
        const next = [created, ...list.filter((c) => c.id !== created.id)].slice(0, MAX_COMMENTS);
        if (!supabase) saveLocalComments(next);
        return next;
      });
      setCooldownTotal(COOLDOWN_SECONDS);
      setCooldown(COOLDOWN_SECONDS);
      setDraft({ name: '', message: '', photo: '', photoName: '' });
    } catch (error) {
      console.error('Comment submission failed:', error);
      setCommentError('Komentar gagal dikirim. Coba lagi sebentar.');
    } finally {
      setPosting(false);
    }
  };

  const onSend = async (e) => {
    e.preventDefault();
    setSendError('');
    setSending(true);
    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();
    try {
      if (FORMSPREE_ENDPOINT) {
        const res = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message, _replyto: email, _subject: `Pesan portfolio dari ${name}` }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = body.errors?.map((err) => err.message).filter(Boolean).join(' ');
          throw new Error(detail || `Formspree menolak pesan (HTTP ${res.status}).`);
        }
      } else {
        // Placeholder mode: pretend to send.
        await new Promise((r) => setTimeout(r, 900));
      }
    } catch (error) {
      console.error('Contact message submission failed:', error);
      setSendError(error.message || 'Email gagal dikirim. Coba lagi sebentar.');
      setSending(false);
      return;
    }
    setSending(false);
    setSent(true);
    setForm({ name: '', email: '', message: '' });
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#2c67ed', '#38bdf8', '#818cf8', '#00f0ff'] });
    } catch {
      // Confetti is decorative.
    }
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <section className="contact-root-section" id="Contact" aria-labelledby="contact-section-heading">
      <div className="contact-container-inner">
        <h2 className="section-display-title" id="contact-section-heading">
          Hubungi saya
        </h2>
        <div className="contact-main-grid contact-layout">
          <div className="contact-panel contact-message-panel">
            <h2 className="contact-section-title">Hubungi</h2>
            <p className="contact-panel-intro">{contact.intro}</p>
            <form onSubmit={onSend} className="contact-actual-form">
              <div className="contact-form-field">
                <label htmlFor="user-name">Nama</label>
                <div className="contact-input-wrap">
                  <UserRound size={17} aria-hidden="true" />
                  <input
                    id="user-name"
                    name="name"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Nama Anda"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="contact-form-field">
                <label htmlFor="user-email">Email</label>
                <div className="contact-input-wrap">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    id="user-email"
                    name="email"
                    type="email"
                    required
                    maxLength={320}
                    placeholder="Email Anda"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="contact-form-field">
                <label htmlFor="user-msg">Pesan</label>
                <div className="contact-input-wrap contact-textarea-wrap">
                  <MessageSquare size={17} aria-hidden="true" />
                  <textarea
                    id="user-msg"
                    name="message"
                    rows={4}
                    required
                    maxLength={5000}
                    placeholder="Pesan Anda"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" disabled={sending} className="contact-submit-btn">
                <Send size={16} aria-hidden="true" />
                <span>{sending ? 'Mengirim...' : 'Kirim Pesan'}</span>
              </button>
              {sendError && (
                <p className="contact-comment-error" role="alert">
                  {sendError}
                </p>
              )}
              {sent && (
                <div className="contact-success-toast" role="status">
                  <Check size={18} />
                  <span>Pesan berhasil dikirim. Terima kasih!</span>
                </div>
              )}
            </form>

            <div className="contact-find-me">
              <h3>FIND ME</h3>
              <div className="contact-social-grid">
                {CONTACT_SOCIAL_ORDER.map((key) => socials.find((s) => s.key === key)).filter(Boolean).map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`contact-social-card contact-social-card--${s.key}`}
                  >
                    <span className="contact-social-icon-box">
                      <SmartImage className={`contact-social-logo contact-social-logo--${s.key}`} src={s.logo} alt="" />
                    </span>
                    <span className="contact-social-text">
                      <span className="contact-social-label">{s.label}</span>
                      <span className="contact-social-sub">{s.handle}</span>
                    </span>
                    <ArrowUpRight size={16} className="contact-social-arrow" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="contact-comments-panel">
            <div className="contact-comments-header">
              <span className="contact-comments-icon">
                <MessageSquare size={19} />
              </span>
              <h2>
                Komentar <span>({comments.length})</span>
              </h2>
            </div>
            <form onSubmit={onComment} className="contact-comment-form">
              <div className="contact-form-field">
                <label htmlFor="comment-name">Nama</label>
                <input
                  id="comment-name"
                  type="text"
                  required
                  maxLength={50}
                  placeholder="Masukkan nama kamu"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="contact-form-field">
                <label htmlFor="comment-message">Komentar</label>
                <textarea
                  id="comment-message"
                  required
                  maxLength={500}
                  rows={4}
                  placeholder="Tulis komentar kamu di sini..."
                  value={draft.message}
                  onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                />
              </div>
              <div className="contact-form-field">
                <label htmlFor="comment-photo">Foto Profil (opsional)</label>
                <label className="contact-photo-picker" htmlFor="comment-photo">
                  <ImagePlus size={17} aria-hidden="true" />
                  <span>{draft.photoName || 'Pilih Foto Profil'}</span>
                </label>
                <input className="contact-photo-input" id="comment-photo" type="file" accept="image/*" onChange={onPhoto} />
                <span className="contact-photo-hint">Ukuran file maksimal 5 MB</span>
              </div>
              {commentError && (
                <p className="contact-comment-error" role="alert">
                  {commentError}
                </p>
              )}
              <button type="submit" className="contact-submit-btn" disabled={posting || cooldown > 0}>
                <Send size={15} aria-hidden="true" />
                <span>{posting ? 'Mengirim...' : cooldown > 0 ? `Kirim lagi ${formatCountdown(cooldown)}` : 'Kirim Komentar'}</span>
              </button>
              {cooldown > 0 && (
                <div
                  className="contact-comment-cooldown"
                  role="progressbar"
                  aria-label={`Waktu tunggu komentar: ${formatCountdown(cooldown)} tersisa`}
                  aria-valuemin={0}
                  aria-valuemax={cooldownTotal}
                  aria-valuenow={cooldown}
                >
                  <span className="contact-comment-cooldown-progress" style={{ width: `${(cooldown / cooldownTotal) * 100}%` }} />
                </div>
              )}
              {cooldown > 0 && (
                <p className="contact-comment-cooldown-label" role="status" aria-live="polite">
                  Bisa komentar lagi dalam {formatCountdown(cooldown)}
                </p>
              )}
            </form>

            <div className="contact-comments-list" aria-live="polite" aria-busy={loadingComments}>
              {loadingComments ? (
                <div className="contact-comment-skeleton-list" role="status" aria-label="Memuat komentar">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="contact-comment-skeleton" aria-hidden="true">
                      <span className="skeleton-block contact-comment-skeleton-avatar" />
                      <span className="contact-comment-skeleton-copy">
                        <span className="skeleton-block contact-comment-skeleton-name" />
                        <span className="skeleton-block contact-comment-skeleton-line" />
                        <span className="skeleton-block contact-comment-skeleton-line contact-comment-skeleton-line-short" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : comments.length ? (
                comments.map((c) => (
                  <article key={c.id} className="contact-comment-item">
                    {c.photo ? (
                      <SmartImage className="contact-comment-avatar" src={c.photo} alt="" />
                    ) : (
                      <span className="contact-comment-avatar contact-comment-avatar-fallback">
                        <UserRound size={17} aria-hidden="true" />
                      </span>
                    )}
                    <div className="contact-comment-content">
                      <div className="contact-comment-meta">
                        <strong>{c.name}</strong>
                        <time dateTime={c.createdAt}>{timeAgo(c.createdAt)}</time>
                      </div>
                      <p>{c.message}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="contact-comments-empty">Belum ada komentar. Jadilah yang pertama!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
