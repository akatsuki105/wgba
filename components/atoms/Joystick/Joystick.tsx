/**
 * This components is inspired by bobboteck/JoyStick (URL: https://github.com/bobboteck/JoyStick)
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { styled } from 'twin.macro';

type Props = {
  size?: number;
  className?: string;
  set: (xy: [number, number]) => void;
};

const circumference = 2 * Math.PI;

export const Joystick: React.FC<Props> = React.memo(({ size = 240, className = '', set }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const grad0 = useContext(ThemeContext).color.gba.btn0;
  const grad100 = useContext(ThemeContext).color.gba.btn100;
  const stroke = useContext(ThemeContext).color.gba.btnb;
  const purple = useContext(ThemeContext).color.purple;
  const pressed = useRef(false);
  const internalRadius = (size - (size / 2 + 10)) / 2;
  const externalRadius = internalRadius + 30;
  const maxMoveStick = internalRadius + 5;
  const [XY, setXY] = useState<[number, number]>([size / 2, size / 2]);

  const wrappedSetXY = (xy: [number, number]) => {
    setXY(xy);
    set(xy);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    pressed.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!ref.current) return;

    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    if (!pressed.current) return;

    let [newX, newY] = XY;
    newX = e.targetTouches[0].pageX;
    newY = e.targetTouches[0].pageY;
    // Manage offset
    if (ref.current.offsetParent?.tagName.toUpperCase() === 'BODY') {
      newX -= ref.current.offsetLeft;
      newY -= ref.current.offsetTop;
    }
    wrappedSetXY([newX, newY]);

    // Delete canvas
    ctx.clearRect(0, 0, size, size);

    // Redraw object
    drawExternalCircle();
    drawInternalCircle(newX, newY);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!ref.current) return;

    pressed.current = false;

    wrappedSetXY([size / 2, size / 2]);

    const ctx = ref.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);

    drawExternalCircle();
    drawInternalCircle(size / 2, size / 2);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    pressed.current = true;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    if (!pressed.current) return;

    let [newX, newY] = XY;
    newX = e.pageX;
    newY = e.pageY;
    // Manage offset
    if (ref.current.offsetParent?.tagName.toUpperCase() === 'BODY') {
      newX -= ref.current.offsetLeft;
      newY -= ref.current.offsetTop;
    }
    wrappedSetXY([newX, newY]);

    // Delete canvas
    ctx.clearRect(0, 0, size, size);

    // Redraw object
    drawExternalCircle();
    drawInternalCircle(newX, newY);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!ref.current) return;

    pressed.current = false;

    wrappedSetXY([size / 2, size / 2]);

    const ctx = ref.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);

    drawExternalCircle();
    drawInternalCircle(size / 2, size / 2);
  };

  const drawExternalCircle = () => {
    if (!ref.current) return;

    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, externalRadius, 0, circumference, false);
    ctx.lineWidth = 2;

    const grd = ctx.createLinearGradient(0, 0, size, size);
    grd.addColorStop(0, purple[900]);
    grd.addColorStop(1, purple[600]);
    ctx.strokeStyle = grd;
    ctx.lineWidth = 8;
    ctx.stroke();
  };

  const drawInternalCircle = (x: number, y: number) => {
    if (!ref.current) return;

    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();

    let newX = x;
    if (newX < internalRadius) newX = maxMoveStick;
    if (newX + internalRadius > size) newX = size - maxMoveStick;

    let newY = y;
    if (newY < internalRadius) newY = maxMoveStick;
    if (newY + internalRadius > size) newY = size - maxMoveStick;

    wrappedSetXY([newX, newY]);

    ctx.arc(newX, newY, internalRadius, 0, circumference, false);

    const grd = ctx.createLinearGradient(0, 0, size, size);
    grd.addColorStop(0, grad0);
    grd.addColorStop(1, grad100);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  };

  const [initialized, setInitialized] = useState<boolean>(false);
  useEffect(() => {
    if (initialized) return;
    if (!ref.current) return;

    setInitialized(true);
    drawExternalCircle();
    drawInternalCircle(XY[0], XY[1]);
  }, [ref.current]); // eslint-disable-line

  return (
    <StyledCanvas
      ref={ref}
      className={className}
      width={size}
      height={size}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    ></StyledCanvas>
  );
});

const StyledCanvas = styled.canvas``;
