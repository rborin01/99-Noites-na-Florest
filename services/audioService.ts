class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  initialize() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Prevent ear blasting
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  playScan() {
    this.initialize();
    this.playTone(800, 'sine', 0.1);
    this.playTone(1200, 'sine', 0.1, 0.1);
  }

  playAlert() {
    this.initialize();
    this.playTone(150, 'sawtooth', 0.3);
    this.playTone(100, 'sawtooth', 0.3, 0.1);
  }

  playCollect() {
    this.initialize();
    this.playTone(440, 'triangle', 0.1);
    this.playTone(880, 'triangle', 0.2, 0.1);
  }

  playLaser() {
    this.initialize();
    this.playTone(1500, 'sawtooth', 0.05);
    this.playTone(500, 'sine', 0.3, 0.05);
  }

  playAlien() {
    this.initialize();
    this.playTone(2000, 'square', 0.1);
    this.playTone(1800, 'square', 0.1, 0.1);
    this.playTone(2200, 'square', 0.2, 0.2);
  }

  playAttack() {
    this.initialize();
    if(!this.ctx || !this.masterGain) return;
    
    // Noise burst for gunshot/hit
    const bufferSize = this.ctx.sampleRate * 0.1; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }
}

export const audioService = new AudioService();