import { IWhiteboardElementOptions } from '../whiteboard-element-options.model';
export declare class RectElement {
    width: number;
    height: number;
    x1: number;
    y1: number;
    rx: number;
    strokeWidth: number;
    strokeColor: string;
    fill: string;
    dasharray: string;
    dashoffset: number;
    constructor(options: IWhiteboardElementOptions);
}
