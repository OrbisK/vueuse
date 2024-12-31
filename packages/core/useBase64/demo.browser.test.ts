import { page } from '@vitest/browser/context'
import { describe, it } from 'vitest'
import Demo from './demo.vue'

describe('useBase64 demo', () => {
  it('should render', async () => {
    const screen = page.render(Demo)
  })
})
