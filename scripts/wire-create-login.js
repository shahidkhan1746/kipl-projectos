#!/usr/bin/env node
/**
 * Wire createLogin into HR createEmployee
 * When createLogin=true is in the body, also creates a user account
 */

const fs   = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '..')

// ── 1. hr.service.ts — inject UsersService + handle createLogin ───────────────
const svcPath = path.join(ROOT, 'backend', 'src', 'hr', 'hr.service.ts')
let svc = fs.readFileSync(svcPath, 'utf8')

if (svc.includes('createLogin')) {
  console.log('ℹ️  createLogin already wired')
  process.exit(0)
}

// Add UsersService import
svc = svc.replace(
  `import { CreateEmployeeDto } from './dto/create-employee.dto'`,
  `import { CreateEmployeeDto } from './dto/create-employee.dto'\nimport { UsersService } from '../users/users.service'`
)

// Inject UsersService into constructor
svc = svc.replace(
  /constructor\(([^)]+)\)/,
  (match, args) => {
    if (args.includes('usersService')) return match
    return `constructor(${args.trim()},\n    private readonly usersService: UsersService\n  )`
  }
)

// Replace createEmployee to handle createLogin
svc = svc.replace(
  `    async createEmployee(dto: CreateEmployeeDto): Promise<Employee> {`,
  `    async createEmployee(dto: any): Promise<Employee> {`
)

svc = svc.replace(
  `    return this.empRepo.save(this.empRepo.create(dto))`,
  `    const { createLogin, loginEmail, loginRole, loginPassword, ...empData } = dto
    const employee = await this.empRepo.save(this.empRepo.create(empData))

    if (createLogin && loginEmail && loginPassword) {
      try {
        await this.usersService.createUser({
          name:     (empData.firstName + ' ' + (empData.lastName ?? '')).trim(),
          email:    loginEmail,
          role:     loginRole ?? 'engineer',
          password: loginPassword,
        })
      } catch (e) {
        // User creation failed (e.g. duplicate email) — don't fail the employee creation
        console.warn('User creation failed for employee:', loginEmail, e.message)
      }
    }

    return employee`
)

fs.writeFileSync(svcPath, svc, 'utf8')
console.log('✅  hr.service.ts — createLogin wired into createEmployee')

// ── 2. hr.module.ts — import UsersModule ─────────────────────────────────────
const modPath = path.join(ROOT, 'backend', 'src', 'hr', 'hr.module.ts')
let mod = fs.readFileSync(modPath, 'utf8')

if (mod.includes('UsersModule')) {
  console.log('ℹ️  UsersModule already imported in HrModule')
} else {
  // Add UsersModule import
  mod = mod.replace(
    `import { Module } from '@nestjs/common'`,
    `import { Module } from '@nestjs/common'\nimport { UsersModule } from '../users/users.module'`
  )

  // Add to imports array
  mod = mod.replace(
    /imports:\s*\[([^\]]+)\]/,
    (match, imports) => `imports: [${imports.trim()}, UsersModule]`
  )

  fs.writeFileSync(modPath, mod, 'utf8')
  console.log('✅  hr.module.ts — UsersModule imported')
}

// ── 3. users.module.ts — export UsersService ─────────────────────────────────
const usersModPath = path.join(ROOT, 'backend', 'src', 'users', 'users.module.ts')
let usersMod = fs.readFileSync(usersModPath, 'utf8')

if (usersMod.includes('exports:')) {
  if (!usersMod.includes('UsersService')) {
    usersMod = usersMod.replace(
      /exports:\s*\[([^\]]*)\]/,
      (match, exp) => `exports: [${exp.trim()}${exp.trim() ? ', ' : ''}UsersService]`
    )
    fs.writeFileSync(usersModPath, usersMod, 'utf8')
    console.log('✅  users.module.ts — UsersService exported')
  } else {
    console.log('ℹ️  UsersService already exported')
  }
} else {
  // Add exports
  usersMod = usersMod.replace(
    /providers:\s*\[([^\]]+)\]/,
    (match, providers) => `providers: [${providers}],\n  exports: [UsersService]`
  )
  fs.writeFileSync(usersModPath, usersMod, 'utf8')
  console.log('✅  users.module.ts — exports added with UsersService')
}

console.log('\n🏁  createLogin wired end-to-end')
console.log('   HR Employees → Add Employee → tick "Create Login"')
console.log('   → Creates employee record + user login in one step\n')
