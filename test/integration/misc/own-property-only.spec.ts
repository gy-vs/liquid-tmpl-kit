import { Liquid, Drop } from '../../../src'

class Account {
  public name: string
  public plan: string
  constructor (name: string, plan: string) {
    this.name = name
    this.plan = plan
  }
  get apiToken () { return `SECRET-token-${this.name}` }
  get first () { return `SECRET-first-${this.name}` }
  get last () { return `SECRET-last-${this.name}` }
  get size () { return `SECRET-size-${this.name}` }
  get internalRank () { return this.name === 'alice' ? 'z' : 'a' }
}

describe('ownPropertyOnly security', function () {
  let liquid: Liquid
  let u: Account
  let list: Account[]
  beforeEach(function () {
    liquid = new Liquid()
    u = new Account('alice', 'free')
    list = [new Account('alice', 'pro'), new Account('bob', 'free')]
  })

  it('should not expose prototype getters', async function () {
    expect(await liquid.parseAndRender('{{ u.apiToken }}', { u })).toBe('')
    expect(await liquid.parseAndRender('{{ u.first }}', { u })).toBe('')
    expect(await liquid.parseAndRender('{{ u.last }}', { u })).toBe('')
  })

  it('should count own keys for size instead of reading the prototype getter', async function () {
    expect(await liquid.parseAndRender('{{ u.size }}', { u })).toBe('2')
  })

  it('should keep built-in array/string first/last/size semantics', async function () {
    const ctx = { list, str: 'abc' }
    expect(await liquid.parseAndRender('{{ list.first.name }}', ctx)).toBe('alice')
    expect(await liquid.parseAndRender('{{ list.last.name }}', ctx)).toBe('bob')
    expect(await liquid.parseAndRender('{{ list.size }}', ctx)).toBe('2')
    expect(await liquid.parseAndRender('{{ str.size }}', ctx)).toBe('3')
  })

  it('should not sort by prototype getters with sort_natural', async function () {
    expect(await liquid.parseAndRender('{{ list | sort_natural: "internalRank" | map: "name" | join }}', { list })).toBe('alice bob')
  })

  it('should keep sort and sort_natural consistent for hidden properties', async function () {
    expect(await liquid.parseAndRender('{{ list | sort: "internalRank" | map: "name" | join }}', { list })).toBe('alice bob')
    expect(await liquid.parseAndRender('{{ list | sort_natural: "internalRank" | map: "name" | join }}', { list })).toBe('alice bob')
  })

  it('should sort by own properties with sort_natural', async function () {
    expect(await liquid.parseAndRender('{{ list | sort_natural: "plan" | map: "name" | join }}', { list })).toBe('bob alice')
  })

  it('should expose prototype getters when ownPropertyOnly is disabled', async function () {
    const permissive = new Liquid({ ownPropertyOnly: false })
    expect(await permissive.parseAndRender('{{ u.apiToken }}', { u })).toBe('SECRET-token-alice')
    expect(await permissive.parseAndRender('{{ u.first }}', { u })).toBe('SECRET-first-alice')
    expect(await permissive.parseAndRender('{{ u.size }}', { u })).toBe('SECRET-size-alice')
    expect(await permissive.parseAndRender('{{ list | sort_natural: "internalRank" | map: "name" | join }}', { list })).toBe('bob alice')
  })

  it('should keep methods on Drop subclasses accessible', async function () {
    class AccountDrop extends Drop {
      public rank () { return 'RANK' }
      get size () { return 7 }
    }
    const d = new AccountDrop()
    expect(await liquid.parseAndRender('{{ d.rank }}', { d })).toBe('RANK')
    expect(await liquid.parseAndRender('{{ d.size }}', { d })).toBe('7')
  })
})
