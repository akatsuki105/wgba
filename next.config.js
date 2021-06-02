module.exports = {
  webpack: config => {
    // Unset client-side javascript that only works server-side
    config.resolve.fallback = { fs: false, module: false }
    return config
  },
  env: {
    server: 'https://localhost:8080',
  },
  future: {
    webpack5: true,
  },
}
