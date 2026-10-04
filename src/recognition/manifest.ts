export const UPSTREAM = '2a122d00d25c8d112a90e47bf235a021e0c53b0c';
export const manifest = {
  version: 'milo1-mtg52-cornelius2.12',
  models: {
    detector: 'https://huggingface.co/HanClinto/cornelius/resolve/9280009f5a66f75f952820d9dadb894909b759b7/cornelius-2.12.onnx',
    milo: 'https://huggingface.co/HanClinto/milo/resolve/9bcc5e809e936b8c5630d1e7101aae1de1e76621/model.onnx',
  },
  model_sizes: { detector: 4407545, milo: 5191100 },
  model_hashes: { detector: 'sha256:650da3cc3e9ac778c6951de631f824ec1e63bdabf3aaa39a35d7435af625612e', milo: 'sha256:bd13d8d60383c69da04dce261f32e93fdaeaa8fd618fbc991e7385f71b3d45df' },
  detector: { input_size: 384, preprocess: 'imagenet-rgb', outputs: { corners: 'corners', presence: 'presence', sharpness: 'sharpness' } },
  catalog: { rows: 113113, dims: 128 },
};
