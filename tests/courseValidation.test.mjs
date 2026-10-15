// Run with: npm run test:validation   (Node's built-in test runner, no extra dependencies)
import test from 'node:test'
import assert from 'node:assert/strict'
import * as v from '../src/utils/courseValidation.ts'

const ok = (fn, ...values) => values.forEach((x) => assert.equal(Array.isArray(x) ? fn(...x) : fn(x), null, `expected valid: ${JSON.stringify(x)}`))
const bad = (fn, ...values) => values.forEach((x) => assert.notEqual(Array.isArray(x) ? fn(...x) : fn(x), null, `expected invalid: ${JSON.stringify(x)}`))

test('title', () => {
  ok(v.validateTitle, 'React Basics', "Manager's Guide: Part 2 (2026)", 'Sales & Marketing, 101', 'Café Français – Niveau 1'.replace('–', '-'), '日本語のコース')
  bad(v.validateTitle, '', '   ', 'ab', '---', '!!!', 'a'.repeat(151), '<script>alert(1)</script>', 'Course {x}')
  assert.equal(v.validateTitle('a'.repeat(150)), null)
})

test('code', () => {
  ok(v.validateCode, 'REACT101', 'CS_01', 'SAFETY-2026', 'A1', 'A'.repeat(20))
  bad(v.validateCode, '', '_REACT', 'REACT_', '-X1', 'CS--01', 'CS-_01', 'REACT 101', 'react101', 'A'.repeat(21), 'AB$')
  assert.equal(v.normalizeCode('react101'), 'REACT101')
})

test('category (checked against the API list, no regex)', () => {
  const options = ['Organization-wide', 'Function-based']
  assert.equal(v.validateCategory('Function-based', options), null)
  bad((x) => v.validateCategory(x, options), '', undefined, null, 'Made up')
})

test('description', () => {
  ok(v.validateDescription, 'Learn the basics of React.', 'Línea uno\n\nLínea dos con acentos y emoji 🙂')
  bad(v.validateDescription, '', '    \n  ', 'too short', 'x'.repeat(2001))
  assert.equal(v.validateDescription(' a b c d e f g h i j '), null) // 10 non-space characters
})

test('cover file', async () => {
  const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], 'cover.png', { type: 'image/png' })
  assert.equal(await v.validateCoverFile(png), null)
  const fake = new File([new Uint8Array([0x4d, 0x5a, 1, 2, 3])], 'cover.png', { type: 'image/png' })
  assert.notEqual(await v.validateCoverFile(fake), null, 'an .exe renamed to .png must be rejected')
  assert.notEqual(await v.validateCoverFile(new File(['x'], 'doc.pdf', { type: 'application/pdf' })), null)
  assert.notEqual(await v.validateCoverFile(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'c.jpg', { type: 'image/png' })), null, 'extension and type must agree')
  assert.notEqual(await v.validateCoverFile(new File([], 'empty.png', { type: 'image/png' })), null)
  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
  assert.notEqual(await v.validateCoverFile(big), null)
})

test('outcomes', () => {
  assert.deepEqual(v.validateOutcomes(['']), {})
  assert.deepEqual(v.validateOutcomes(['Build a REST API', 'Write tests', '']), {})
  assert.ok(v.validateOutcomes(['ab', '']) [0])
  assert.ok(v.validateOutcomes(['Learn A', 'learn  a', ''])[1], 'duplicates after trimming / case folding')
  assert.ok(v.validateOutcomes(['Learn A', '', 'Learn B', ''])[1], 'blank row between filled rows')
  assert.ok(v.validateOutcomes(['x'.repeat(201), ''])[0])
})

test('pass score', () => {
  ok(v.validatePassScore, '0', '70', '100')
  bad(v.validatePassScore, '', '-1', '101', '70.5', 'abc', '1e2')
})

test('duration (hours)', () => {
  ok(v.validateDuration, '', '1', '2.5', '0.25', '1000')
  bad(v.validateDuration, '0', '-1', '1001', 'abc', '1.234', '1,5')
})

test('quiz question count', () => {
  ok(v.validateQuizCount, '', 'all', 'ALL', '5', [`3`, 10], ['all', 2])
  bad(v.validateQuizCount, '0', '-2', '2.5', 'many', '05', ['11', 10])
  assert.equal(v.normalizeQuizCount(' ALL '), 'all')
})

test('certificate validity (months)', () => {
  ok(v.validateCertMonths, '', '1', '24', '120')
  bad(v.validateCertMonths, '0', '-3', '2.5', '121', 'x')
})

test('certificate template (checked against the API list, no regex)', () => {
  const options = ['Default (no template)', 'Standard']
  ok((x) => v.validateCertificateTemplate(x, options), 'Standard', 'Default (no template)')
  bad((x) => v.validateCertificateTemplate(x, options), '', 'Ghost')
})

test('completion message', () => {
  ok(v.validateCompletionMessage, 'Well done!', 'Congratulations {Course Title}\nSee you next time 🙂')
  bad(v.validateCompletionMessage, '', '   ', 'ok', 'x'.repeat(1001))
})
