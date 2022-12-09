import { h, render } from 'https://unpkg.com/preact@latest?module';
import { useState } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from 'https://unpkg.com/htm?module';

import { downloadHls } from './downloader.js';

const html = htm.bind(h);

function App(props) {
  const [url, setUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(undefined);

  const onProgress = (ratio) => {
    console.log(ratio);
  };

  const onDownload = async () => {
    setDownloadUrl(undefined);
    const blob = await downloadHls(url, onProgress);
    const blobUrl = URL.createObjectURL(blob);
    setDownloadUrl(blobUrl);
  };

  return html`
    <div>
      <input type="text" value=${url} onInput=${(e) => setUrl(e.target.value)} />
      <button onClick=${onDownload}>Start download</button>
      ${downloadUrl && html`<a href=${downloadUrl} download="converted.mp4">Done! Download mp4</a>`}
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('app'));
