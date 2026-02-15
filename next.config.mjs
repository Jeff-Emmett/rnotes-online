/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config, { isServer, webpack }) => {
    // @xenova/transformers depends on onnxruntime-node (native .node binaries)
    // which can't be bundled by webpack. We only use the web ONNX runtime.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /onnxruntime-node/,
      })
    );
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
