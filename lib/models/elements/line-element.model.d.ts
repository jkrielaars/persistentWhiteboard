import { LineCapEnum } from '../line-cap.enum';
import { LineJoinEnum } from '../line-join.enum';
import { IWhiteboardElementOptions } from '../whiteboard-element-options.model';
export declare class LineElement {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    strokeWidth: number;
    strokeColor: string;
    lineCap: LineCapEnum;
    lineJoin: LineJoinEnum;
    dasharray: string;
    dashoffset: number;
    constructor(options: IWhiteboardElementOptions);
}
