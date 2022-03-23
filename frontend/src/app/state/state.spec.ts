import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { State } from './state';

describe('State', () => {
  let state: State<Dummy>;
  const value: Dummy = { prop: 'dummy' };
  beforeEach(() => {
    TestBed.configureTestingModule({});
    state = new State<Dummy>();
  });

  it('should be created', () => {
    expect(state).toBeTruthy();
  });

  it('should return set value', done => {

    // Act
    state.set(value);

    state.select$.subscribe(v => {
      // Assert
      expect(v?.prop).toEqual(value.prop);
      done();
    });

  });

  it('clear should clear state', fakeAsync(() => {
    // Arrange
    let returned: Dummy | undefined;
    let set = false;
    state.select$.subscribe(v => {
      returned = v;
      set = true;
    });

    // Act
    state.set(value);

    tick();
    state.clear();
    tick();

    // Assert
    expect(set).toBeTrue();
    expect(returned).toBe(undefined as any as Dummy);

  }));

  it('undo sets previous value', () => {
    // Arrange
    const first: Dummy = { prop: 'first' };
    const second: Dummy = { prop: 'second' };

    let returned: Dummy | undefined;
    let set = false;
    state.select$.subscribe(v => {
      returned = v;
      set = true;
    });

    // Act
    state.set(first);
    state.set(second);
    state.undo();

    // Assert
    expect(set).toBeTrue();
    expect(returned?.prop).toBe(first.prop);

  });

  it('redo sets next value', () => {
    // Arrange
    const first: Dummy = { prop: 'first' };
    const second: Dummy = { prop: 'second' };

    let returned: Dummy | undefined;
    let set = false;
    state.select$.subscribe(v => {
      returned = v;
      set = true;
    });

    // Act
    state.set(first);
    state.set(second);
    state.undo();
    state.redo();

    // Assert
    expect(set).toBeTrue();
    expect(returned?.prop).toBe(second.prop);

  });
  it('set purges the history ahead', () => {
    // Arrange
    const first: Dummy = { prop: 'first' };
    const second: Dummy = { prop: 'second' };
    const third: Dummy = { prop: 'third' };

    let returned: Dummy | undefined;
    let set = false;
    state.select$.subscribe(v => {
      returned = v;
      set = true;
    });

    // Act
    state.set(first);
    state.set(second);
    state.undo();
    state.set(third);
    state.redo();

    // Assert
    expect(set).toBeTrue();
    expect(returned?.prop).toBe(third.prop);

  });
});

interface Dummy {
  prop: string;
}
