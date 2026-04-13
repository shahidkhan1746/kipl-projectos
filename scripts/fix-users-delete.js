#!/usr/bin/env node
const fs   = require('fs')
const path = require('path')

const ctrl = path.resolve(__dirname, '..', 'backend', 'src', 'users', 'users.controller.ts')
let src = fs.readFileSync(ctrl, 'utf8')

if (src.includes("@Delete(':id')")) {
  console.log('ℹ️  DELETE already exists')
  process.exit(0)
}

// Add Delete to imports
src = src.replace(
  `import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'`,
  `import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'`
)

// Add DELETE route before last closing brace
const deleteRoute = `
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id)
  }
`
src = src.slice(0, src.lastIndexOf('}')) + deleteRoute + '\n}'
fs.writeFileSync(ctrl, src, 'utf8')
console.log('✅  DELETE /users/:id added to controller')

// Add deleteUser to service
const svc = path.resolve(__dirname, '..', 'backend', 'src', 'users', 'users.service.ts')
let svcSrc = fs.readFileSync(svc, 'utf8')
if (!svcSrc.includes('deleteUser')) {
  svcSrc = svcSrc.slice(0, svcSrc.lastIndexOf('}')) +
    `\n  async deleteUser(id: string) {\n    return this.repo.delete(id)\n  }\n}`
  fs.writeFileSync(svc, svcSrc, 'utf8')
  console.log('✅  deleteUser() added to service')
}
