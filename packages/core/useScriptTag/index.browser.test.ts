import { page } from '@vitest/browser/context'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useScriptTag } from '.'

describe('useScriptTag', () => {
  const code = `
  const a = ()=>{
    console.log('a')
  }
  a()
  export default a
  `

  const blob = new Blob([code], { type: 'application/javascript' })
  const src = URL.createObjectURL(blob)

  const TestComponent = defineComponent({
    setup() {
      useScriptTag(`${src}`, () => {}, { immediate: true, type: 'module' })
    },
    template: `<div>test</div>`,
  })

  const scriptTagElement = (): HTMLScriptElement | null =>
    document.head.querySelector(`script[src="${src}"]`)

  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it.fails('should execute the script tag twice', async () => {
    const appendChildListener = vi.spyOn(document.head, 'appendChild')
    const removeSpy = vi.spyOn(document.head, 'removeChild')
    const consoleSpy = vi.spyOn(console, 'log')

    expect(appendChildListener).not.toBeCalled()

    expect(scriptTagElement()).toBeNull()

    const screen = await page.render(TestComponent)
    await vi.waitFor(() => {
      expect(consoleSpy).toBeCalledTimes(1)
    })
    expect(removeSpy).not.toBeCalled()
    await screen.unmount()
    expect(removeSpy).toBeCalled()
    const screen2 = await page.render(TestComponent)
    await vi.waitFor(() => {
      expect(consoleSpy).toBeCalledTimes(2)
    })
    await screen2.unmount()
    expect(removeSpy).toBeCalledTimes(2)
  })
})
