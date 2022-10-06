import { ElementTypeEnum } from './element-type.enum';
import { IWhiteboardElementOptions } from './whiteboard-element-options.model';
export declare class WhiteboardElement {
    type: ElementTypeEnum;
    value: string;
    id: string;
    x: number;
    y: number;
    rotation: number;
    opacity: number;
    options: IWhiteboardElementOptions;
    constructor(type: ElementTypeEnum, options: IWhiteboardElementOptions, value?: string);
}
