import type { Firestore } from 'firebase/firestore'
import { collection, doc } from 'firebase/firestore'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref as deepRef, effectScope, nextTick, shallowRef } from 'vue'
import { useFirestore } from './index'

const dummyFirestore = {} as Firestore

function getMockSnapFromRef(docRef: any) {
  return {
    id: `${docRef.path}-id`,
    data: () => docRef.path === 'users/invalid' ? null : docRef,
  }
}

function getData(docRef: any) {
  const data = docRef.data()
  if (data) {
    Object.defineProperty(data, 'id', {
      value: docRef.id.toString(),
      writable: false,
    })
  }
  return data
}

const unsubscribe = vi.fn()
console.error = vi.fn()

vi.mock('firebase/firestore', () => {
  const doc = vi.fn((_: Firestore, path: string) => {
    if (path.includes('//'))
      throw new Error('Invalid segment')
    return { path }
  })

  const collection = vi.fn((_: Firestore, path: string) => {
    if (path.includes('//'))
      throw new Error('Invalid segment')
    return { path }
  })

  const onSnapshot = vi.fn((docRef: any, callbackFn: (payload: any) => void, errorHandler: (err: Error) => void) => {
    if (docRef.path === 'users/error') {
      errorHandler(new Error('not found'))
      return
    }
    callbackFn({
      ...getMockSnapFromRef(docRef),
      docs: [getMockSnapFromRef(docRef)],
    })
    return unsubscribe
  })
  return { onSnapshot, collection, doc }
})

describe('useFirestore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should get `users` collection data', () => {
    const collectionRef = collection(dummyFirestore, 'users')
    const data = useFirestore(collectionRef)
    expect(data.value).toEqual([getData(getMockSnapFromRef(collectionRef))])
  })

  it('should get `users/userId` document data', () => {
    let docRef = doc(dummyFirestore, 'users/userId')
    let data = useFirestore(docRef)
    expect(data.value).toEqual(getData(getMockSnapFromRef(docRef)))

    docRef = doc(dummyFirestore, 'users/invalid')
    data = useFirestore(docRef)
    expect(data.value).toEqual(getData(getMockSnapFromRef(docRef)))
  })

  it('should get `posts` computed query data', () => {
    const queryRef = collection(dummyFirestore, 'posts')
    const data = useFirestore(computed(() => queryRef))
    expect(data.value).toEqual([getData(getMockSnapFromRef(queryRef))])
  })

  it('should get initial value when pass falsy value', () => {
    const collectionRef = collection(dummyFirestore, 'todos')
    const falsy = computed(() => false as boolean && collectionRef)
    const data = useFirestore(falsy, [{ id: 'default' }])
    expect(data.value).toEqual([{ id: 'default' }])
  })

  it('should get reactive query data & unsubscribe previous query when re-querying', async () => {
    const queryRef = collection(dummyFirestore, 'posts')
    const reactiveQueryRef = deepRef(queryRef)
    const data = useFirestore(reactiveQueryRef)
    expect(data.value).toEqual([getData(getMockSnapFromRef(reactiveQueryRef.value))])
    reactiveQueryRef.value = collection(dummyFirestore, 'todos')
    await nextTick()
    expect(unsubscribe).toHaveBeenCalled()
    expect(data.value).toEqual([getData(getMockSnapFromRef(reactiveQueryRef.value))])
  })

  it('should get user data only when user id exists', async () => {
    const userId = shallowRef('')
    const queryRef = computed(() => !!userId.value && collection(dummyFirestore, `users/${userId.value}/posts`))
    const data = useFirestore(queryRef, [{ id: 'default' }])
    expect(data.value).toEqual([{ id: 'default' }])
    userId.value = 'userId'
    await nextTick()
    expect(data.value).toEqual([getData(getMockSnapFromRef(collection(dummyFirestore, `users/${userId.value}/posts`)))])
    userId.value = ''
    await nextTick()
    expect(unsubscribe).toHaveBeenCalled()
    expect(data.value).toEqual([{ id: 'default' }])
  })

  it('should call error handler', () => {
    const docRef = doc(dummyFirestore, 'users/error')
    useFirestore(docRef)

    expect(console.error).toHaveBeenCalledWith(new Error('not found'))
  })

  it('should close when scope dispose', async () => {
    const scope = effectScope()
    let data: any
    const userId = shallowRef('')
    const queryRef = computed(() => !!userId.value && collection(dummyFirestore, `users/${userId.value}/posts`))

    scope.run(() => {
      data = useFirestore(queryRef, [{ id: 'default' }])
      expect(data.value).toEqual([{ id: 'default' }])
    })
    scope.stop()

    userId.value = 'userId'
    await nextTick()

    expect(data.value).toEqual([{ id: 'default' }])
  })

  it('should get disposed without autoDispose option', async () => {
    const scope = effectScope()
    await scope.run(async () => {
      const collectionRef = collection(dummyFirestore, 'users')
      useFirestore(collectionRef)
      await nextTick()
    })
    scope.stop()
    expect(unsubscribe).toBeCalledTimes(1)
  })

  it('should not get disposed with explicit autoDispose option', async () => {
    const scope = effectScope()
    await scope.run(async () => {
      const collectionRef = collection(dummyFirestore, 'users')
      useFirestore(collectionRef, undefined, { autoDispose: false })
      await nextTick()
    })
    scope.stop()
    expect(unsubscribe).toBeCalledTimes(0)
  })

  it('should get disposed after autoDispose timeout', async () => {
    const scope = effectScope()
    await scope.run(async () => {
      const collectionRef = collection(dummyFirestore, 'users')
      useFirestore(collectionRef, undefined, { autoDispose: 1000 })
    })
    scope.stop()
    expect(unsubscribe).toBeCalledTimes(0)
    vi.advanceTimersByTime(2000)
    expect(unsubscribe).toBeCalledTimes(1)
  })
})
