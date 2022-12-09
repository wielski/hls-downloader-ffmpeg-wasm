import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';

export function downloadHls(url, onProgress) {
  return new Promise((resolve, reject) => {
    if (!Hls.isSupported()) {
      reject(new Error('HLS is not supported'));
      return;
    }

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

      resolve(await runFfmpeg(fragments));
    });

    hls.loadSource(url);
  });
}

function parseFragmentUrls(level) {
  return (level.details.fragments || []).map((f) => f.url);
}

async function runFfmpeg(fragments) {
  const { createFFmpeg, fetchFile } = FFmpeg;

  const ffmpeg = createFFmpeg({ log: true });

  ffmpeg.setProgress(({ ratio }) => {
    onProgress(ratio);
  });

  ffmpeg.setLogger(({ type, message }) => {
    console.log(type, message);
  });

  await ffmpeg.load();

  const fragmentFilenames = [];
  for (const index in fragments) {
    const fragment = fragments[index];
    const fragmentFilename = `${index}.ts`;
    console.log('Downloading fragment...', fragment);
    ffmpeg.FS('writeFile', fragmentFilename, await fetchFile(fragment));
    fragmentFilenames.push(fragmentFilename);
    console.log('Downloaded fragment', fragmentFilename);
  }

  const playlistFragments = fragmentFilenames
    .map((f) => {
      return `file '${f}'`;
    })
    .join('\n');

  console.log('Fragments:', playlistFragments);

  ffmpeg.FS('writeFile', 'fragments.txt', playlistFragments);

  await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'fragments.txt', '-c', 'copy', 'output.mp4');

  const data = ffmpeg.FS('readFile', 'output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}
