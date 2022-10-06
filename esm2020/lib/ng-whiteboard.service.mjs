import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { FormatType } from './models';
import * as i0 from "@angular/core";
export class NgWhiteboardService {
    constructor() {
        // Observable string sources
        this.eraseSvgMethodCallSource = new Subject();
        this.saveSvgMethodCallSource = new Subject();
        this.undoSvgMethodCallSource = new Subject();
        this.redoSvgMethodCallSource = new Subject();
        this.resetSvgMethodCalled = new Subject();
        this.addImageMethodCallSource = new Subject();
        // Observable string streams
        this.eraseSvgMethodCalled$ = this.eraseSvgMethodCallSource.asObservable();
        this.saveSvgMethodCalled$ = this.saveSvgMethodCallSource.asObservable();
        this.undoSvgMethodCalled$ = this.undoSvgMethodCallSource.asObservable();
        this.redoSvgMethodCalled$ = this.redoSvgMethodCallSource.asObservable();
        this.resetSvgMethodCalled$ = this.resetSvgMethodCalled.asObservable();
        this.addImageMethodCalled$ = this.addImageMethodCallSource.asObservable();
    }
    // Service message commands
    erase() {
        this.eraseSvgMethodCallSource.next();
    }
    save(format = FormatType.Base64, name = 'New board') {
        this.saveSvgMethodCallSource.next({ name, format });
    }
    undo() {
        this.undoSvgMethodCallSource.next();
    }
    redo() {
        this.redoSvgMethodCallSource.next();
    }
    reset() {
        this.resetSvgMethodCalled.next();
    }
    addImage(image, x, y) {
        this.addImageMethodCallSource.next({ image, x, y });
    }
}
NgWhiteboardService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.7", ngImport: i0, type: NgWhiteboardService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
NgWhiteboardService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.0.7", ngImport: i0, type: NgWhiteboardService, providedIn: 'root' });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.7", ngImport: i0, type: NgWhiteboardService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctd2hpdGVib2FyZC5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvbmctd2hpdGVib2FyZC9zcmMvbGliL25nLXdoaXRlYm9hcmQuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzNDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDL0IsT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSxVQUFVLENBQUM7O0FBSzlELE1BQU0sT0FBTyxtQkFBbUI7SUFIaEM7UUFJRSw0QkFBNEI7UUFDcEIsNkJBQXdCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUMvQyw0QkFBdUIsR0FBRyxJQUFJLE9BQU8sRUFBeUMsQ0FBQztRQUMvRSw0QkFBdUIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQzlDLDRCQUF1QixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDOUMseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUMzQyw2QkFBd0IsR0FBRyxJQUFJLE9BQU8sRUFBYSxDQUFDO1FBRTVELDRCQUE0QjtRQUM1QiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDckUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ25FLHlCQUFvQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNuRSx5QkFBb0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbkUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksRUFBRSxDQUFDO1FBRWpFLDBCQUFxQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztLQXFCdEU7SUFuQkMsMkJBQTJCO0lBQ3BCLEtBQUs7UUFDVixJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUNNLElBQUksQ0FBQyxTQUFzQixVQUFVLENBQUMsTUFBTSxFQUFFLE9BQWUsV0FBVztRQUM3RSxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUNNLElBQUk7UUFDVCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUNNLElBQUk7UUFDVCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUNNLEtBQUs7UUFDVixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUNNLFFBQVEsQ0FBQyxLQUEyQixFQUFFLENBQVUsRUFBRSxDQUFVO1FBQ2pFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEQsQ0FBQzs7Z0hBcENVLG1CQUFtQjtvSEFBbkIsbUJBQW1CLGNBRmxCLE1BQU07MkZBRVAsbUJBQW1CO2tCQUgvQixVQUFVO21CQUFDO29CQUNWLFVBQVUsRUFBRSxNQUFNO2lCQUNuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IEZvcm1hdFR5cGUsIGZvcm1hdFR5cGVzLCBJQWRkSW1hZ2UgfSBmcm9tICcuL21vZGVscyc7XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnLFxufSlcbmV4cG9ydCBjbGFzcyBOZ1doaXRlYm9hcmRTZXJ2aWNlIHtcbiAgLy8gT2JzZXJ2YWJsZSBzdHJpbmcgc291cmNlc1xuICBwcml2YXRlIGVyYXNlU3ZnTWV0aG9kQ2FsbFNvdXJjZSA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gIHByaXZhdGUgc2F2ZVN2Z01ldGhvZENhbGxTb3VyY2UgPSBuZXcgU3ViamVjdDx7IG5hbWU6IHN0cmluZzsgZm9ybWF0OiBmb3JtYXRUeXBlcyB9PigpO1xuICBwcml2YXRlIHVuZG9TdmdNZXRob2RDYWxsU291cmNlID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgcHJpdmF0ZSByZWRvU3ZnTWV0aG9kQ2FsbFNvdXJjZSA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gIHByaXZhdGUgcmVzZXRTdmdNZXRob2RDYWxsZWQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuICBwcml2YXRlIGFkZEltYWdlTWV0aG9kQ2FsbFNvdXJjZSA9IG5ldyBTdWJqZWN0PElBZGRJbWFnZT4oKTtcblxuICAvLyBPYnNlcnZhYmxlIHN0cmluZyBzdHJlYW1zXG4gIGVyYXNlU3ZnTWV0aG9kQ2FsbGVkJCA9IHRoaXMuZXJhc2VTdmdNZXRob2RDYWxsU291cmNlLmFzT2JzZXJ2YWJsZSgpO1xuICBzYXZlU3ZnTWV0aG9kQ2FsbGVkJCA9IHRoaXMuc2F2ZVN2Z01ldGhvZENhbGxTb3VyY2UuYXNPYnNlcnZhYmxlKCk7XG4gIHVuZG9TdmdNZXRob2RDYWxsZWQkID0gdGhpcy51bmRvU3ZnTWV0aG9kQ2FsbFNvdXJjZS5hc09ic2VydmFibGUoKTtcbiAgcmVkb1N2Z01ldGhvZENhbGxlZCQgPSB0aGlzLnJlZG9TdmdNZXRob2RDYWxsU291cmNlLmFzT2JzZXJ2YWJsZSgpO1xuICByZXNldFN2Z01ldGhvZENhbGxlZCQgPSB0aGlzLnJlc2V0U3ZnTWV0aG9kQ2FsbGVkLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIGFkZEltYWdlTWV0aG9kQ2FsbGVkJCA9IHRoaXMuYWRkSW1hZ2VNZXRob2RDYWxsU291cmNlLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIC8vIFNlcnZpY2UgbWVzc2FnZSBjb21tYW5kc1xuICBwdWJsaWMgZXJhc2UoKTogdm9pZCB7XG4gICAgdGhpcy5lcmFzZVN2Z01ldGhvZENhbGxTb3VyY2UubmV4dCgpO1xuICB9XG4gIHB1YmxpYyBzYXZlKGZvcm1hdDogZm9ybWF0VHlwZXMgPSBGb3JtYXRUeXBlLkJhc2U2NCwgbmFtZTogc3RyaW5nID0gJ05ldyBib2FyZCcpOiB2b2lkIHtcbiAgICB0aGlzLnNhdmVTdmdNZXRob2RDYWxsU291cmNlLm5leHQoeyBuYW1lLCBmb3JtYXQgfSk7XG4gIH1cbiAgcHVibGljIHVuZG8oKTogdm9pZCB7XG4gICAgdGhpcy51bmRvU3ZnTWV0aG9kQ2FsbFNvdXJjZS5uZXh0KCk7XG4gIH1cbiAgcHVibGljIHJlZG8oKTogdm9pZCB7XG4gICAgdGhpcy5yZWRvU3ZnTWV0aG9kQ2FsbFNvdXJjZS5uZXh0KCk7XG4gIH1cbiAgcHVibGljIHJlc2V0KCk6IHZvaWQge1xuICAgIHRoaXMucmVzZXRTdmdNZXRob2RDYWxsZWQubmV4dCgpO1xuICB9XG4gIHB1YmxpYyBhZGRJbWFnZShpbWFnZTogc3RyaW5nIHwgQXJyYXlCdWZmZXIsIHg/OiBudW1iZXIsIHk/OiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLmFkZEltYWdlTWV0aG9kQ2FsbFNvdXJjZS5uZXh0KHsgaW1hZ2UsIHgsIHkgfSk7XG4gIH1cbn1cbiJdfQ==