import { h, render } from 'https://unpkg.com/preact@latest?module';
import { useState } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from 'https://unpkg.com/htm?module';

import { downloadHls } from './downloader.js';

const html = htm.bind(h);

const { createFFmpeg } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

function App(props) {
  const [url, setUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(undefined);
  const [downloadedFragments, setDownloadedFragments] = useState(0);
  const [totalFragments, setTotalFragments] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(undefined);

  const onProgress = (ratio) => {
    setProgress(ratio);
  };

  const onDownloadFragment = () => {
    setDownloadedFragments((downloadedFragments) => downloadedFragments + 1);
  };

  const onTotalFragments = (total) => {
    setTotalFragments(total);
  };

  const onError = (error) => {
    setError(error);
  };

  const onDownloadFfmpeg = async () => {
    setDownloadUrl(undefined);
    const blob = await downloadHls(ffmpeg, url, {
      onDownload: onDownloadFragment,
      onTotalFragments,
      onProgress,
      onError,
      type: 'ffmpeg',
    });
    const blobUrl = URL.createObjectURL(blob);
    setDownloadUrl(blobUrl);
  };

  const onDownloadMuxJs = async () => {
    setDownloadUrl(undefined);
    const blobUrl = await downloadHls(ffmpeg, url, {
      onDownload: onDownloadFragment,
      onTotalFragments,
      onProgress,
      onError,
      type: 'muxjs',
    });
    setDownloadUrl(blobUrl);
  };

  return html`
    <div>
      ${error && html`<p>Error: ${error}</p>`}

      <input type="text" value=${url} onInput=${(e) => setUrl(e.target.value)} />
      <button onClick=${onDownloadFfmpeg}>Start download (ffmpeg)</button>
      <button onClick=${onDownloadMuxJs}>Start download (mux.js stream)</button>

      <p>Fragments: ${downloadedFragments}/${totalFragments}</p>
      <p>ffmpeg progress: <progress value=${progress} max="1" /></p>

      ${downloadUrl &&
      html`<p>
        <a href=${downloadUrl} download="converted.mp4">Done! Download mp4</a>
      </p>`}
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('app'));
