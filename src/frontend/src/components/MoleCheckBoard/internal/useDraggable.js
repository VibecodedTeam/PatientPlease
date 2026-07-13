import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks a free-form drag offset driven by mouse events, so a floating panel
 * can be repositioned via CSS `transform: translate(...)` instead of
 * `position: absolute` (see CLAUDE.md's no-absolute-positioning rule - the
 * panel itself never leaves normal flow, it just gets visually offset).
 * @returns {{ position: {x: number, y: number}, isDragging: boolean, dragHandleProps: { onMouseDown: (event: {clientX: number, clientY: number}) => void } }}
 */
export function useDraggable() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, originX: 0, originY: 0 });

  const onMouseDown = useCallback(
    (event) => {
      dragStart.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        originX: position.x,
        originY: position.y,
      };
      setIsDragging(true);
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    function onMouseMove(event) {
      const { pointerX, pointerY, originX, originY } = dragStart.current;
      setPosition({
        x: originX + (event.clientX - pointerX),
        y: originY + (event.clientY - pointerY),
      });
    }

    function onMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  return { position, isDragging, dragHandleProps: { onMouseDown } };
}
