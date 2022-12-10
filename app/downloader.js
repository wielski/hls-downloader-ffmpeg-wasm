import 'https://cdn.jsdelivr.net/npm/mux.js@6.2.0/dist/mux.min.js';
import { showSaveFilePicker } from 'https://cdn.jsdelivr.net/npm/native-file-system-adapter/mod.js';

import { getLevelFragments, resolveLevelWithFragments, resolveTrackWithFragments } from './hls.js';
import { PAT, generatePMT } from './utils.js';

export const downloadHls = async (hls, level, audioTrack, config) => {
  const detailedLevel = await resolveLevelWithFragments(hls, level);
  const fragments = getLevelFragments(detailedLevel);
  const detailedAudioTrack = await resolveTrackWithFragments(hls, audioTrack);
  const audioFragments = getLevelFragments(detailedAudioTrack);

  const duration = detailedLevel.details.totalduration;

  const fileHandle = await showSaveFilePicker({
    _preferPolyfill: false,
    suggestedName: 'video.mp4',
    types: [{ accept: { 'video/mp4': ['.mp4'] } }],
    excludeAcceptAllOption: false,
  });
  const writer = await fileHandle.createWritable();

  runMuxjs({
    writer,
    fragments,
    audioFragments,
    duration,
    config,
  });
};

async function runMuxjs({ writer, fragments, audioFragments, duration, config }) {
  let transmuxer = new muxjs.mp4.Transmuxer({
    remux: true,
    keepOriginalTimestamps: true,
  });

  config.onTotalFragments(fragments.length);

  const writeData = (data) => {
    writer.write(data);
    config.onDownload();
  };

  await processFragments(transmuxer, duration, fragments, audioFragments, writeData);

  writer.close();
}

function processFragments(muxer, duration, fragments, audioFragments, write) {
  return new Promise((resolve, reject) => {
    const appendNextSegments = async (segments, audioSegments) => {
      let segmentsLeft = segments.length;
      let isFirstSegment = true;

      muxer.off('data');
      muxer.on('data', (segment) => {
        if (isFirstSegment) {
          isFirstSegment = false;

          // can we update duration?
          // const duration = duration / 90000 * track.samplerate;
          // result[16] = (track.duration >>> 24) & 0xFF;
          // result[17] = (track.duration >>> 16) & 0xFF;
          // result[18] = (track.duration >>> 8) & 0xFF;
          // result[19] = (track.duration) & 0xFF;
          // segment.initSegment.set([xxxx], 36);

          let data = new Uint8Array(segment.initSegment.byteLength + segment.data.byteLength);
          data.set(segment.initSegment, 0);
          data.set(segment.data, segment.initSegment.byteLength);
          write(data);
        } else {
          write(new Uint8Array(segment.data));
        }

        if (segmentsLeft == 0) {
          resolve();
        }
      });

      for (const segmentIndex in segments) {
        const segment = segments[segmentIndex];
        const audioSegment = audioSegments[segmentIndex];

        segmentsLeft -= 1;

        // muxer.push(PAT);
        // muxer.push(
        //   generatePMT({
        //     hasVideo: true,
        //     hasAudio: true,
        //   })
        // );

        const [response, audioResponse] = await Promise.all([fetch(segment), fetch(audioSegment)]);
        muxer.push(new Uint8Array(await audioResponse.arrayBuffer()));
        muxer.push(new Uint8Array(await response.arrayBuffer()));
        muxer.flush();
      }
    };

    const segments = [...fragments];
    const audioSegments = [...audioFragments];
    appendNextSegments(segments, audioSegments);
  });
}
