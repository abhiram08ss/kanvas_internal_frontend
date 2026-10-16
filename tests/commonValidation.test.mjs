// Run with: npm run test:validation   (Node's built-in test runner, no extra dependencies)
import test from 'node:test'
import assert from 'node:assert/strict'
import * as v from '../src/utils/validation.ts'
import * as phone from '../src/utils/phone.ts'

const ok = (fn, ...values) => values.forEach((x) => assert.equal(fn(x), null, `expected valid: ${JSON.stringify(x)} -> ${fn(x)}`))
const bad = (fn, ...values) => values.forEach((x) => assert.notEqual(fn(x), null, `expected invalid: ${JSON.stringify(x)}`))

test('password', () => {
  ok(v.validatePassword, 'Abcdef1!', 'Str0ng!pass', 'P@ssw0rd', 'A1!aaaaa', 'Aa1!' + 'x'.repeat(60), 'Ünicode1!a', 'Admin@123')
  bad(v.validatePassword, '', 'Abc1!', 'Abcdef1', 'abcdefg1!', 'ABCDEFG1!', 'Abcdefgh!', 'Abcdefg1', 'Abcdef 1!', 'Abc\tdef1!', 'Aa1!' + 'x'.repeat(61))
  assert.equal(v.validatePassword('Aa1!' + 'x'.repeat(60)), null) // exactly 64
  assert.notEqual(v.validatePassword('Aa1!' + 'x'.repeat(61)), null) // 65
  assert.match(v.validatePassword('Abcdef 1!'), /spaces/i)
})

test('stripSpaces removes every kind of whitespace', () => {
  assert.equal(v.stripSpaces(' a b\tc\nd e '), 'abcde')
  assert.equal(v.stripSpaces(''), '')
})

test('login username / email', () => {
  ok(v.validateLoginUsername, 'superadmin', 'priya', 'a.b-c_d', 'priya@kan.com', ' superadmin ', 'a'.repeat(100))
  bad(v.validateLoginUsername, '', '   ', 'ab', 'has space', 'a'.repeat(101), 'bad@', '@bad.com', 'a@b', 'a@b.c', 'a b@c.com')
})

test('login password only checks presence and length', () => {
  ok(v.validateLoginPassword, 'x', 'anything at all', 'x'.repeat(64))
  bad(v.validateLoginPassword, '', 'x'.repeat(65))
})

test('tenant code', () => {
  ok(v.validateTenantCode, 'ACME', 'ACME-01', 'A1', 'X'.repeat(40))
  bad(v.validateTenantCode, '', 'acme', 'A', '-ACME', 'ACME-', 'AC--ME', 'AC ME', 'AC_ME', 'X'.repeat(41), 'ACME-!')
})

test('course search', () => {
  ok(v.validateCourseSearch, '', 'react', "Manager's Guide", 'C++', 'a & b')
  bad(v.validateCourseSearch, '<script>', 'a{b}', 'x\\y')
})

test('phone', () => {
  const p = (national, country = 'IN') => ({ country, national })
  assert.equal(phone.validatePhone(p('9876543210')), null)
  assert.equal(phone.validatePhone(p('2025550123', 'US')), null)
  for (const n of ['', '   ', 'abcdefghij', '12345', '98765432101', '98765 43210', '+919876543210'])
    assert.notEqual(phone.validatePhone(p(n)), null, `expected invalid: ${n}`)
  assert.equal(phone.toStoredPhone(p('98765 43210')), '+919876543210')
  assert.equal(phone.toStoredPhone(p('')), '')
  assert.deepEqual(phone.parseStoredPhone('+919876543210'), { country: 'IN', national: '9876543210' })
  assert.deepEqual(phone.parseStoredPhone('9876543210'), { country: 'IN', national: '9876543210' })
  assert.deepEqual(phone.parseStoredPhone(null), { country: 'IN', national: '' })
  assert.equal(phone.displayPhone(p('9876543210')), '+91 9876543210')
})
