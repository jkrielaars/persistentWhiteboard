import { formatTypes, IAddImage } from './models';
import * as i0 from "@angular/core";
export declare class NgWhiteboardService {
    private eraseSvgMethodCallSource;
    private saveSvgMethodCallSource;
    private undoSvgMethodCallSource;
    private redoSvgMethodCallSource;
    private resetSvgMethodCalled;
    private addImageMethodCallSource;
    eraseSvgMethodCalled$: import("rxjs").Observable<void>;
    saveSvgMethodCalled$: import("rxjs").Observable<{
        name: string;
        format: formatTypes;
    }>;
    undoSvgMethodCalled$: import("rxjs").Observable<void>;
    redoSvgMethodCalled$: import("rxjs").Observable<void>;
    resetSvgMethodCalled$: import("rxjs").Observable<void>;
    addImageMethodCalled$: import("rxjs").Observable<IAddImage>;
    erase(): void;
    save(format?: formatTypes, name?: string): void;
    undo(): void;
    redo(): void;
    reset(): void;
    addImage(image: string | ArrayBuffer, x?: number, y?: number): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<NgWhiteboardService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<NgWhiteboardService>;
}
