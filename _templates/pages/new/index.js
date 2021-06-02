module.exports = {
  prompt: ({ prompter, args }) => {
    if (args.dir) {
      return prompter.prompt({
        type: 'input',
        name: 'name',
        message: "Please type file name(not including extension):"
      })
    }
    return prompter
      .prompt({
        type: 'input',
        name: 'dir',
        message: "Please type dir name(e.g. 'path1/path2'):"
      })
      .then(() =>
        prompter.prompt({
          type: 'input',
          name: 'name',
          message: "Please type file name(not including extension):"
        })
      )
  }
}
