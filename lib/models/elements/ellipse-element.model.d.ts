import { LineCapEnum } from '../line-cap.enum';
import { LineJoinEnum } from '../line-join.enum';
import { IWhiteboardElementOptions } from '../whiteboard-element-options.model';
export declare class EllipseElement {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    strokeWidth: number;
    strokeColor: string;
    fill: string;
    dasharray: string;
    dashoffset: number;
    lineCap: LineCapEnum;
    lineJoin: LineJoinEnum;
    constructor(options: IWhiteboardElementOptions);
}
