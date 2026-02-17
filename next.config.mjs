/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config, { isServer, webpack }) => {
    // Ignore onnxruntime-node if any dependency pulls it in.
    // We only use the browser ONNX runtime (loaded from CDN at runtime).
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
