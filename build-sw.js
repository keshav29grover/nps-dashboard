// build-sw.js — runs before every build, stamps version into sw.js
// This makes the SW cache name unique on every deploy

import { readFileSync, writeFileSync, copyFileSync } from 'fs'

const version   = Date.now().toString()   // unique timestamp every build
const template  = readFileSync('public/sw.js', 'utf8')
const stamped   = template.replace('__SW_VERSION__', version)

writeFileSync('public/sw.js', stamped)
console.log(`[build-sw] Stamped SW version: ${version}`)