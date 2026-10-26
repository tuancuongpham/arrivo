import * as React from 'react';
import { ensureStyles } from '../core/styles';
import { useIsoLayoutEffect } from './useReveal';

export interface SkeletonProps extends React.HTMLAttributes<HTMLElement> {
  /** Number of text lines. Default 3. */
  lines?: number;
  /** Line widths, cycled. */
  widths?: (string | number)[];
  /** Block mode: a single box of this size. */
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  as?: React.ElementType;
}

const WIDTHS = ['92%', '84%', '68%', '76%', '58%'];
const size = (v: string | number | undefined): string | undefined => (typeof v === 'number' ? `${v}px` : v);
const cx = (...names: (string | false | undefined)[]): string => names.filter(Boolean).join(' ');

/**
 * Placeholder shapes for content that hasn't arrived. Each line or block is a reveal
 * target (`data-arrivo="block"`), and the active effect styles it without JavaScript.
 */
export function Skeleton({ lines, widths, width, height, circle, as: Tag = 'span', className, style, ...rest }: SkeletonProps): React.ReactElement {
  useIsoLayoutEffect(() => ensureStyles(), []);
  if (height !== undefined || circle) {
    const h = size(height ?? width ?? '3rem');
    return (
      <Tag
        data-arrivo="block"
        aria-hidden="true"
        className={cx('arrivo-sk-block', circle && 'arrivo-sk-circle', className)}
        style={{ width: size(width) ?? (circle ? h : '100%'), height: h, ...style }}
        {...rest}
      />
    );
  }
  const n = lines ?? 3;
  const list = widths?.length ? widths : WIDTHS;
  return (
    <Tag aria-hidden="true" className={cx('arrivo-sk', className)} style={style} {...rest}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} data-arrivo="block" className="arrivo-sk-line" style={{ width: size(list[i % list.length]) }} />
      ))}
    </Tag>
  );
}
