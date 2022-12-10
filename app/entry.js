import { h, render } from 'https://unpkg.com/preact@latest?module';
import { useState } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from 'https://unpkg.com/htm?module';

import { mkHlsInstance, getLevelsList, getAudioTracksList } from './hls.js';
import { downloadHls } from './downloader.js';

const html = htm.bind(h);
const hls = mkHlsInstance();

function App(props) {
  const [url, setUrl] = useState('');
  const [downloadedFragments, setDownloadedFragments] = useState(0);
  const [totalFragments, setTotalFragments] = useState(0);
  const [error, setError] = useState(undefined);
  const [levels, setLevels] = useState([]);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(undefined);

  const onDownloadFragment = () => {
    setDownloadedFragments((downloadedFragments) => downloadedFragments + 1);
  };

  const onTotalFragments = (total) => {
    setTotalFragments(total);
  };

  const onError = (error) => {
    setError(error);
  };

  const onLoadLevels = async () => {
    if (!url) return;
    const levels = await getLevelsList(hls, url);
    const tracks = await getAudioTracksList(hls);

    setAudioTracks(tracks);
    setLevels(levels);

    if (tracks.length > 0) {
      setSelectedAudio(tracks[0]);
    }
  };

  const onDownload = async (level) => {
    setDownloadedFragments(0);
    setTotalFragments(0);

    await downloadHls(hls, level, selectedAudio, {
      onDownload: onDownloadFragment,
      onTotalFragments,
      onError,
    });
  };

  return html`
    <div>
      ${error && html`<p>Error: ${error}</p>`}

      <input type="text" value=${url} onInput=${(e) => setUrl(e.target.value)} />
      <button onClick=${onLoadLevels}>Download</button>

      <p>
        <select onChange=${(e) => setSelectedAudio(audioTracks[e.target.value])}>
          ${audioTracks.map((track, i) => html`<option value=${i}>${track.name}</option>`)}
        </select>
      </p>
      <p>
        ${levels.map(
          (level) => html`<button onClick=${() => onDownload(level)}>${level.height} MP4</button>`
        )}
      </p>

      <p>Fragments: ${downloadedFragments}/${totalFragments}</p>
      <p>Progress: <progress value="${downloadedFragments / totalFragments}" max="1" /></p>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('app'));
