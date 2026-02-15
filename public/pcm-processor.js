/**
 * AudioWorklet processor that captures raw PCM16 audio for WebSocket streaming.
 * Runs in a separate thread, sends Int16 buffers to the main thread.
 */
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0]; // mono channel
      // Convert float32 [-1, 1] to int16 [-32768, 32767]
      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = s < 0 ? s * 32768 : s * 32767;
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
