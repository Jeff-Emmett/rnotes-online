/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://opennotebook.rnotes.online https://notebook.jeffemmett.com;",
          },
        ],
      },
    ];
  },
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
