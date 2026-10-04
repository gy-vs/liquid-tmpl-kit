import { Liquid, Drop } from '../../../src'

describe('ownPropertyOnly security', function () {
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

  function accounts () {
    const alice = new Account('alice', 'pro')
    const bob = new Account('bob', 'free')
    return { u: alice, list: [alice, bob] }
  }

  it('should hide prototype getter of a single property', async function () {
    const liquid = new Liquid()
    expect(await liquid.parseAndRender('{{ u.apiToken }}', accounts())).toBe('')
  })
  it('should hide prototype-defined first/last and fall back to own-key size', async function () {
    const liquid = new Liquid()
    expect(await liquid.parseAndRender('{{ u.first }}', accounts())).toBe('')
    expect(await liquid.parseAndRender('{{ u.last }}', accounts())).toBe('')
    expect(await liquid.parseAndRender('{{ u.size }}', accounts())).toBe('2')
  })
  it('should keep special properties for arrays and strings', async function () {
    const liquid = new Liquid()
    const scope = { ...accounts(), s: 'abc' }
    expect(await liquid.parseAndRender('{{ list.first.name }}', scope)).toBe('alice')
    expect(await liquid.parseAndRender('{{ list.last.name }}', scope)).toBe('bob')
    expect(await liquid.parseAndRender('{{ list.size }}', scope)).toBe('2')
    expect(await liquid.parseAndRender('{{ s.size }}', scope)).toBe('3')
  })
  it('should not read prototype-defined property in sort_natural', async function () {
    const liquid = new Liquid()
    const tpl = '{{ list | sort_natural: "internalRank" | map: "name" | join }}'
    expect(await liquid.parseAndRender(tpl, accounts())).toBe('alice bob')
  })
  it('should behave the same as sort when property is hidden', async function () {
    const liquid = new Liquid()
    const scope = accounts()
    const tpl = '{{ list | sort: "internalRank" | map: "name" | join }}'
    expect(await liquid.parseAndRender(tpl, scope)).toBe('alice bob')
  })
  it('should still sort_natural by own property', async function () {
    const liquid = new Liquid()
    const tpl = '{{ list | sort_natural: "plan" | map: "name" | join }}'
    expect(await liquid.parseAndRender(tpl, accounts())).toBe('bob alice')
  })
  it('should expose prototype properties when ownPropertyOnly is disabled', async function () {
    const liquid = new Liquid({ ownPropertyOnly: false })
    const scope = accounts()
    expect(await liquid.parseAndRender('{{ u.apiToken }}', scope)).toBe('SECRET-token-alice')
    expect(await liquid.parseAndRender('{{ u.first }}', scope)).toBe('SECRET-first-alice')
    expect(await liquid.parseAndRender('{{ u.last }}', scope)).toBe('SECRET-last-alice')
    expect(await liquid.parseAndRender('{{ u.size }}', scope)).toBe('SECRET-size-alice')
    const tpl = '{{ list | sort_natural: "internalRank" | map: "name" | join }}'
    expect(await liquid.parseAndRender(tpl, scope)).toBe('bob alice')
  })
  it('should keep Drop methods/getters accessible with ownPropertyOnly enabled', async function () {
    class AccountDrop extends Drop {
      private name = 'alice'
      get first () { return 'DROP-first' }
      public greeting () { return `hello-${this.name}` }
    }
    const liquid = new Liquid()
    const scope = { d: new AccountDrop() }
    expect(await liquid.parseAndRender('{{ d.greeting }}', scope)).toBe('hello-alice')
    expect(await liquid.parseAndRender('{{ d.first }}', scope)).toBe('DROP-first')
  })
})
