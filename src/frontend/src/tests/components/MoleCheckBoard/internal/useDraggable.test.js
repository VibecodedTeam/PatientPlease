import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useDraggable } from '../../../../components/MoleCheckBoard/internal/useDraggable';

describe('MoleCheckBoard internal/useDraggable', () => {
  it('starts at offset (0, 0) and not dragging', () => {
    const { result } = renderHook(() => useDraggable());

    expect(result.current.position).toEqual({ x: 0, y: 0 });
    expect(result.current.isDragging).toBe(false);
  });

  it('moves by the pointer delta while dragging, via handleProps.onMouseDown', () => {
    const { result } = renderHook(() => useDraggable());

    act(() => {
      result.current.dragHandleProps.onMouseDown({ clientX: 100, clientY: 100 });
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      fireEvent.mouseMove(window, { clientX: 140, clientY: 130 });
    });

    expect(result.current.position).toEqual({ x: 40, y: 30 });
  });

  it('stops updating position after mouseup', () => {
    const { result } = renderHook(() => useDraggable());

    act(() => {
      result.current.dragHandleProps.onMouseDown({ clientX: 0, clientY: 0 });
    });
    act(() => {
      fireEvent.mouseMove(window, { clientX: 20, clientY: 10 });
    });
    act(() => {
      fireEvent.mouseUp(window);
    });

    expect(result.current.isDragging).toBe(false);
    const positionAfterMouseUp = result.current.position;

    act(() => {
      fireEvent.mouseMove(window, { clientX: 500, clientY: 500 });
    });

    expect(result.current.position).toEqual(positionAfterMouseUp);
  });

  it('accumulates position across multiple separate drags rather than resetting', () => {
    const { result } = renderHook(() => useDraggable());

    act(() => {
      result.current.dragHandleProps.onMouseDown({ clientX: 0, clientY: 0 });
    });
    act(() => {
      fireEvent.mouseMove(window, { clientX: 30, clientY: 30 });
    });
    act(() => {
      fireEvent.mouseUp(window);
    });
    expect(result.current.position).toEqual({ x: 30, y: 30 });

    act(() => {
      result.current.dragHandleProps.onMouseDown({ clientX: 50, clientY: 50 });
    });
    act(() => {
      fireEvent.mouseMove(window, { clientX: 60, clientY: 40 });
    });

    expect(result.current.position).toEqual({ x: 40, y: 20 });
  });
});
