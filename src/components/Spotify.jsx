import { useState } from 'react';
import { ArrowUpRight, EighthNote, MoreHorizontal, Play, Pause, PlusCircle, SkipBack, SkipForward } from 'lucide-react';
import { spotify } from '../data/content';

function SpotifyLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <path
        d="M17.4 10.6C14.5 8.9 9.8 8.7 7.1 9.5a.8.8 0 1 1-.5-1.6c3.1-.9 8.3-.8 11.6 1.2a.8.8 0 0 1-.8 1.5Zm-.1 2.6a.7.7 0 0 1-1 .2c-2.4-1.5-6.1-1.9-8.9-1a.7.7 0 1 1-.4-1.4c3.3-1 7.3-.5 10.1 1.2.3.2.4.7.2 1Zm-1.1 2.5a.6.6 0 0 1-.8.2c-2.1-1.3-4.8-1.6-7.9-.9a.6.6 0 1 1-.3-1.1c3.4-.8 6.4-.4 8.8 1 .3.2.4.5.2.8Z"
        fill="#121212"
      />
    </svg>
  );
}

// Static stand-in for the Spotify embed so the section works without a real playlist.
function MockPlayer() {
  const { playlist } = spotify;
  const [playing, setPlaying] = useState(false);
  return (
    <div className="spotify-embed spotify-mock" role="group" aria-label={`Playlist ${playlist.title} (placeholder)`}>
      <div className="spotify-mock-header">
        <img className="spotify-mock-cover" src={playlist.cover} alt="" />
        <div className="spotify-mock-meta">
          <strong>{playlist.title}</strong>
          <span className="spotify-mock-owner">
            <em>Preview</em> {playlist.owner}
          </span>
          <span className="spotify-mock-save">
            <PlusCircle size={18} /> Save on Spotify
          </span>
          <div className="spotify-mock-controls">
            <SkipBack size={16} fill="currentColor" />
            <SkipForward size={16} fill="currentColor" />
            <MoreHorizontal size={18} />
            <button type="button" className="spotify-mock-play" onClick={() => setPlaying((v) => !v)} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
          </div>
        </div>
        <span className="spotify-mock-brand">
          <SpotifyLogo />
        </span>
      </div>
      <ol className="spotify-mock-tracks">
        {playlist.tracks.map((track, i) => (
          <li key={track.title} className={playing && i === 0 ? 'is-playing' : ''}>
            <span className="spotify-mock-index">{i + 1}</span>
            <span className="spotify-mock-track">
              <strong>{track.title}</strong>
              <small>{track.artist}</small>
            </span>
            <span className="spotify-mock-duration">{track.duration}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Spotify() {
  return (
    <section className="spotify-section" aria-labelledby="spotify-section-heading">
      <div className="spotify-card">
        <div className="spotify-copy">
          <h2 id="spotify-title">
            {spotify.titleTop}
            <br />
            <span>{spotify.titleBottom}</span>
          </h2>
          <p className="spotify-description">{spotify.description}</p>
          <a className="spotify-open-link" href={spotify.url} target="_blank" rel="noopener noreferrer">
            <EighthNote size={17} />
            <span>{spotify.linkLabel}</span>
            <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="spotify-player-frame">
          <MockPlayer />
        </div>
      </div>
    </section>
  );
}
