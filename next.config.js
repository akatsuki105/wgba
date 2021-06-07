module.exports = {
  webpack: (config, { isServer, dev }) => {
    // Unset client-side javascript that only works server-side
    config.resolve.fallback = { fs: false, module: false };
    config.output.chunkFilename = isServer
      ? `${dev ? "[name]" : "[name].[fullhash]"}.js`
      : `static/chunks/${dev ? "[name]" : "[name].[fullhash]"}.js`;

    config.module.rules.push({
      test: /\.gba/,
      use: [
        {
          loader: 'arraybuffer-loader',
        },
      ],
    })

    config.experiments = { topLevelAwait: true };
    return config
  },
  future: {
    webpack5: true,
  },
}
