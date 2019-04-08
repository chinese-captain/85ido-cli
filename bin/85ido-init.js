#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const download = require('../lib/download')
const generator = require('../lib/generator')
const process = require('process')
// const spawn = require('react-dev-utils/crossSpawn');

// 命令行交互工具
const program = require('commander')
// Match files using the patterns the shell uses, like stars and stuff.
const glob = require('glob')

// 终端交互工具
const inquirer = require('inquirer')

// Terminal string styling done right
const chalk = require('chalk')
// Colored symbols for various log levels
const logSymbols = require('log-symbols')

program.usage('<project-name>')
  // .option('-t, --type [template-type]', 'assign to template type "pc" or "mob"', 'pc')
  .parse(process.argv)

let projectType='pc'
let projectName = program.args[0]

if (!projectName) {  // project-name 必填
  // 相当于执行命令的--help选项，显示help信息，这是commander内置的一个命令选项
  program.help()
  return
}

inquirer.prompt([
  {
    type:'list',
    name:'projectType',
    message: '请选择您要安装的模板类型',
    choices: [
      {name:'pc端模板',value:'pc'},
      {name:'移动端模板',value:'mob'}
    ],
  }
]).then(answer => {
  Promise.resolve(answer.projectType ? projectType = answer.projectType : 'pc')
  return checkRootPath()
});


function checkRootPath() {
  const list = glob.sync('*')  // 遍历当前目录
  const rootName = path.basename(process.cwd()) // 获取执行当前命令的文件夹名称字符串

  let next = undefined
  if (list.length) {  // 如果当前目录不为空
    if (list.filter(name => {
      const fileName = path.resolve(process.cwd(), path.join('.', name))
      const isDir = fs.statSync(fileName).isDirectory()
      return name.indexOf(projectName) !== -1 && isDir
    }).length !== 0) {
      console.log(`项目${projectName}已经存在`)
      return
    }
    return go(Promise.resolve(projectName))
  } else if (rootName === projectName) {
    next = inquirer.prompt([
      {
        name: 'buildInCurrent',
        message: '当前目录为空，且目录名称和项目名称相同，是否直接在当前目录下创建新项目？',
        type: 'confirm',
        default: true
      }
    ]).then(answer => {
      return go(Promise.resolve(answer.buildInCurrent ? projectName : '.'))
    })
  } else {
    return go(Promise.resolve(projectName))
  }
}

function go (next) {
  next.then(projectRoot => {
    if (projectRoot !== '.') {
      fs.mkdirSync(projectRoot)
    }
    return download(projectRoot, projectType).then(target => {
      return {
        name: projectRoot,
        root: projectRoot,
        target: target
      }
    })
  }).then(context => {
    return inquirer.prompt([
      {
        name: 'projectName',
        message: '项目的名称',
        default: context.name
      }, {
        name: 'projectVersion',
        message: '项目的版本号',
        default: '1.0.0'
      }, {
        name: 'projectDescription',
        message: '项目的简介',
        default: `A project named ${context.name}`
      }
    ]).then(answers => {
      return {
        ...context,
        metadata: {
          ...answers
        }
      }
    })
  }).then(context => {
    // 添加生成的逻辑
    return generator(context.metadata, context.target, path.parse(context.target).dir)
  }).then((res) => {
    const projectPath = path.resolve(res.dest)
    let local_package = JSON.parse(fs.readFileSync(`${projectPath}/package.json`).toString())
    local_package.templateVersion = res.templateVersion || '1.0.0'
    fs.writeFileSync(`${projectPath}/package.json`, JSON.stringify(local_package, null, 4))
    console.log(logSymbols.success, chalk.green('创建成功:)'))
    try {
      process.chdir(projectName)
      console.log(`生成成功! 创建项目 ${projectName} 在 ${process.cwd()}`)
      console.log(`你可以先在这里使用命令:`)
      console.log()
      console.log(chalk.cyan(`  cd ${projectName}`))
      console.log()
      console.log(`进入: ${projectName} 后:`)
      console.log()
      console.log(chalk.cyan(`  npm install`))
      console.log()
      console.log(chalk.cyan(`  npm run serve`))
      console.log()
    } catch (err) {
      // console.error(`chdir: ${err}`);
    }
  }).catch(err => {
    // 失败了用红色，增强提示
    console.error(logSymbols.error, chalk.red(`创建失败：${err.message}`))
  })
}
