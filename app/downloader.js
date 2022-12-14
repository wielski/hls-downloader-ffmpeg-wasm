import 'https://cdn.jsdelivr.net/npm/mux.js@6.2.0/dist/mux.min.js';
import { showSaveFilePicker } from 'https://cdn.jsdelivr.net/npm/native-file-system-adapter/mod.js';

import { getLevelFragments, resolveLevelWithFragments, resolveTrackWithFragments } from './hls.js';
import { PAT, generatePMT } from './utils.js';

export const downloadHls = async (hls, level, audioTrack, config) => {
  const detailedLevel = await resolveLevelWithFragments(hls, level);
  const fragments = getLevelFragments(detailedLevel);

  let audioFragments = [];

  if (audioTrack) {
    const detailedAudioTrack = await resolveTrackWithFragments(hls, audioTrack);
    audioFragments = getLevelFragments(detailedAudioTrack);
  }

  const segments = fragments.map((fragment, i) =>
    audioFragments[i] ? [fragment, audioFragments[i]] : [fragment]
  );

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
    segments,
    duration,
    config,
  });
};

async function runMuxjs({ writer, segments, duration, config }) {
  let transmuxer = new muxjs.mp4.Transmuxer();

  config.onTotalFragments(segments.length);

  const writeData = (data) => {
    writer.write(data);
    config.onDownload();
  };

  await processFragments(transmuxer, duration, segments, writeData);

  writer.close();
}

function processFragments(muxer, duration, segments, write) {
  return new Promise((resolve, reject) => {
    const appendNextSegments = async (segments, audioSegments) => {
      let segmentsLeft = segments.length;
      let isFirstSegment = true;

      let remuxedInitSegment;
      let remuxedSegments = [];
      let remuxedBytesLength = 0;

      muxer.off('data');
      muxer.on('data', (segment) => {
        remuxedSegments.push(segment);
        remuxedBytesLength += segment.data.byteLength;
        remuxedInitSegment = segment.initSegment;

        if (segmentsLeft == 0) {
          resolve();
        }
      });

      muxer.on('done', () => {
        let offset = 0;
        let bytes;

        if (isFirstSegment) {
          // can we update duration?
          // const duration = duration / 90000 * track.samplerate;
          // result[16] = (duration >>> 24) & 0xFF;
          // result[17] = (duration >>> 16) & 0xFF;
          // result[18] = (duration >>> 8) & 0xFF;
          // result[19] = (duration) & 0xFF;
          // remuxedInitSegment.set(result, 36);
          bytes = new Uint8Array(remuxedInitSegment.byteLength + remuxedBytesLength);
          bytes.set(remuxedInitSegment, offset);
          offset += remuxedInitSegment.byteLength;
          isFirstSegment = false;
        } else {
          bytes = new Uint8Array(remuxedBytesLength);
        }

        for (let j = 0, i = offset; j < remuxedSegments.length; j++) {
          bytes.set(remuxedSegments[j].data, i);
          i += remuxedSegments[j].byteLength;
        }

        console.log(muxjs.mp4.probe.tracks(bytes));

        write(bytes);

        remuxedSegments = [];
        remuxedBytesLength = 0;
      });

      muxer.on('id3Frame', function (id3Frame) {
        console.log('id3Frame', id3Frame);
      });

      muxer.on('audioTimingInfo', function (audioTimingInfo) {
        console.log('audioTimingInfo', audioTimingInfo);
      });

      muxer.on('videoTimingInfo', function (videoTimingInfo) {
        console.log('videoTimingInfo', videoTimingInfo);
      });

      for (const segmentIndex in segments) {
        const currentSegments = segments[segmentIndex];

        segmentsLeft -= 1;

        // muxer.push(PAT);
        // muxer.push(
        //   generatePMT({
        //     hasVideo: true,
        //     hasAudio: true,
        //   })
        // );

        const responses = await Promise.all(currentSegments.map((s) => fetch(s)));
        for (const response of responses) {
          muxer.push(new Uint8Array(await response.arrayBuffer()));
        }

        muxer.flush();
      }

      muxer.reset();
    };

    appendNextSegments(segments);
  });
}
