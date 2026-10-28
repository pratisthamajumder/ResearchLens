/** @type {import('next').NextConfig} */
const nextConfig = {
  // These packages ship native binaries (ONNX runtime, sharp) and must be
  // loaded by Node at runtime instead of being bundled by Next.js.
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node', 'sharp'],
};

export default nextConfig;
