import { LineCapEnum } from '../line-cap.enum';
import { LineJoinEnum } from '../line-join.enum';
import { IWhiteboardElementOptions } from '../whiteboard-element-options.model';
export declare class TextElement {
    left: number;
    top: number;
    width: number;
    height: number;
    fontFamily: string;
    fontSize: number;
    fontStyle: 'normal' | 'italic';
    fontWeight: 'normal' | 'bold';
    fill: string;
    strokeWidth: number;
    strokeColor: string;
    lineJoin: LineJoinEnum;
    lineCap: LineCapEnum;
    dasharray: string;
    dashoffset: number;
    constructor(options: IWhiteboardElementOptions);
}
