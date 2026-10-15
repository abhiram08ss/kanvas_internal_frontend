import test from 'node:test'
import assert from 'node:assert/strict'
import * as m from '../src/utils/moduleValidation.ts'

const ok = (fn, ...xs) => xs.forEach((x) => assert.equal(fn(...[].concat(x)), null, `valid: ${JSON.stringify(x)}`))
const bad = (fn, ...xs) => xs.forEach((x) => assert.notEqual(fn(...[].concat(x)), null, `invalid: ${JSON.stringify(x)}`))

test('title', () => {
  ok(m.validateModuleTitle, 'Intro to Safety', 'Part 2: Fire & Evacuation (2026)', '日本語のモジュール')
  bad(m.validateModuleTitle, '', '  ', 'ab', '---', '<b>x</b>', 'a'.repeat(201))
})
test('order', () => {
  ok(m.validateOrder, '1', '9', '9999')
  bad(m.validateOrder, '', '0', '-1', '1.5', 'a', '10000')
})
test('duration (minutes)', () => {
  ok(m.validateModuleDuration, '', '15', '90', '1440', '15 min')
  bad(m.validateModuleDuration, '0', '-5', '1441', '1.5', 'abc')
  assert.equal(m.normalizeDuration('15 min'), '15')
})
test('content', () => {
  ok(m.validateModuleContent, ['<p>Read this carefully</p>', 'text'], ['<p><img src="x"></p>', 'hybrid'])
  bad(m.validateModuleContent, ['', 'text'], ['<p></p>', 'text'], ['<p>&nbsp;</p>', 'text'], ['<p><img src="x"></p>', 'text'], ['', 'hybrid'])
})
test('files', async () => {
  const f = (bytes, name) => new File([new Uint8Array(bytes)], name)
  assert.equal(await m.validateModuleFile(f([0x25, 0x50, 0x44, 0x46, 0x2d], 'a.pdf'), 'document'), null)
  assert.notEqual(await m.validateModuleFile(f([0x4d, 0x5a, 1, 2], 'a.pdf'), 'document'), null, 'exe renamed .pdf')
  assert.notEqual(await m.validateModuleFile(f([0x25, 0x50, 0x44, 0x46], 'a.pdf'), 'image'), null, 'wrong module type')
  assert.notEqual(await m.validateModuleFile(f([], 'a.pdf'), 'document'), null, 'empty')
  assert.notEqual(await m.validateModuleFile(f([1], 'noextension'), 'document'), null)
})
test('video link', () => {
  const rec = (u) => u.includes('youtube.com') || u.endsWith('.mp4')
  ok((v) => m.validateVideoLink(v, rec), '', 'https://youtube.com/watch?v=abc', 'https://x.com/a.mp4')
  bad((v) => m.validateVideoLink(v, rec), 'youtube.com/watch', 'https://exa mple.com/a.mp4', 'https://vimeo.example/zzz', 'ftp://x.com/a.mp4')
})
