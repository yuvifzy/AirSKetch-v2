import * as tf from '@tensorflow/tfjs';
import type { ScoringFeatures } from './scoring';

let model: tf.Sequential | null = null;
let warmedUp = false;

const ensureBackend = async (): Promise<void> => {
  try {
    await tf.setBackend('webgl');
    await tf.ready();
  } catch {
    await tf.setBackend('cpu');
    await tf.ready();
  }
  if (tf.getBackend() !== 'webgl' && tf.getBackend() !== 'cpu') {
    await tf.setBackend('cpu');
    await tf.ready();
  }
};

export const initModel = (): tf.Sequential => {
  if (model) return model;

  const m = tf.sequential();
  m.add(
    tf.layers.dense({
      units: 6,
      inputShape: [4],
      activation: 'relu',
      useBias: true,
    }),
  );
  m.add(
    tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
      useBias: true,
    }),
  );

  // Hand-tuned weights so output behaves sensibly without training.
  // Inputs: [normalizedLength, nfzCount, sharpTurnCount, buildingProximity]
  const w1 = tf.tensor2d(
    [
      [0.6, -0.2, 0.4, 0.1, 0.3, 0.2],
      [1.8,  0.1, 1.5, 0.0, 1.2, 1.0],
      [0.4, -0.1, 0.3, 0.2, 0.2, 0.5],
      [1.2,  0.2, 1.0, 0.1, 0.9, 0.7],
    ],
    [4, 6],
  );
  const b1 = tf.tensor1d([-0.5, 0.0, -0.3, 0.0, -0.2, -0.1]);
  const w2 = tf.tensor2d([[1.4], [-0.1], [1.2], [0.2], [1.0], [0.8]], [6, 1]);
  const b2 = tf.tensor1d([-2.0]);

  m.layers[0]!.setWeights([w1, b1]);
  m.layers[1]!.setWeights([w2, b2]);

  model = m;
  return m;
};

export const warmupModel = async (): Promise<void> => {
  if (warmedUp) return;
  await ensureBackend();
  const m = initModel();
  const dummy = tf.tensor2d([[1, 0, 0, 0]]);
  const out = m.predict(dummy) as tf.Tensor;
  await out.data();
  dummy.dispose();
  out.dispose();
  warmedUp = true;
};

export type AIResult = {
  risk: number;
  inferenceMs: number;
};

export const predictRisk = (features: ScoringFeatures): AIResult => {
  const m = initModel();
  const input = tf.tensor2d([
    [
      Math.min(features.normalizedLength, 5),
      features.nfzCount,
      Math.min(features.sharpTurnCount, 20),
      features.buildingProximityScore,
    ],
  ]);
  const start = performance.now();
  const out = m.predict(input) as tf.Tensor;
  const data = out.dataSync();
  const inferenceMs = performance.now() - start;
  input.dispose();
  out.dispose();
  return {
    risk: Math.max(0, Math.min(1, data[0]!)),
    inferenceMs,
  };
};
