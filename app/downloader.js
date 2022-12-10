import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
import 'https://cdn.jsdelivr.net/npm/mux.js@6.2.0/dist/mux.min.js';

const { fetchFile } = FFmpeg;

export function downloadHls(ffmpeg, url, config) {
  return new Promise((resolve, reject) => {
    const hls = new Hls({
      debug: true,
      fLoader: (_context) => {}, // Disable fragment loading
    });

    hls.on(Hls.Events.LEVEL_LOADED, async (_event, level) => {
      const fragments = await parseFragmentUrls(level);
      if (!fragments) {
        reject(new Error('No fragments found'));
        return;
      }

      switch (config.type) {
        case 'ffmpeg':
          resolve(await runFfmpeg(ffmpeg, fragments, config));
          break;
        case 'muxjs':
          resolve(await runMuxjs(fragments, config));
          break;
      }
    });

    hls.loadSource(url);
  });
}

function parseFragmentUrls(level) {
  return (level.details.fragments || []).map((f) => f.url);
}

// ffmpeg example
async function runFfmpeg(ffmpeg, fragments, config) {
  ffmpeg.setProgress(({ ratio }) => {
    onProgress(ratio);
  });

  ffmpeg.setLogger(({ type, message }) => {
    console.log(type, message);
  });

  await ffmpeg.load();

  config.onTotalFragments(fragments.length);

  const fragmentDownload = fragments.map((f, i) =>
    downloadSegment(ffmpeg, f, `${i}.ts`, config.onDownload)
  );
  const fragmentFilenames = await Promise.all(fragmentDownload);

  const playlistFragments = fragmentFilenames
    .map((f) => {
      return `file '${f}'`;
    })
    .join('\n');

  ffmpeg.FS('writeFile', 'fragments.txt', playlistFragments);

  await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'fragments.txt', '-c', 'copy', 'output.mp4');

  const data = ffmpeg.FS('readFile', 'output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

async function downloadSegment(ffmpeg, url, filename, onDownload) {
  console.log('Downloading segment', url);
  ffmpeg.FS('writeFile', filename, await fetchFile(url));
  console.log('Downloading segment', filename);
  onDownload();
  return filename;
}

// mux.js example
async function runMuxjs(fragments, config) {
  const newHandle = await window.showSaveFilePicker({
    types: [
      {
        description: 'Video file',
        accept: { 'video/mp4': ['.mp4'] },
      },
    ],
  });
  const writer = await newHandle.createWritable();

  return new Promise((resolve, reject) => {
    let transmuxer = new muxjs.mp4.Transmuxer();

    const appendFirstSegment = () => {
      const segments = [...fragments];
      config.onTotalFragments(segments.length);

      if (segments.length == 0) {
        return;
      }

      transmuxer.on('data', (segment) => {
        let data = new Uint8Array(segment.initSegment.byteLength + segment.data.byteLength);
        data.set(segment.initSegment, 0);
        data.set(segment.data, segment.initSegment.byteLength);
        writer.write(data);
        appendNextSegments(segments);
      });

      fetch(segments.shift())
        .then((response) => {
          return response.arrayBuffer();
        })
        .then((response) => {
          transmuxer.push(new Uint8Array(response));
          transmuxer.flush();
        });
    };

    const appendNextSegments = async (segments) => {
      let segmentsLeft = segments.length;

      transmuxer.off('data');
      transmuxer.on('data', (segment) => {
        writer.write(new Uint8Array(segment.data));

        if (segmentsLeft == 0) {
          writer.close();
          resolve();
        }
      });

      for (const segment of segments) {
        segmentsLeft -= 1;
        const response = await fetch(segment);
        transmuxer.push(new Uint8Array(await response.arrayBuffer()));
        transmuxer.flush();
        config.onDownload();
      }
    };

    appendFirstSegment();
  });
}
