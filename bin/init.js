const program = require('commander')
const path = require('path')
const fs = require('fs')
const glob = require('glob')
const download = require('../lib/download')

function go (rootName) {
  download(rootName)
    .then(target => console.log(target))
    .catch(err => console.log(err))
}

function init () {
  try {
    program.usage('<project-name>')
      .parse(process.argv)
    let projectName = program.args[1]
    if (!projectName) {
      program.help()
      return
    }

    /* 遍历当前目录 */
    const list = glob.sync('*')

    let rootName = path.basename(process.cwd())
    /* 当前目录下有东西 */
    if (list.length) {
      if (list.filter(name => {
        const fileName = path.resolve(process.cwd(), path.join('.', name))
        const isDir = fs.stat(fileName).isDirectory()
        return name.indexOf(projectName) !== -1 && isDir
      }).length === 0) {
        console.log(`项目${projectName}已存在`)
        return
      }
      rootName = projectName
    } else if (rootName === projectName) {
      rootName = '.'
    } else {
      rootName = projectName
    }
    go(rootName)
  } catch (e) {
    program.help()
    console.error(e)
  }
}

module.exports = init
