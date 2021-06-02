module.exports = {
  helpers: {
    filename: (s) => s.replace(/\.[^/.]+$/, ""),
    dirpath: (s) => {
      if (s.endsWith("/")) {
        return s.substr(0, s.length - 1)
      }
      return s
    }
  }
}
