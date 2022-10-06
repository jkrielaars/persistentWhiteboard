import { LineCapEnum } from '../line-cap.enum';
import { LineJoinEnum } from '../line-join.enum';
import { IWhiteboardElementOptions } from '../whiteboard-element-options.model';
export declare class BrushElement {
    strokeWidth: number;
    strokeColor: string;
    lineCap: LineCapEnum;
    lineJoin: LineJoinEnum;
    dasharray: string;
    dashoffset: number;
    constructor(options: IWhiteboardElementOptions);
}
