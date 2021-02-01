import EventEmitter from '@/event/eventEmitter';
import { addDefaultImageBlobHook, emitImageBlobHook } from '@/helper/image';

describe('image processor', () => {
  let em: EventEmitter;

  beforeEach(() => {
    em = new EventEmitter();
  });

  function mockReadAsDataURL() {
    jest.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () {
      const ev = { target: { result: '/file.jpg' } };

      // @ts-ignore
      this.onload(ev);
    });
  }

  it('should call addImageBlobHook hook on calling emitImageBlobHook function', () => {
    const spy = jest.fn();
    const file = new File([new ArrayBuffer(1)], 'file.jpg');

    em.listen('addImageBlobHook', spy);
    emitImageBlobHook(em, 'markdown', file, 'drop');

    expect(spy).toHaveBeenCalledWith(file, expect.any(Function), 'drop');
  });

  it('should execute addImage command through hook callback function in default addImageBlobHook hook', () => {
    addDefaultImageBlobHook(em);
    mockReadAsDataURL();

    const spy = jest.fn();
    const file = new File([new ArrayBuffer(1)], 'file.jpg');

    em.listen('command', spy);
    emitImageBlobHook(em, 'markdown', file, 'drop');

    expect(spy).toHaveBeenCalledWith(
      { type: 'markdown', command: 'addImage' },
      { altText: 'file.jpg', imageUrl: '/file.jpg' }
    );
  });
});
