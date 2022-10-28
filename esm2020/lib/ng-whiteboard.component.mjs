import { Component, ViewChild, Input, ElementRef, Output, EventEmitter } from '@angular/core';
import { NgWhiteboardService } from './ng-whiteboard.service';
import { fromEvent, skip, BehaviorSubject } from 'rxjs';
import { ElementTypeEnum, FormatType, LineCapEnum, LineJoinEnum, ToolsEnum, WhiteboardElement } from './models';
import { curveBasis, drag, line, mouse, select, event } from 'd3';
import * as i0 from "@angular/core";
import * as i1 from "./ng-whiteboard.service";
import * as i2 from "@angular/common";
const d3Line = line().curve(curveBasis);
export class NgWhiteboardComponent {
    constructor(whiteboardService) {
        this.whiteboardService = whiteboardService;
        this._data = new BehaviorSubject([]);
        this.drawingEnabled = true;
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.fullScreen = true;
        this.center = true;
        this.strokeColor = '#000';
        this.strokeWidth = 2;
        this.backgroundColor = '#fff';
        this.lineJoin = LineJoinEnum.ROUND;
        this.lineCap = LineCapEnum.ROUND;
        this.fill = '#333';
        this.zoom = 1;
        this.fontFamily = 'sans-serif';
        this.fontSize = 24;
        this.dasharray = '';
        this.dashoffset = 0;
        this.x = 0;
        this.y = 0;
        this.enableGrid = false;
        this.gridSize = 10;
        this.snapToGrid = false;
        this.persistenceId = undefined;
        this.ready = new EventEmitter();
        this.dataChange = new EventEmitter();
        this.clear = new EventEmitter();
        this.undo = new EventEmitter();
        this.redo = new EventEmitter();
        this.save = new EventEmitter();
        this.imageAdded = new EventEmitter();
        this.selectElement = new EventEmitter();
        this.deleteElement = new EventEmitter();
        this.toolChanged = new EventEmitter();
        this._subscriptionList = [];
        this._initialData = [];
        this.undoStack = [];
        this.redoStack = [];
        this._selectedTool = ToolsEnum.BRUSH;
        this.types = ElementTypeEnum;
        this.tools = ToolsEnum;
        this.rubberBox = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            display: 'none',
        };
    }
    set data(data) {
        if (data) {
            this._data.next(data);
        }
    }
    get data() {
        return this._data.getValue();
    }
    set selectedTool(tool) {
        if (this._selectedTool !== tool) {
            this._selectedTool = tool;
            this.toolChanged.emit(tool);
            this.clearSelectedElement();
        }
    }
    get selectedTool() {
        return this._selectedTool;
    }
    ngOnInit() {
        this._initInputsFromOptions(this.options);
        this._initObservables();
        this._initialData = JSON.parse(JSON.stringify(this.data));
        if (this.persistenceId) {
            try {
                const stored = localStorage.getItem(`whiteboard_${this.persistenceId}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    this._data.next(parsed.data || []);
                    this.undoStack = parsed.undoStack || [];
                    this.redoStack = parsed.redoStack || [];
                }
            }
            catch (e) {
                console.warn('Corrupt whiteboard data');
            }
        }
    }
    ngOnChanges(changes) {
        if (changes['options']) {
            //&& !isEqual(changes.options.currentValue, changes.options.previousValue)
            this._initInputsFromOptions(changes['options'].currentValue);
        }
    }
    ngAfterViewInit() {
        this.selection = select(this.svgContainer.nativeElement);
        setTimeout(() => {
            this.resizeScreen();
        }, 0);
        this.initalizeEvents(this.selection);
        this.ready.emit();
    }
    ngOnDestroy() {
        this._subscriptionList.forEach((subscription) => this._unsubscribe(subscription));
    }
    _initInputsFromOptions(options) {
        if (options) {
            if (options.drawingEnabled != undefined) {
                this.drawingEnabled = options.drawingEnabled;
            }
            if (options.selectedTool != undefined) {
                this.selectedTool = options.selectedTool;
            }
            if (options.canvasWidth != undefined) {
                this.canvasWidth = options.canvasWidth;
            }
            if (options.canvasHeight != undefined) {
                this.canvasHeight = options.canvasHeight;
            }
            if (options.fullScreen != undefined) {
                this.fullScreen = options.fullScreen;
            }
            if (options.center != undefined) {
                this.center = options.center;
            }
            if (options.strokeColor != undefined) {
                this.strokeColor = options.strokeColor;
            }
            if (options.strokeWidth != undefined) {
                this.strokeWidth = options.strokeWidth;
            }
            if (options.backgroundColor != undefined) {
                this.backgroundColor = options.backgroundColor;
            }
            if (options.lineJoin != undefined) {
                this.lineJoin = options.lineJoin;
            }
            if (options.lineCap != undefined) {
                this.lineCap = options.lineCap;
            }
            if (options.fill != undefined) {
                this.fill = options.fill;
            }
            if (options.zoom != undefined) {
                this.zoom = options.zoom;
            }
            if (options.fontFamily != undefined) {
                this.fontFamily = options.fontFamily;
            }
            if (options.fontSize != undefined) {
                this.fontSize = options.fontSize;
            }
            if (options.dasharray != undefined) {
                this.dasharray = options.dasharray;
            }
            if (options.dashoffset != undefined) {
                this.dashoffset = options.dashoffset;
            }
            if (options.x != undefined) {
                this.x = options.x;
            }
            if (options.y != undefined) {
                this.y = options.y;
            }
            if (options.enableGrid != undefined) {
                this.enableGrid = options.enableGrid;
            }
            if (options.gridSize != undefined) {
                this.gridSize = options.gridSize;
            }
            if (options.snapToGrid != undefined) {
                this.snapToGrid = options.snapToGrid;
            }
            if (options.persistenceId != undefined) {
                this.persistenceId = options.persistenceId;
            }
        }
    }
    _initObservables() {
        this._subscriptionList.push(this.whiteboardService.saveSvgMethodCalled$.subscribe(({ name, format }) => this.saveSvg(name, format)));
        this._subscriptionList.push(this.whiteboardService.addImageMethodCalled$.subscribe((image) => this.handleDrawImage(image)));
        this._subscriptionList.push(this.whiteboardService.eraseSvgMethodCalled$.subscribe(() => this._clearSvg()));
        this._subscriptionList.push(this.whiteboardService.resetSvgMethodCalled$.subscribe(() => this._reset()));
        this._subscriptionList.push(this.whiteboardService.undoSvgMethodCalled$.subscribe(() => this.undoDraw()));
        this._subscriptionList.push(this.whiteboardService.redoSvgMethodCalled$.subscribe(() => this.redoDraw()));
        this._subscriptionList.push(fromEvent(window, 'resize').subscribe(() => this.resizeScreen()));
        this._subscriptionList.push(this._data.pipe(skip(1)).subscribe((data) => {
            const stored = JSON.parse(localStorage.getItem(`whiteboard_${this.persistenceId}`) || '{}');
            stored.data = data;
            localStorage.setItem(`whiteboard_${this.persistenceId}`, JSON.stringify(stored));
            this.dataChange.emit(data);
        }));
    }
    initalizeEvents(selection) {
        if (!this.drawingEnabled) {
            return;
        }
        let dragging = false;
        selection.call(drag()
            .on('start', () => {
            dragging = true;
            this.redoStack = [];
            this.updateLocalStorage();
            this.handleStartEvent();
        })
            .on('drag', () => {
            if (!dragging) {
                return;
            }
            this.handleDragEvent();
        })
            .on('end', () => {
            dragging = false;
            this.handleEndEvent();
        }));
    }
    handleStartEvent() {
        switch (this.selectedTool) {
            case ToolsEnum.BRUSH:
                this.handleStartBrush();
                break;
            case ToolsEnum.IMAGE:
                this.handleImageTool();
                break;
            case ToolsEnum.LINE:
                this.handleStartLine();
                break;
            case ToolsEnum.RECT:
                this.handleStartRect();
                break;
            case ToolsEnum.ELLIPSE:
                this.handleStartEllipse();
                break;
            case ToolsEnum.TEXT:
                this.handleTextTool();
                break;
            case ToolsEnum.SELECT:
                this.handleSelectTool();
                break;
            case ToolsEnum.ERASER:
                this.handleEraserTool();
                break;
            default:
                break;
        }
    }
    handleDragEvent() {
        switch (this.selectedTool) {
            case ToolsEnum.BRUSH:
                this.handleDragBrush();
                break;
            case ToolsEnum.LINE:
                this.handleDragLine();
                break;
            case ToolsEnum.RECT:
                this.handleDragRect();
                break;
            case ToolsEnum.ELLIPSE:
                this.handleDragEllipse();
                break;
            case ToolsEnum.TEXT:
                this.handleTextDrag();
                break;
            default:
                break;
        }
    }
    handleEndEvent() {
        switch (this.selectedTool) {
            case ToolsEnum.BRUSH:
                this.handleEndBrush();
                break;
            case ToolsEnum.LINE:
                this.handleEndLine();
                break;
            case ToolsEnum.RECT:
                this.handleEndRect();
                break;
            case ToolsEnum.ELLIPSE:
                this.handleEndEllipse();
                break;
            case ToolsEnum.TEXT:
                this.handleTextEnd();
                break;
            default:
                break;
        }
    }
    // Handle Brush tool
    handleStartBrush() {
        const element = this._generateNewElement(ElementTypeEnum.BRUSH);
        this.tempDraw = [this._calculateXAndY(mouse(this.selection.node()))];
        element.value = d3Line(this.tempDraw);
        element.options.strokeWidth = this.strokeWidth;
        this.tempElement = element;
    }
    handleDragBrush() {
        this.tempDraw.push(this._calculateXAndY(mouse(this.selection.node())));
        this.tempElement.value = d3Line(this.tempDraw);
    }
    handleEndBrush() {
        this.tempDraw.push(this._calculateXAndY(mouse(this.selection.node())));
        this.tempElement.value = d3Line(this.tempDraw);
        this._pushToData(this.tempElement);
        this._pushToUndo();
        this.tempDraw = null;
        this.tempElement = null;
    }
    // Handle Image tool
    handleImageTool() {
        const [x, y] = this._calculateXAndY(mouse(this.selection.node()));
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const files = e.target.files;
            if (files) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const image = e.target.result;
                    this.handleDrawImage({ image, x, y });
                };
                reader.readAsDataURL(files[0]);
            }
        };
        input.click();
    }
    // Handle Draw Image
    handleDrawImage(imageSrc) {
        try {
            const tempImg = new Image();
            tempImg.onload = () => {
                const svgHeight = this.canvasHeight;
                const imageWidth = tempImg.width;
                const imageHeight = tempImg.height;
                const aspectRatio = tempImg.width / tempImg.height;
                const height = imageHeight > svgHeight ? svgHeight - 40 : imageHeight;
                const width = height === svgHeight - 40 ? (svgHeight - 40) * aspectRatio : imageWidth;
                let x = imageSrc.x || (imageWidth - width) * (imageSrc.x || 0);
                let y = imageSrc.y || (imageHeight - height) * (imageSrc.y || 0);
                if (x < 0) {
                    x = 0;
                }
                if (y < 0) {
                    y = 0;
                }
                const element = this._generateNewElement(ElementTypeEnum.IMAGE);
                element.value = imageSrc.image;
                element.options.width = width;
                element.options.height = height;
                element.x = x;
                element.y = y;
                this._pushToData(element);
                this.imageAdded.emit();
                this._pushToUndo();
            };
            tempImg.src = imageSrc.image;
        }
        catch (error) {
            console.error(error);
        }
    }
    // Handle Line tool
    handleStartLine() {
        const element = this._generateNewElement(ElementTypeEnum.LINE);
        let [x, y] = this._calculateXAndY(mouse(this.selection.node()));
        if (this.snapToGrid) {
            x = this._snapToGrid(x);
            y = this._snapToGrid(y);
        }
        element.options.x1 = x;
        element.options.y1 = y;
        element.options.x2 = x;
        element.options.y2 = y;
        this.tempElement = element;
    }
    handleDragLine() {
        let [x2, y2] = this._calculateXAndY(mouse(this.selection.node()));
        if (this.snapToGrid) {
            x2 = this._snapToGrid(x2);
            y2 = this._snapToGrid(y2);
        }
        if (event.sourceEvent.shiftKey) {
            const x1 = this.tempElement.options.x1;
            const y1 = this.tempElement.options.y1;
            const { x, y } = this._snapToAngle(x1, y1, x2, y2);
            [x2, y2] = [x, y];
        }
        this.tempElement.options.x2 = x2;
        this.tempElement.options.y2 = y2;
    }
    handleEndLine() {
        if (this.tempElement.options.x1 != this.tempElement.options.x2 ||
            this.tempElement.options.y1 != this.tempElement.options.y2) {
            this._pushToData(this.tempElement);
            this._pushToUndo();
            this.tempElement = null;
        }
    }
    // Handle Rect tool
    handleStartRect() {
        const element = this._generateNewElement(ElementTypeEnum.RECT);
        let [x, y] = this._calculateXAndY(mouse(this.selection.node()));
        if (this.snapToGrid) {
            x = this._snapToGrid(x);
            y = this._snapToGrid(y);
        }
        element.options.x1 = x;
        element.options.y1 = y;
        element.options.x2 = x;
        element.options.y2 = y;
        element.options.width = 1;
        element.options.height = 1;
        this.tempElement = element;
    }
    handleDragRect() {
        const [x, y] = this._calculateXAndY(mouse(this.selection.node()));
        const start_x = this.tempElement.options.x1 || 0;
        const start_y = this.tempElement.options.y1 || 0;
        let w = Math.abs(x - start_x);
        let h = Math.abs(y - start_y);
        let new_x = null;
        let new_y = null;
        if (event.sourceEvent.shiftKey) {
            w = h = Math.max(w, h);
            new_x = start_x < x ? start_x : start_x - w;
            new_y = start_y < y ? start_y : start_y - h;
        }
        else {
            new_x = Math.min(start_x, x);
            new_y = Math.min(start_y, y);
        }
        if (event.sourceEvent.altKey) {
            w *= 2;
            h *= 2;
            new_x = start_x - w / 2;
            new_y = start_y - h / 2;
        }
        if (this.snapToGrid) {
            w = this._snapToGrid(w);
            h = this._snapToGrid(h);
            new_x = this._snapToGrid(new_x);
            new_y = this._snapToGrid(new_y);
        }
        this.tempElement.options.width = w;
        this.tempElement.options.height = h;
        this.tempElement.options.x2 = new_x;
        this.tempElement.options.y2 = new_y;
    }
    handleEndRect() {
        if (this.tempElement.options.width != 0 || this.tempElement.options.height != 0) {
            this._pushToData(this.tempElement);
            this._pushToUndo();
            this.tempElement = null;
        }
    }
    // Handle Ellipse tool
    handleStartEllipse() {
        const element = this._generateNewElement(ElementTypeEnum.ELLIPSE);
        const [x, y] = this._calculateXAndY(mouse(this.selection.node()));
        // workaround
        element.options.x1 = x;
        element.options.y1 = y;
        element.options.cx = x;
        element.options.cy = y;
        this.tempElement = element;
    }
    handleDragEllipse() {
        const [x, y] = this._calculateXAndY(mouse(this.selection.node()));
        const start_x = this.tempElement.options.x1 || 0;
        const start_y = this.tempElement.options.y1 || 0;
        let cx = Math.abs(start_x + (x - start_x) / 2);
        let cy = Math.abs(start_y + (y - start_y) / 2);
        let rx = Math.abs(start_x - cx);
        let ry = Math.abs(start_y - cy);
        if (event.sourceEvent.shiftKey) {
            ry = rx;
            cy = y > start_y ? start_y + rx : start_y - rx;
        }
        if (event.sourceEvent.altKey) {
            cx = start_x;
            cy = start_y;
            rx = Math.abs(x - cx);
            ry = event.sourceEvent.shiftKey ? rx : Math.abs(y - cy);
        }
        this.tempElement.options.rx = rx;
        this.tempElement.options.ry = ry;
        this.tempElement.options.cx = cx;
        this.tempElement.options.cy = cy;
    }
    handleEndEllipse() {
        if (this.tempElement.options.rx != 0 || this.tempElement.options.ry != 0) {
            this._pushToData(this.tempElement);
            this._pushToUndo();
            this.tempElement = null;
        }
    }
    // Handle Text tool
    handleTextTool() {
        if (this.tempElement) {
            // finish the current one if needed
            this.finishTextInput();
            return;
        }
        const element = this._generateNewElement(ElementTypeEnum.TEXT);
        const [x, y] = this._calculateXAndY(mouse(this.selection.node()));
        element.options.top = y;
        element.options.left = x;
        element.options.strokeWidth = 0;
        this.tempElement = element;
        setTimeout(() => {
            this.textInput.nativeElement.focus();
        }, 0);
    }
    handleTextDrag() {
        if (!this.tempElement) {
            return;
        }
        const [x, y] = this._calculateXAndY(mouse(this.selection.node()));
        this.tempElement.options.top = y;
        this.tempElement.options.left = x;
    }
    handleTextEnd() {
        if (!this.tempElement) {
            return;
        }
        this._pushToUndo();
    }
    // Handle Select tool
    handleSelectTool() {
        const mouse_target = this._getMouseTarget();
        if (mouse_target) {
            if (mouse_target.id === 'selectorGroup') {
                return;
            }
            const id = mouse_target.getAttribute('data-wb-id');
            const selectedElement = this.data.find((el) => el.id === id);
            this.setSelectedElement(selectedElement);
        }
        else {
            this.clearSelectedElement();
        }
    }
    // Handle Eraser tool
    handleEraserTool() {
        const mouse_target = this._getMouseTarget();
        if (mouse_target) {
            const id = mouse_target.getAttribute('data-wb-id');
            const element = this.data.find((el) => el.id === id);
            if (element) {
                this.data = this.data.filter((el) => el.id !== id);
                this._pushToUndo();
                this.deleteElement.emit(element);
            }
        }
    }
    // convert the value of this.textInput.nativeElement to an SVG text node, unless it's empty,
    // and then dismiss this.textInput.nativeElement
    finishTextInput() {
        const value = this.textInput.nativeElement.value;
        this.tempElement.value = value;
        if (this.tempElement.value) {
            this._pushToData(this.tempElement);
            this._pushToUndo();
        }
        this.tempElement = null;
    }
    // Handle Text Input
    updateTextItem(value) {
        if (this.tempElement && this.selectedTool == ToolsEnum.TEXT) {
            this.tempElement.value = value;
        }
    }
    setSelectedElement(element) {
        this.selectedTool = ToolsEnum.SELECT;
        const currentBBox = this._getElementBbox(element);
        this.selectedElement = element;
        this.selectElement.emit(element);
        this._showGrips(currentBBox);
    }
    clearSelectedElement() {
        this.selectedElement = null;
        this.rubberBox.display = 'none';
        this.selectElement.emit(null);
    }
    saveSvg(name, format) {
        const svgCanvas = this.selection.select('#svgcontent').clone(true);
        svgCanvas.select('#selectorParentGroup').remove();
        svgCanvas.select('#contentBackground').node().removeAttribute('opacity');
        const svg = svgCanvas.node();
        svg.setAttribute('x', '0');
        svg.setAttribute('y', '0');
        const svgString = this.saveAsSvg(svg);
        switch (format) {
            case FormatType.Base64:
                this.svgString2Image(svgString, this.canvasWidth, this.canvasHeight, format, (img) => {
                    this.save.emit(img);
                });
                break;
            case FormatType.Svg: {
                const imgSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
                this.download(imgSrc, name);
                this.save.emit(imgSrc);
                break;
            }
            default:
                this.svgString2Image(svgString, this.canvasWidth, this.canvasHeight, format, (img) => {
                    this.download(img, name);
                    this.save.emit(img);
                });
                break;
        }
        svgCanvas.remove();
    }
    svgString2Image(svgString, width, height, format, callback) {
        // set default for format parameter
        format = format || 'png';
        // SVG data URL from SVG string
        const svgData = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
        // create canvas in memory(not in DOM)
        const canvas = document.createElement('canvas');
        // get canvas context for drawing on canvas
        const context = canvas.getContext('2d');
        // set canvas size
        canvas.width = width;
        canvas.height = height;
        // create image in memory(not in DOM)
        const image = new Image();
        // later when image loads run this
        image.onload = () => {
            // async (happens later)
            // clear canvas
            context.clearRect(0, 0, width, height);
            // draw image with SVG data to canvas
            context.drawImage(image, 0, 0, width, height);
            // snapshot canvas as png
            const pngData = canvas.toDataURL('image/' + format);
            // pass png data URL to callback
            callback(pngData);
        }; // end async
        // start loading SVG data into in memory image
        image.src = svgData;
    }
    saveAsSvg(svgNode) {
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgNode);
        svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
        svgString = svgString.replace(/NS\d+:href/g, 'xlink:href');
        return svgString;
    }
    download(url, name) {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('visibility', 'hidden');
        link.download = name || 'new white-board';
        document.body.appendChild(link);
        link.click();
    }
    _pushToData(element) {
        this.data.push(element);
        this._data.next(this.data);
    }
    _clearSvg() {
        this.data = [];
        this._data.next(this.data);
        this._pushToUndo();
        this.clear.emit();
    }
    undoDraw() {
        if (!this.undoStack.length) {
            return;
        }
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);
        if (this.undoStack.length) {
            this.data = JSON.parse(JSON.stringify(this.undoStack[this.undoStack.length - 1]));
        }
        else {
            this.data = JSON.parse(JSON.stringify(this._initialData)) || [];
        }
        this.updateLocalStorage();
        this.undo.emit();
    }
    redoDraw() {
        if (!this.redoStack.length) {
            return;
        }
        const currentState = this.redoStack.pop();
        this.undoStack.push(JSON.parse(JSON.stringify(currentState)));
        this.data = currentState || [];
        this.updateLocalStorage();
        this.redo.emit();
    }
    _pushToUndo() {
        this.undoStack.push(JSON.parse(JSON.stringify(this.data)));
        this.updateLocalStorage();
    }
    _reset() {
        this.undoStack = [];
        this.redoStack = [];
        try {
            this.data = JSON.parse(JSON.stringify(this._initialData));
        }
        catch (e) {
            this.data = [];
        }
        this.updateLocalStorage();
    }
    updateLocalStorage() {
        const storageObject = { data: this.data, undoStack: this.undoStack, redoStack: this.redoStack };
        localStorage.setItem(`whiteboard_${this.persistenceId}`, JSON.stringify(storageObject));
    }
    _generateNewElement(name) {
        const element = new WhiteboardElement(name, {
            strokeWidth: this.strokeWidth,
            strokeColor: this.strokeColor,
            fill: this.fill,
            lineJoin: this.lineJoin,
            lineCap: this.lineCap,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            dasharray: this.dasharray,
            dashoffset: this.dashoffset,
        });
        return element;
    }
    _calculateXAndY([x, y]) {
        return [(x - this.x) / this.zoom, (y - this.y) / this.zoom];
    }
    resizeScreen() {
        const svgContainer = this.svgContainer.nativeElement;
        if (this.fullScreen) {
            this.canvasWidth = svgContainer.clientWidth;
            this.canvasHeight = svgContainer.clientHeight;
        }
        if (this.center) {
            this.x = svgContainer.clientWidth / 2 - this.canvasWidth / 2;
            this.y = svgContainer.clientHeight / 2 - this.canvasHeight / 2;
        }
    }
    _snapToAngle(x1, y1, x2, y2) {
        const snap = Math.PI / 4; // 45 degrees
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const snapangle = Math.round(angle / snap) * snap;
        const x = x1 + dist * Math.cos(snapangle);
        const y = y1 + dist * Math.sin(snapangle);
        return { x: x, y: y, a: snapangle };
    }
    _snapToGrid(n) {
        const snap = this.gridSize;
        const n1 = Math.round(n / snap) * snap;
        return n1;
    }
    _getElementBbox(element) {
        const el = this.selection.select(`#item_${element.id}`).node();
        const bbox = el.getBBox();
        return bbox;
    }
    _getMouseTarget() {
        const evt = event.sourceEvent;
        if (evt == null || evt.target == null) {
            return null;
        }
        let mouse_target = evt.target;
        if (mouse_target.id === 'svgroot') {
            return null;
        }
        if (mouse_target.parentNode) {
            mouse_target = mouse_target.parentNode.parentNode;
            if (mouse_target.id === 'selectorGroup') {
                return mouse_target;
            }
            while (!mouse_target.id.includes('item_')) {
                if (mouse_target.id === 'svgroot') {
                    return null;
                }
                mouse_target = mouse_target.parentNode;
            }
        }
        return mouse_target;
    }
    _showGrips(bbox) {
        this.rubberBox = {
            x: bbox.x - (this.selectedElement.options.strokeWidth || 0) * 0.5,
            y: bbox.y - (this.selectedElement.options.strokeWidth || 0) * 0.5,
            width: bbox.width + this.selectedElement.options.strokeWidth || 0,
            height: bbox.height + this.selectedElement.options.strokeWidth || 0,
            display: 'block',
        };
    }
    moveSelect(downEvent) {
        let isPointerDown = true;
        const element = downEvent.target;
        element.addEventListener('pointermove', (moveEvent) => {
            if (!isPointerDown)
                return;
            if (this.selectedElement) {
                this.selectedElement.x += moveEvent.movementX;
                this.selectedElement.y += moveEvent.movementY;
            }
        });
        element.addEventListener('pointerup', () => {
            isPointerDown = false;
        });
    }
    resizeSelect(downEvent) {
        let isPointerDown = true;
        const element = downEvent.target;
        document.addEventListener('pointermove', (moveEvent) => {
            if (!isPointerDown)
                return;
            const grip = element.id.split('_')[2];
            const x = moveEvent.movementX;
            const y = moveEvent.movementY;
            const bbox = this._getElementBbox(this.selectedElement);
            const width = bbox.width;
            const height = bbox.height;
            switch (this.selectedElement.type) {
                case ElementTypeEnum.ELLIPSE:
                    this._resizeElipse(grip, { x, y, width, height });
                    break;
                case ElementTypeEnum.LINE:
                    this._resizeLine(grip, { x, y, width, height });
                    break;
                default:
                    this._resizeDefault(grip, { x, y, width, height });
                    break;
            }
            this._showGrips(this._getElementBbox(this.selectedElement));
        });
        document.addEventListener('pointerup', () => {
            isPointerDown = false;
        });
    }
    _resizeLine(dir, bbox) {
        switch (dir) {
            case 'nw':
                this.selectedElement.options.x1 += bbox.x;
                this.selectedElement.options.y1 += bbox.y;
                break;
            case 'n':
                this.selectedElement.options.y1 += bbox.y;
                break;
            case 'ne':
                this.selectedElement.options.x2 += bbox.x;
                this.selectedElement.options.y1 += bbox.y;
                break;
            case 'e':
                this.selectedElement.options.x2 += bbox.x;
                break;
            case 'se':
                this.selectedElement.options.x2 += bbox.x;
                this.selectedElement.options.y2 += bbox.y;
                break;
            case 's':
                this.selectedElement.options.y2 += bbox.y;
                break;
            case 'sw':
                this.selectedElement.options.x1 += bbox.x;
                this.selectedElement.options.y2 += bbox.y;
                break;
            case 'w':
                this.selectedElement.options.x1 += bbox.x;
                break;
        }
    }
    _resizeElipse(dir, bbox) {
        switch (dir) {
            case 'nw':
                this.selectedElement.x += bbox.x / 2;
                this.selectedElement.y += bbox.y / 2;
                this.selectedElement.options.rx -= bbox.x / 2;
                this.selectedElement.options.ry -= bbox.y / 2;
                break;
            case 'n':
                this.selectedElement.y += bbox.y / 2;
                this.selectedElement.options.ry -= bbox.y / 2;
                break;
            case 'ne':
                this.selectedElement.x += bbox.x / 2;
                this.selectedElement.y += bbox.y / 2;
                this.selectedElement.options.rx += bbox.x / 2;
                this.selectedElement.options.ry -= bbox.y / 2;
                break;
            case 'e':
                this.selectedElement.x += bbox.x / 2;
                this.selectedElement.options.rx += bbox.x / 2;
                break;
            case 'se':
                this.selectedElement.x += bbox.x / 2;
                this.selectedElement.y += bbox.y / 2;
                this.selectedElement.options.rx += bbox.x / 2;
                this.selectedElement.options.ry += bbox.y / 2;
                break;
            case 's':
                this.selectedElement.y += bbox.y / 2;
                this.selectedElement.options.ry += bbox.y / 2;
                break;
            case 'sw':
                this.selectedElement.x += bbox.x / 2;
                this.selectedElement.y += bbox.y / 2;
                this.selectedElement.options.rx -= bbox.x / 2;
                this.selectedElement.options.ry += bbox.y / 2;
                break;
            case 'w':
                this.selectedElement.x += bbox.x / 2;
                this.selectedElement.options.rx -= bbox.x / 2;
                break;
        }
    }
    _resizeDefault(dir, bbox) {
        switch (dir) {
            case 'nw':
                this.selectedElement.x += bbox.x;
                this.selectedElement.y += bbox.y;
                this.selectedElement.options.width = bbox.width - bbox.x;
                this.selectedElement.options.height = bbox.height - bbox.y;
                break;
            case 'n':
                this.selectedElement.y += bbox.y;
                this.selectedElement.options.height = bbox.height - bbox.y;
                break;
            case 'ne':
                this.selectedElement.y += bbox.y;
                this.selectedElement.options.width = bbox.width + bbox.x;
                this.selectedElement.options.height = bbox.height - bbox.y;
                break;
            case 'e':
                this.selectedElement.options.width = bbox.width + bbox.x;
                break;
            case 'se':
                this.selectedElement.options.width = bbox.width + bbox.x;
                this.selectedElement.options.height = bbox.height + bbox.y;
                break;
            case 's':
                this.selectedElement.options.height = bbox.height + bbox.y;
                break;
            case 'sw':
                this.selectedElement.x += bbox.x;
                this.selectedElement.options.width = bbox.width - bbox.x;
                this.selectedElement.options.height = bbox.height + bbox.y;
                break;
            case 'w':
                this.selectedElement.x += bbox.x;
                this.selectedElement.options.width = bbox.width - bbox.x;
                break;
        }
    }
    _unsubscribe(subscription) {
        if (subscription) {
            subscription.unsubscribe();
        }
    }
}
NgWhiteboardComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.7", ngImport: i0, type: NgWhiteboardComponent, deps: [{ token: i1.NgWhiteboardService }], target: i0.ɵɵFactoryTarget.Component });
NgWhiteboardComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "14.0.7", type: NgWhiteboardComponent, selector: "ng-whiteboard", inputs: { data: "data", options: "options", selectedTool: "selectedTool", drawingEnabled: "drawingEnabled", canvasWidth: "canvasWidth", canvasHeight: "canvasHeight", fullScreen: "fullScreen", center: "center", strokeColor: "strokeColor", strokeWidth: "strokeWidth", backgroundColor: "backgroundColor", lineJoin: "lineJoin", lineCap: "lineCap", fill: "fill", zoom: "zoom", fontFamily: "fontFamily", fontSize: "fontSize", dasharray: "dasharray", dashoffset: "dashoffset", x: "x", y: "y", enableGrid: "enableGrid", gridSize: "gridSize", snapToGrid: "snapToGrid", persistenceId: "persistenceId" }, outputs: { ready: "ready", dataChange: "dataChange", clear: "clear", undo: "undo", redo: "redo", save: "save", imageAdded: "imageAdded", selectElement: "selectElement", deleteElement: "deleteElement", toolChanged: "toolChanged" }, viewQueries: [{ propertyName: "svgContainer", first: true, predicate: ["svgContainer"], descendants: true }, { propertyName: "textInput", first: true, predicate: ["textInput"], descendants: true }], usesOnChanges: true, ngImport: i0, template: "<svg [class]=\"'svgroot ' + selectedTool\" #svgContainer id=\"svgroot\" xlinkns=\"http://www.w3.org/1999/xlink\">\n  <svg id=\"canvasBackground\" [attr.width]=\"canvasWidth * zoom\" [attr.height]=\"canvasHeight * zoom\" [attr.x]=\"x\"\n    [attr.y]=\"y\" style=\"pointer-events: none;\">\n    <defs id=\"grid-pattern\">\n      <pattern id=\"smallGrid\" [attr.width]=\"gridSize\" [attr.height]=\"gridSize\" patternUnits=\"userSpaceOnUse\">\n        <path [attr.d]=\"'M '+gridSize+' 0 H 0 V '+gridSize+''\" fill=\"none\" stroke=\"gray\" stroke-width=\"0.5\" />\n      </pattern>\n      <pattern id=\"grid\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\">\n        <rect width=\"100\" height=\"100\" fill=\"url(#smallGrid)\" />\n        <path d=\"M 100 0 H 0 V 100\" fill=\"none\" stroke=\"gray\" stroke-width=\"2\" />\n      </pattern>\n    </defs>\n    <defs id=\"placeholder_defs\"></defs>\n    <rect width=\"100%\" height=\"100%\" x=\"0\" y=\"0\" stroke-width=\"0\" stroke=\"transparent\" [attr.fill]=\"backgroundColor\"\n      style=\"pointer-events: none;\"></rect>\n    <g *ngIf=\"enableGrid\">\n      <rect x=\"-100\" y=\"-100\" [attr.width]=\"(canvasWidth * zoom) + 100*2\" [attr.height]=\"(canvasHeight * zoom) + 100*2\"\n        fill=\"url(#grid)\" />\n    </g>\n  </svg>\n  <svg xmlns=\"http://www.w3.org/2000/svg\" [attr.width]=\"canvasWidth * zoom\" [attr.height]=\"canvasHeight * zoom\"\n    [attr.viewBox]=\"[0, 0, canvasWidth, canvasHeight]\" id=\"svgcontent\" [attr.x]=\"x\" [attr.y]=\"y\">\n    <rect id=\"contentBackground\" opacity=\"0\" width=\"100%\" height=\"100%\" x=\"0\" y=\"0\" stroke-width=\"0\"\n      stroke=\"transparent\" [attr.fill]=\"backgroundColor\"></rect>\n    <g style=\"pointer-events: all;\">\n      <title style=\"pointer-events: inherit;\">Whiteboard</title>\n      <ng-container *ngFor=\"let item of data\">\n        <g class=\"wb_element\" [id]=\"'item_' + item.id\" [attr.data-wb-id]=\"item.id\" [ngSwitch]=\"item.type\"\n          [attr.transform]=\"'translate(' + item.x + ',' + item.y + ')' + 'rotate(' + item.rotation + ')'\"\n          [attr.opacity]=\"item.opacity / 100\">\n          <g *ngSwitchCase=\"types.BRUSH\">\n            <path class=\"brush\" fill=\"none\" [attr.d]=\"item.value\" [attr.stroke-dasharray]=\"item.options.dasharray\"\n              [attr.stroke-dashoffset]=\"1\" [attr.stroke-width]=\"item.options.strokeWidth\"\n              [attr.stroke-linecap]=\"item.options.lineCap\" [attr.stroke-linejoin]=\"item.options.lineJoin\"\n              [attr.stroke]=\"item.options.strokeColor\"></path>\n          </g>\n          <g *ngSwitchCase=\"types.IMAGE\">\n            <image [attr.height]=\"item.options.height\" [attr.width]=\"item.options.width\" preserveAspectRatio=\"none\"\n              [attr.xlink:href]=\"item.value\" [attr.href]=\"item.value\" [attr.stroke-width]=\"item.options.strokeWidth\"\n              [attr.stroke-dasharray]=\"item.options.dasharray\" [attr.fill]=\"item.options.fill\"\n              [attr.stroke]=\"item.options.strokeColor\" style=\"pointer-events: inherit;\"></image>\n          </g>\n          <g *ngSwitchCase=\"types.LINE\">\n            <line class=\"line\" [attr.x1]=\"item.options.x1\" [attr.y1]=\"item.options.y1\" [attr.x2]=\"item.options.x2\"\n              [attr.y2]=\"item.options.y2\" style=\"pointer-events: inherit;\"\n              [attr.stroke-dasharray]=\"item.options.dasharray\" [attr.stroke-dashoffset]=\"1\"\n              [attr.stroke-width]=\"item.options.strokeWidth\" [attr.stroke-linecap]=\"item.options.lineCap\"\n              [attr.stroke-linejoin]=\"item.options.lineJoin\" [attr.stroke]=\"item.options.strokeColor\"></line>\n          </g>\n          <g *ngSwitchCase=\"types.RECT\">\n            <rect class=\"rect\" [attr.x]=\"item.options.x2\" [attr.y]=\"item.options.y2\" [attr.rx]=\"item.options.rx\"\n              [attr.width]=\"item.options.width\" [attr.height]=\"item.options.height\"\n              [attr.stroke-dasharray]=\"item.options.dasharray\" [attr.stroke-dashoffset]=\"item.options.dashoffset\"\n              [attr.stroke-width]=\"item.options.strokeWidth\" [attr.fill]=\"item.options.fill\"\n              [attr.stroke]=\"item.options.strokeColor\"></rect>\n          </g>\n          <g *ngSwitchCase=\"types.ELLIPSE\">\n            <ellipse [attr.cx]=\"item.options.cx\" [attr.cy]=\"item.options.cy\" [attr.rx]=\"item.options.rx\"\n              [attr.ry]=\"item.options.ry\" style=\"pointer-events: inherit;\"\n              [attr.stroke-dasharray]=\"item.options.dasharray\" [attr.stroke-dashoffset]=\"1\"\n              [attr.stroke-width]=\"item.options.strokeWidth\" [attr.stroke-linecap]=\"item.options.lineCap\"\n              [attr.stroke-linejoin]=\"item.options.lineJoin\" [attr.stroke]=\"item.options.strokeColor\"\n              [attr.fill]=\"item.options.fill\"></ellipse>\n          </g>\n          <g *ngSwitchCase=\"types.TEXT\">\n            <text class=\"text_element\" text-anchor=\"start\" xml:space=\"preserve\" [attr.x]=\"item.options.left\"\n              [attr.y]=\"item.options.top\" [attr.width]=\"item.options.width\" [attr.height]=\"item.options.height\"\n              style=\"pointer-events: inherit;\" [attr.font-size]=\"item.options.fontSize\"\n              [attr.font-family]=\"item.options.fontFamily\" [attr.stroke-dasharray]=\"item.options.dasharray\"\n              [attr.stroke-dashoffset]=\"1\" [attr.stroke-width]=\"item.options.strokeWidth\"\n              [attr.stroke-linecap]=\"item.options.lineCap\" [attr.stroke-linejoin]=\"item.options.lineJoin\"\n              [attr.stroke]=\"item.options.strokeColor\" [attr.fill]=\"item.options.fill\"\n              [attr.font-style]=\"item.options.fontStyle\" [attr.font-weight]=\"item.options.fontWeight\">\n              {{ item.value }}\n            </text>\n          </g>\n          <g *ngSwitchDefault>\n            <text>Not defined type</text>\n          </g>\n        </g>\n      </ng-container>\n      <g class=\"temp-element\" *ngIf=\"tempElement\"  [ngSwitch]=\"selectedTool\">\n      <g *ngSwitchCase=\"tools.BRUSH\">\n        <path class=\"brush\" fill=\"none\" [attr.d]=\"tempElement.value\" [attr.stroke-dasharray]=\"tempElement.options.dasharray\"\n          [attr.stroke-dashoffset]=\"1\" [attr.stroke-width]=\"tempElement.options.strokeWidth\"\n          [attr.stroke-linecap]=\"tempElement.options.lineCap\" [attr.stroke-linejoin]=\"tempElement.options.lineJoin\"\n          [attr.stroke]=\"tempElement.options.strokeColor\"></path>\n      </g>\n      <g *ngSwitchCase=\"types.IMAGE\">\n        <image [attr.height]=\"tempElement.options.height\" [attr.width]=\"tempElement.options.width\" preserveAspectRatio=\"none\"\n          [attr.xlink:href]=\"tempElement.value\" [attr.href]=\"tempElement.value\" [attr.stroke-width]=\"tempElement.options.strokeWidth\"\n          [attr.stroke-dasharray]=\"tempElement.options.dasharray\" [attr.fill]=\"tempElement.options.fill\"\n          [attr.stroke]=\"tempElement.options.strokeColor\" style=\"pointer-events: inherit;\"></image>\n      </g>\n      <g *ngSwitchCase=\"types.LINE\">\n        <line class=\"line\" [attr.x1]=\"tempElement.options.x1\" [attr.y1]=\"tempElement.options.y1\" [attr.x2]=\"tempElement.options.x2\"\n          [attr.y2]=\"tempElement.options.y2\" style=\"pointer-events: inherit;\"\n          [attr.stroke-dasharray]=\"tempElement.options.dasharray\" [attr.stroke-dashoffset]=\"1\"\n          [attr.stroke-width]=\"tempElement.options.strokeWidth\" [attr.stroke-linecap]=\"tempElement.options.lineCap\"\n          [attr.stroke-linejoin]=\"tempElement.options.lineJoin\" [attr.stroke]=\"tempElement.options.strokeColor\"></line>\n      </g>\n      <g *ngSwitchCase=\"types.RECT\">\n        <rect class=\"rect\" [attr.x]=\"tempElement.options.x2\" [attr.y]=\"tempElement.options.y2\" [attr.rx]=\"tempElement.options.rx\"\n          [attr.width]=\"tempElement.options.width\" [attr.height]=\"tempElement.options.height\"\n          [attr.stroke-dasharray]=\"tempElement.options.dasharray\" [attr.stroke-dashoffset]=\"tempElement.options.dashoffset\"\n          [attr.stroke-width]=\"tempElement.options.strokeWidth\" [attr.fill]=\"tempElement.options.fill\"\n          [attr.stroke]=\"tempElement.options.strokeColor\"></rect>\n      </g>\n      <g *ngSwitchCase=\"types.ELLIPSE\">\n        <ellipse [attr.cx]=\"tempElement.options.cx\" [attr.cy]=\"tempElement.options.cy\" [attr.rx]=\"tempElement.options.rx\"\n          [attr.ry]=\"tempElement.options.ry\" style=\"pointer-events: inherit;\"\n          [attr.stroke-dasharray]=\"tempElement.options.dasharray\" [attr.stroke-dashoffset]=\"1\"\n          [attr.stroke-width]=\"tempElement.options.strokeWidth\" [attr.stroke-linecap]=\"tempElement.options.lineCap\"\n          [attr.stroke-linejoin]=\"tempElement.options.lineJoin\" [attr.stroke]=\"tempElement.options.strokeColor\"\n          [attr.fill]=\"tempElement.options.fill\"></ellipse>\n      </g>\n      <g *ngSwitchCase=\"types.TEXT\">\n        <text class=\"text_element\" text-anchor=\"start\" xml:space=\"preserve\" [attr.x]=\"tempElement.options.left\"\n          [attr.y]=\"tempElement.options.top\" [attr.width]=\"tempElement.options.width\" [attr.height]=\"tempElement.options.height\"\n          style=\"pointer-events: inherit;\" [attr.font-size]=\"tempElement.options.fontSize\"\n          [attr.font-family]=\"tempElement.options.fontFamily\" [attr.stroke-dasharray]=\"tempElement.options.dasharray\"\n          [attr.stroke-dashoffset]=\"1\" [attr.stroke-width]=\"tempElement.options.strokeWidth\"\n          [attr.stroke-linecap]=\"tempElement.options.lineCap\" [attr.stroke-linejoin]=\"tempElement.options.lineJoin\"\n          [attr.stroke]=\"tempElement.options.strokeColor\" [attr.fill]=\"tempElement.options.fill\"\n          [attr.font-style]=\"tempElement.options.fontStyle\" [attr.font-weight]=\"tempElement.options.fontWeight\">\n          {{ tempElement.value }}\n        </text>\n      </g>\n      <g *ngSwitchDefault>\n        <text>Not defined type</text>\n      </g>\n    </g>\n      <g id=\"selectorParentGroup\" *ngIf=\"selectedElement\">\n        <g class=\"selectorGroup\" id=\"selectorGroup\" transform=\"\" [style.display]=\"rubberBox.display\"\n          [attr.transform]=\"'translate(' + selectedElement.x + ',' + selectedElement.y + ')' + 'rotate(' + selectedElement.rotation + ')'\">\n          <g display=\"inline\">\n            <rect id=\"selectedBox\" fill=\"none\" stroke=\"#4F80FF\" shape-rendering=\"crispEdges\"\n              style=\"pointer-events: none;\" [attr.x]=\"rubberBox.x\" [attr.y]=\"rubberBox.y\" [attr.width]=\"rubberBox.width\"\n              [attr.height]=\"rubberBox.height\" style=\"cursor: move;\" (pointerdown)=\"moveSelect($event)\">\n            </rect>\n          </g>\n          <g display=\"inline\">\n            <circle class=\"selector_rotate\" id=\"selectorGrip_rotate_nw\" fill=\"#000\" r=\"8\" stroke=\"#000\" fill-opacity=\"0\"\n              stroke-opacity=\"0\" stroke-width=\"0\" [attr.cx]=\"rubberBox.x - 4\" [attr.cy]=\"rubberBox.y - 4\"></circle>\n            <circle class=\"selector_rotate\" id=\"selectorGrip_rotate_ne\" fill=\"#000\" r=\"8\" stroke=\"#000\" fill-opacity=\"0\"\n              stroke-opacity=\"0\" stroke-width=\"0\" [attr.cx]=\"rubberBox.x + rubberBox.width + 4\"\n              [attr.cy]=\"rubberBox.y - 4\">\n            </circle>\n            <circle class=\"selector_rotate\" id=\"selectorGrip_rotate_se\" fill=\"#000\" r=\"8\" stroke=\"#000\" fill-opacity=\"0\"\n              stroke-opacity=\"0\" stroke-width=\"0\" [attr.cx]=\"rubberBox.x + rubberBox.width + 4\"\n              [attr.cy]=\"rubberBox.y + rubberBox.height + 4\"></circle>\n            <circle class=\"selector_rotate\" id=\"selectorGrip_rotate_sw\" fill=\"#000\" r=\"8\" stroke=\"#000\" fill-opacity=\"0\"\n              stroke-opacity=\"0\" stroke-width=\"0\" [attr.cx]=\"rubberBox.x - 4\"\n              [attr.cy]=\"rubberBox.y + rubberBox.height + 4\">\n            </circle>\n            <rect id=\"selectorGrip_resize_nw\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: nw-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x - 4\" [attr.y]=\"rubberBox.y - 4\"\n              (pointerdown)=\"resizeSelect($event)\">\n            </rect>\n            <rect id=\"selectorGrip_resize_n\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: n-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width / 2 - 4\"\n              [attr.y]=\"rubberBox.y - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_ne\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: ne-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width - 4\"\n              [attr.y]=\"rubberBox.y - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_e\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: e-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height / 2 - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_se\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: se-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_s\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: s-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width / 2 - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_sw\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: sw-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_w\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: w-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height / 2 - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n          </g>\n        </g>\n      </g>\n    </g>\n  </svg>\n</svg>\n\n<div [style]=\"'font-family:' + fontFamily + ';' + 'font-size:' + fontSize + 'px;'+\n'pointer-events: none; width: ' + canvasWidth * zoom + 'px; '+\n  'height: ' + canvasHeight * zoom + 'px;' +\n  'position: absolute; top: ' + y + 'px; left: ' + x + 'px;'\" *ngIf=\"tempElement && selectedTool === tools.TEXT\">\n  <input #textInput type=\"text\" class=\"text-input\" [style]=\"'width: ' + textInput.value.length + 'ch; '+\n    'height: ' + (2 * zoom) + 'ch;'+\n    'top: ' + ((tempElement.options.top || 0 - 10) * zoom) + 'px;' +\n    'left: ' + ((tempElement.options.left || 0 + 3)* zoom) + 'px;'\n    \" (input)=\"updateTextItem(textInput.value)\" autofocus />\n</div>", styles: [":host{width:inherit;height:inherit;min-width:inherit;min-height:inherit;max-width:inherit;max-height:inherit}:host .svgroot{-webkit-user-select:none;user-select:none;width:inherit;height:inherit;min-width:inherit;min-height:inherit;max-width:inherit;max-height:inherit;background-size:cover;background-position:50%;background-repeat:no-repeat}:host .svgroot .wb_element,:host .svgroot .selectorGroup{transform-box:fill-box;transform-origin:center}:host .svgroot .text{font-family:Arial,Helvetica,sans-serif}:host .svgroot.drawing{cursor:url(\"data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 height%3D%2220%22 width%3D%2220%22%3E  %3Ccircle cx%3D%225%22 cy%3D%225%22 r%3D%225%22 style%3D%22fill%3A none%3B stroke%3A %235a5a5a%3B stroke-width%3A .02em%3B%22 %2F%3E%3C%2Fsvg%3E\") 5 5,crosshair}:host .svgroot .handlers{display:none}:host .svgroot .onMove{cursor:move}:host .svgroot .onMove .handlers{display:block}:host .HAND{cursor:grabbing}:host .SELECT{cursor:default}:host .BRUSH{cursor:url(\"data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2224%22 height%3D%2224%22%3E%3Cpath fill%3D%22%23333%22 stroke-width%3D%221%22 stroke%3D%22%23ccc%22 d%3D%22m16.318 6.11l-3.536-3.535l1.415-1.414c.63-.63 2.073-.755 2.828 0l.707.707c.755.755.631 2.198 0 2.829L16.318 6.11zm-1.414 1.415l-9.9 9.9l-4.596 1.06l1.06-4.596l9.9-9.9l3.536 3.536z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E\") 1 18,crosshair}:host .IMAGE{cursor:copy}:host .LINE{cursor:crosshair}:host .RECT{cursor:crosshair}:host .ELLIPSE{cursor:crosshair}:host .TEXT{cursor:text}:host .ERASER{cursor:url(\"data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2224%22 height%3D%2224%22%3E    %3Cpath fill%3D%22%23333%22 stroke-width%3D%221%22 stroke%3D%22%23ccc%22 d%3D%22M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293l4.633-4.633a1 1 0 0 0 0-1.414l-3.879-3.879zM8.746 13.547L3.453 8.254L1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E\") 0 12,crosshair}.foreign{text-align:left}.insideforeign{display:inline-block}.text-input{position:absolute;background:transparent;border:1px dashed #0b89f0;outline:none;height:25px;font-size:inherit;font-family:inherit;min-width:5ch;height:2ch;padding:5px 0;pointer-events:auto;z-index:5}\n"], dependencies: [{ kind: "directive", type: i2.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: i2.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: i2.NgSwitch, selector: "[ngSwitch]", inputs: ["ngSwitch"] }, { kind: "directive", type: i2.NgSwitchCase, selector: "[ngSwitchCase]", inputs: ["ngSwitchCase"] }, { kind: "directive", type: i2.NgSwitchDefault, selector: "[ngSwitchDefault]" }] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.7", ngImport: i0, type: NgWhiteboardComponent, decorators: [{
            type: Component,
            args: [{ selector: 'ng-whiteboard', template: "<svg [class]=\"'svgroot ' + selectedTool\" #svgContainer id=\"svgroot\" xlinkns=\"http://www.w3.org/1999/xlink\">\n  <svg id=\"canvasBackground\" [attr.width]=\"canvasWidth * zoom\" [attr.height]=\"canvasHeight * zoom\" [attr.x]=\"x\"\n    [attr.y]=\"y\" style=\"pointer-events: none;\">\n    <defs id=\"grid-pattern\">\n      <pattern id=\"smallGrid\" [attr.width]=\"gridSize\" [attr.height]=\"gridSize\" patternUnits=\"userSpaceOnUse\">\n        <path [attr.d]=\"'M '+gridSize+' 0 H 0 V '+gridSize+''\" fill=\"none\" stroke=\"gray\" stroke-width=\"0.5\" />\n      </pattern>\n      <pattern id=\"grid\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\">\n        <rect width=\"100\" height=\"100\" fill=\"url(#smallGrid)\" />\n        <path d=\"M 100 0 H 0 V 100\" fill=\"none\" stroke=\"gray\" stroke-width=\"2\" />\n      </pattern>\n    </defs>\n    <defs id=\"placeholder_defs\"></defs>\n    <rect width=\"100%\" height=\"100%\" x=\"0\" y=\"0\" stroke-width=\"0\" stroke=\"transparent\" [attr.fill]=\"backgroundColor\"\n      style=\"pointer-events: none;\"></rect>\n    <g *ngIf=\"enableGrid\">\n      <rect x=\"-100\" y=\"-100\" [attr.width]=\"(canvasWidth * zoom) + 100*2\" [attr.height]=\"(canvasHeight * zoom) + 100*2\"\n        fill=\"url(#grid)\" />\n    </g>\n  </svg>\n  <svg xmlns=\"http://www.w3.org/2000/svg\" [attr.width]=\"canvasWidth * zoom\" [attr.height]=\"canvasHeight * zoom\"\n    [attr.viewBox]=\"[0, 0, canvasWidth, canvasHeight]\" id=\"svgcontent\" [attr.x]=\"x\" [attr.y]=\"y\">\n    <rect id=\"contentBackground\" opacity=\"0\" width=\"100%\" height=\"100%\" x=\"0\" y=\"0\" stroke-width=\"0\"\n      stroke=\"transparent\" [attr.fill]=\"backgroundColor\"></rect>\n    <g style=\"pointer-events: all;\">\n      <title style=\"pointer-events: inherit;\">Whiteboard</title>\n      <ng-container *ngFor=\"let item of data\">\n        <g class=\"wb_element\" [id]=\"'item_' + item.id\" [attr.data-wb-id]=\"item.id\" [ngSwitch]=\"item.type\"\n          [attr.transform]=\"'translate(' + item.x + ',' + item.y + ')' + 'rotate(' + item.rotation + ')'\"\n          [attr.opacity]=\"item.opacity / 100\">\n          <g *ngSwitchCase=\"types.BRUSH\">\n            <path class=\"brush\" fill=\"none\" [attr.d]=\"item.value\" [attr.stroke-dasharray]=\"item.options.dasharray\"\n              [attr.stroke-dashoffset]=\"1\" [attr.stroke-width]=\"item.options.strokeWidth\"\n              [attr.stroke-linecap]=\"item.options.lineCap\" [attr.stroke-linejoin]=\"item.options.lineJoin\"\n              [attr.stroke]=\"item.options.strokeColor\"></path>\n          </g>\n          <g *ngSwitchCase=\"types.IMAGE\">\n            <image [attr.height]=\"item.options.height\" [attr.width]=\"item.options.width\" preserveAspectRatio=\"none\"\n              [attr.xlink:href]=\"item.value\" [attr.href]=\"item.value\" [attr.stroke-width]=\"item.options.strokeWidth\"\n              [attr.stroke-dasharray]=\"item.options.dasharray\" [attr.fill]=\"item.options.fill\"\n              [attr.stroke]=\"item.options.strokeColor\" style=\"pointer-events: inherit;\"></image>\n          </g>\n          <g *ngSwitchCase=\"types.LINE\">\n            <line class=\"line\" [attr.x1]=\"item.options.x1\" [attr.y1]=\"item.options.y1\" [attr.x2]=\"item.options.x2\"\n              [attr.y2]=\"item.options.y2\" style=\"pointer-events: inherit;\"\n              [attr.stroke-dasharray]=\"item.options.dasharray\" [attr.stroke-dashoffset]=\"1\"\n              [attr.stroke-width]=\"item.options.strokeWidth\" [attr.stroke-linecap]=\"item.options.lineCap\"\n              [attr.stroke-linejoin]=\"item.options.lineJoin\" [attr.stroke]=\"item.options.strokeColor\"></line>\n          </g>\n          <g *ngSwitchCase=\"types.RECT\">\n            <rect class=\"rect\" [attr.x]=\"item.options.x2\" [attr.y]=\"item.options.y2\" [attr.rx]=\"item.options.rx\"\n              [attr.width]=\"item.options.width\" [attr.height]=\"item.options.height\"\n              [attr.stroke-dasharray]=\"item.options.dasharray\" [attr.stroke-dashoffset]=\"item.options.dashoffset\"\n              [attr.stroke-width]=\"item.options.strokeWidth\" [attr.fill]=\"item.options.fill\"\n              [attr.stroke]=\"item.options.strokeColor\"></rect>\n          </g>\n          <g *ngSwitchCase=\"types.ELLIPSE\">\n            <ellipse [attr.cx]=\"item.options.cx\" [attr.cy]=\"item.options.cy\" [attr.rx]=\"item.options.rx\"\n              [attr.ry]=\"item.options.ry\" style=\"pointer-events: inherit;\"\n              [attr.stroke-dasharray]=\"item.options.dasharray\" [attr.stroke-dashoffset]=\"1\"\n              [attr.stroke-width]=\"item.options.strokeWidth\" [attr.stroke-linecap]=\"item.options.lineCap\"\n              [attr.stroke-linejoin]=\"item.options.lineJoin\" [attr.stroke]=\"item.options.strokeColor\"\n              [attr.fill]=\"item.options.fill\"></ellipse>\n          </g>\n          <g *ngSwitchCase=\"types.TEXT\">\n            <text class=\"text_element\" text-anchor=\"start\" xml:space=\"preserve\" [attr.x]=\"item.options.left\"\n              [attr.y]=\"item.options.top\" [attr.width]=\"item.options.width\" [attr.height]=\"item.options.height\"\n              style=\"pointer-events: inherit;\" [attr.font-size]=\"item.options.fontSize\"\n              [attr.font-family]=\"item.options.fontFamily\" [attr.stroke-dasharray]=\"item.options.dasharray\"\n              [attr.stroke-dashoffset]=\"1\" [attr.stroke-width]=\"item.options.strokeWidth\"\n              [attr.stroke-linecap]=\"item.options.lineCap\" [attr.stroke-linejoin]=\"item.options.lineJoin\"\n              [attr.stroke]=\"item.options.strokeColor\" [attr.fill]=\"item.options.fill\"\n              [attr.font-style]=\"item.options.fontStyle\" [attr.font-weight]=\"item.options.fontWeight\">\n              {{ item.value }}\n            </text>\n          </g>\n          <g *ngSwitchDefault>\n            <text>Not defined type</text>\n          </g>\n        </g>\n      </ng-container>\n      <g class=\"temp-element\" *ngIf=\"tempElement\"  [ngSwitch]=\"selectedTool\">\n      <g *ngSwitchCase=\"tools.BRUSH\">\n        <path class=\"brush\" fill=\"none\" [attr.d]=\"tempElement.value\" [attr.stroke-dasharray]=\"tempElement.options.dasharray\"\n          [attr.stroke-dashoffset]=\"1\" [attr.stroke-width]=\"tempElement.options.strokeWidth\"\n          [attr.stroke-linecap]=\"tempElement.options.lineCap\" [attr.stroke-linejoin]=\"tempElement.options.lineJoin\"\n          [attr.stroke]=\"tempElement.options.strokeColor\"></path>\n      </g>\n      <g *ngSwitchCase=\"types.IMAGE\">\n        <image [attr.height]=\"tempElement.options.height\" [attr.width]=\"tempElement.options.width\" preserveAspectRatio=\"none\"\n          [attr.xlink:href]=\"tempElement.value\" [attr.href]=\"tempElement.value\" [attr.stroke-width]=\"tempElement.options.strokeWidth\"\n          [attr.stroke-dasharray]=\"tempElement.options.dasharray\" [attr.fill]=\"tempElement.options.fill\"\n          [attr.stroke]=\"tempElement.options.strokeColor\" style=\"pointer-events: inherit;\"></image>\n      </g>\n      <g *ngSwitchCase=\"types.LINE\">\n        <line class=\"line\" [attr.x1]=\"tempElement.options.x1\" [attr.y1]=\"tempElement.options.y1\" [attr.x2]=\"tempElement.options.x2\"\n          [attr.y2]=\"tempElement.options.y2\" style=\"pointer-events: inherit;\"\n          [attr.stroke-dasharray]=\"tempElement.options.dasharray\" [attr.stroke-dashoffset]=\"1\"\n          [attr.stroke-width]=\"tempElement.options.strokeWidth\" [attr.stroke-linecap]=\"tempElement.options.lineCap\"\n          [attr.stroke-linejoin]=\"tempElement.options.lineJoin\" [attr.stroke]=\"tempElement.options.strokeColor\"></line>\n      </g>\n      <g *ngSwitchCase=\"types.RECT\">\n        <rect class=\"rect\" [attr.x]=\"tempElement.options.x2\" [attr.y]=\"tempElement.options.y2\" [attr.rx]=\"tempElement.options.rx\"\n          [attr.width]=\"tempElement.options.width\" [attr.height]=\"tempElement.options.height\"\n          [attr.stroke-dasharray]=\"tempElement.options.dasharray\" [attr.stroke-dashoffset]=\"tempElement.options.dashoffset\"\n          [attr.stroke-width]=\"tempElement.options.strokeWidth\" [attr.fill]=\"tempElement.options.fill\"\n          [attr.stroke]=\"tempElement.options.strokeColor\"></rect>\n      </g>\n      <g *ngSwitchCase=\"types.ELLIPSE\">\n        <ellipse [attr.cx]=\"tempElement.options.cx\" [attr.cy]=\"tempElement.options.cy\" [attr.rx]=\"tempElement.options.rx\"\n          [attr.ry]=\"tempElement.options.ry\" style=\"pointer-events: inherit;\"\n          [attr.stroke-dasharray]=\"tempElement.options.dasharray\" [attr.stroke-dashoffset]=\"1\"\n          [attr.stroke-width]=\"tempElement.options.strokeWidth\" [attr.stroke-linecap]=\"tempElement.options.lineCap\"\n          [attr.stroke-linejoin]=\"tempElement.options.lineJoin\" [attr.stroke]=\"tempElement.options.strokeColor\"\n          [attr.fill]=\"tempElement.options.fill\"></ellipse>\n      </g>\n      <g *ngSwitchCase=\"types.TEXT\">\n        <text class=\"text_element\" text-anchor=\"start\" xml:space=\"preserve\" [attr.x]=\"tempElement.options.left\"\n          [attr.y]=\"tempElement.options.top\" [attr.width]=\"tempElement.options.width\" [attr.height]=\"tempElement.options.height\"\n          style=\"pointer-events: inherit;\" [attr.font-size]=\"tempElement.options.fontSize\"\n          [attr.font-family]=\"tempElement.options.fontFamily\" [attr.stroke-dasharray]=\"tempElement.options.dasharray\"\n          [attr.stroke-dashoffset]=\"1\" [attr.stroke-width]=\"tempElement.options.strokeWidth\"\n          [attr.stroke-linecap]=\"tempElement.options.lineCap\" [attr.stroke-linejoin]=\"tempElement.options.lineJoin\"\n          [attr.stroke]=\"tempElement.options.strokeColor\" [attr.fill]=\"tempElement.options.fill\"\n          [attr.font-style]=\"tempElement.options.fontStyle\" [attr.font-weight]=\"tempElement.options.fontWeight\">\n          {{ tempElement.value }}\n        </text>\n      </g>\n      <g *ngSwitchDefault>\n        <text>Not defined type</text>\n      </g>\n    </g>\n      <g id=\"selectorParentGroup\" *ngIf=\"selectedElement\">\n        <g class=\"selectorGroup\" id=\"selectorGroup\" transform=\"\" [style.display]=\"rubberBox.display\"\n          [attr.transform]=\"'translate(' + selectedElement.x + ',' + selectedElement.y + ')' + 'rotate(' + selectedElement.rotation + ')'\">\n          <g display=\"inline\">\n            <rect id=\"selectedBox\" fill=\"none\" stroke=\"#4F80FF\" shape-rendering=\"crispEdges\"\n              style=\"pointer-events: none;\" [attr.x]=\"rubberBox.x\" [attr.y]=\"rubberBox.y\" [attr.width]=\"rubberBox.width\"\n              [attr.height]=\"rubberBox.height\" style=\"cursor: move;\" (pointerdown)=\"moveSelect($event)\">\n            </rect>\n          </g>\n          <g display=\"inline\">\n            <circle class=\"selector_rotate\" id=\"selectorGrip_rotate_nw\" fill=\"#000\" r=\"8\" stroke=\"#000\" fill-opacity=\"0\"\n              stroke-opacity=\"0\" stroke-width=\"0\" [attr.cx]=\"rubberBox.x - 4\" [attr.cy]=\"rubberBox.y - 4\"></circle>\n            <circle class=\"selector_rotate\" id=\"selectorGrip_rotate_ne\" fill=\"#000\" r=\"8\" stroke=\"#000\" fill-opacity=\"0\"\n              stroke-opacity=\"0\" stroke-width=\"0\" [attr.cx]=\"rubberBox.x + rubberBox.width + 4\"\n              [attr.cy]=\"rubberBox.y - 4\">\n            </circle>\n            <circle class=\"selector_rotate\" id=\"selectorGrip_rotate_se\" fill=\"#000\" r=\"8\" stroke=\"#000\" fill-opacity=\"0\"\n              stroke-opacity=\"0\" stroke-width=\"0\" [attr.cx]=\"rubberBox.x + rubberBox.width + 4\"\n              [attr.cy]=\"rubberBox.y + rubberBox.height + 4\"></circle>\n            <circle class=\"selector_rotate\" id=\"selectorGrip_rotate_sw\" fill=\"#000\" r=\"8\" stroke=\"#000\" fill-opacity=\"0\"\n              stroke-opacity=\"0\" stroke-width=\"0\" [attr.cx]=\"rubberBox.x - 4\"\n              [attr.cy]=\"rubberBox.y + rubberBox.height + 4\">\n            </circle>\n            <rect id=\"selectorGrip_resize_nw\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: nw-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x - 4\" [attr.y]=\"rubberBox.y - 4\"\n              (pointerdown)=\"resizeSelect($event)\">\n            </rect>\n            <rect id=\"selectorGrip_resize_n\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: n-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width / 2 - 4\"\n              [attr.y]=\"rubberBox.y - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_ne\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: ne-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width - 4\"\n              [attr.y]=\"rubberBox.y - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_e\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: e-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height / 2 - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_se\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: se-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_s\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: s-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x + rubberBox.width / 2 - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_sw\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: sw-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n            <rect id=\"selectorGrip_resize_w\" width=\"8\" height=\"8\" fill=\"#4F80FF\" stroke=\"rgba(0,0,0,0)\"\n              style=\"cursor: w-resize;\" pointer-events=\"all\" [attr.x]=\"rubberBox.x - 4\"\n              [attr.y]=\"rubberBox.y + rubberBox.height / 2 - 4\" (pointerdown)=\"resizeSelect($event)\"></rect>\n          </g>\n        </g>\n      </g>\n    </g>\n  </svg>\n</svg>\n\n<div [style]=\"'font-family:' + fontFamily + ';' + 'font-size:' + fontSize + 'px;'+\n'pointer-events: none; width: ' + canvasWidth * zoom + 'px; '+\n  'height: ' + canvasHeight * zoom + 'px;' +\n  'position: absolute; top: ' + y + 'px; left: ' + x + 'px;'\" *ngIf=\"tempElement && selectedTool === tools.TEXT\">\n  <input #textInput type=\"text\" class=\"text-input\" [style]=\"'width: ' + textInput.value.length + 'ch; '+\n    'height: ' + (2 * zoom) + 'ch;'+\n    'top: ' + ((tempElement.options.top || 0 - 10) * zoom) + 'px;' +\n    'left: ' + ((tempElement.options.left || 0 + 3)* zoom) + 'px;'\n    \" (input)=\"updateTextItem(textInput.value)\" autofocus />\n</div>", styles: [":host{width:inherit;height:inherit;min-width:inherit;min-height:inherit;max-width:inherit;max-height:inherit}:host .svgroot{-webkit-user-select:none;user-select:none;width:inherit;height:inherit;min-width:inherit;min-height:inherit;max-width:inherit;max-height:inherit;background-size:cover;background-position:50%;background-repeat:no-repeat}:host .svgroot .wb_element,:host .svgroot .selectorGroup{transform-box:fill-box;transform-origin:center}:host .svgroot .text{font-family:Arial,Helvetica,sans-serif}:host .svgroot.drawing{cursor:url(\"data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 height%3D%2220%22 width%3D%2220%22%3E  %3Ccircle cx%3D%225%22 cy%3D%225%22 r%3D%225%22 style%3D%22fill%3A none%3B stroke%3A %235a5a5a%3B stroke-width%3A .02em%3B%22 %2F%3E%3C%2Fsvg%3E\") 5 5,crosshair}:host .svgroot .handlers{display:none}:host .svgroot .onMove{cursor:move}:host .svgroot .onMove .handlers{display:block}:host .HAND{cursor:grabbing}:host .SELECT{cursor:default}:host .BRUSH{cursor:url(\"data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2224%22 height%3D%2224%22%3E%3Cpath fill%3D%22%23333%22 stroke-width%3D%221%22 stroke%3D%22%23ccc%22 d%3D%22m16.318 6.11l-3.536-3.535l1.415-1.414c.63-.63 2.073-.755 2.828 0l.707.707c.755.755.631 2.198 0 2.829L16.318 6.11zm-1.414 1.415l-9.9 9.9l-4.596 1.06l1.06-4.596l9.9-9.9l3.536 3.536z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E\") 1 18,crosshair}:host .IMAGE{cursor:copy}:host .LINE{cursor:crosshair}:host .RECT{cursor:crosshair}:host .ELLIPSE{cursor:crosshair}:host .TEXT{cursor:text}:host .ERASER{cursor:url(\"data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2224%22 height%3D%2224%22%3E    %3Cpath fill%3D%22%23333%22 stroke-width%3D%221%22 stroke%3D%22%23ccc%22 d%3D%22M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293l4.633-4.633a1 1 0 0 0 0-1.414l-3.879-3.879zM8.746 13.547L3.453 8.254L1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E\") 0 12,crosshair}.foreign{text-align:left}.insideforeign{display:inline-block}.text-input{position:absolute;background:transparent;border:1px dashed #0b89f0;outline:none;height:25px;font-size:inherit;font-family:inherit;min-width:5ch;height:2ch;padding:5px 0;pointer-events:auto;z-index:5}\n"] }]
        }], ctorParameters: function () { return [{ type: i1.NgWhiteboardService }]; }, propDecorators: { svgContainer: [{
                type: ViewChild,
                args: ['svgContainer', { static: false }]
            }], textInput: [{
                type: ViewChild,
                args: ['textInput', { static: false }]
            }], data: [{
                type: Input
            }], options: [{
                type: Input
            }], selectedTool: [{
                type: Input
            }], drawingEnabled: [{
                type: Input
            }], canvasWidth: [{
                type: Input
            }], canvasHeight: [{
                type: Input
            }], fullScreen: [{
                type: Input
            }], center: [{
                type: Input
            }], strokeColor: [{
                type: Input
            }], strokeWidth: [{
                type: Input
            }], backgroundColor: [{
                type: Input
            }], lineJoin: [{
                type: Input
            }], lineCap: [{
                type: Input
            }], fill: [{
                type: Input
            }], zoom: [{
                type: Input
            }], fontFamily: [{
                type: Input
            }], fontSize: [{
                type: Input
            }], dasharray: [{
                type: Input
            }], dashoffset: [{
                type: Input
            }], x: [{
                type: Input
            }], y: [{
                type: Input
            }], enableGrid: [{
                type: Input
            }], gridSize: [{
                type: Input
            }], snapToGrid: [{
                type: Input
            }], persistenceId: [{
                type: Input
            }], ready: [{
                type: Output
            }], dataChange: [{
                type: Output
            }], clear: [{
                type: Output
            }], undo: [{
                type: Output
            }], redo: [{
                type: Output
            }], save: [{
                type: Output
            }], imageAdded: [{
                type: Output
            }], selectElement: [{
                type: Output
            }], deleteElement: [{
                type: Output
            }], toolChanged: [{
                type: Output
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctd2hpdGVib2FyZC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFpQixTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBYSxNQUFNLEVBQUUsWUFBWSxFQUFvQyxNQUFNLGVBQWUsQ0FBQztBQUMxSixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQWdCLFNBQVMsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUEwQixXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSxVQUFVLENBQUM7QUFDM0osT0FBTyxFQUFvQixVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFhLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQzs7OztBQUkvRixNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7QUFNeEMsTUFBTSxPQUFPLHFCQUFxQjtJQXNGaEMsWUFBb0IsaUJBQXNDO1FBQXRDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUI7UUFqRmxELFVBQUssR0FBeUMsSUFBSSxlQUFlLENBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBdUIxRixtQkFBYyxHQUFHLElBQUksQ0FBQztRQUN0QixnQkFBVyxHQUFHLEdBQUcsQ0FBQztRQUNsQixpQkFBWSxHQUFHLEdBQUcsQ0FB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QUFuQixLQUFLO2dCQUNHLFlBQVk7c0JBQXBCLEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxNQUFNO3NCQUFkLEtBQUs7Z0JBQ0csV0FBVztzQkFBbkIsS0FBSztnQkFDRyxXQUFXO3NCQUFuQixLQUFLO2dCQUNHLGVBQWU7c0JBQXZCLEtBQUs7Z0JBQ0csUUFBUTtzQkFBaEIsS0FBSztnQkFDRyxPQUFPO3NCQUFmLEtBQUs7Z0JBQ0csSUFBSTtzQkFBWixLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUNHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUNHLENBQUM7c0JBQVQsS0FBSztnQkFDRyxDQUFDO3NCQUFULEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBQ0csYUFBYTtzQkFBckIsS0FBSztnQkFFSSxLQUFLO3NCQUFkLE1BQU07Z0JBQ0csVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyxLQUFLO3NCQUFkLE1BQU07Z0JBQ0csSUFBSTtzQkFBYixNQUFNO2dCQUNHLElBQUk7c0JBQWIsTUFBTTtnQkFDRyxJQUFJO3NCQUFiLE1BQU07Z0JBQ0csVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyxhQUFhO3NCQUF0QixNQUFNO2dCQUNHLGFBQWE7c0JBQXRCLE1BQU07Z0JBQ0csV0FBVztzQkFBcEIsTUFBTSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgQWZ0ZXJWaWV3SW5pdCwgVmlld0NoaWxkLCBJbnB1dCwgRWxlbWVudFJlZiwgT25EZXN0cm95LCBPdXRwdXQsIEV2ZW50RW1pdHRlciwgT25DaGFuZ2VzLCBPbkluaXQsIFNpbXBsZUNoYW5nZXMgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IE5nV2hpdGVib2FyZFNlcnZpY2UgfSBmcm9tICcuL25nLXdoaXRlYm9hcmQuc2VydmljZSc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIGZyb21FdmVudCwgc2tpcCwgQmVoYXZpb3JTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBFbGVtZW50VHlwZUVudW0sIEZvcm1hdFR5cGUsIGZvcm1hdFR5cGVzLCBJQWRkSW1hZ2UsIExpbmVDYXBFbnVtLCBMaW5lSm9pbkVudW0sIFRvb2xzRW51bSwgV2hpdGVib2FyZEVsZW1lbnQsIFdoaXRlYm9hcmRPcHRpb25zIH0gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHsgQ29udGFpbmVyRWxlbWVudCwgY3VydmVCYXNpcywgZHJhZywgbGluZSwgbW91c2UsIHNlbGVjdCwgU2VsZWN0aW9uLCBldmVudCB9IGZyb20gJ2QzJztcblxudHlwZSBCQm94ID0geyB4OiBudW1iZXI7IHk6IG51bWJlcjsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfTtcblxuY29uc3QgZDNMaW5lID0gbGluZSgpLmN1cnZlKGN1cnZlQmFzaXMpO1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnbmctd2hpdGVib2FyZCcsXG4gIHRlbXBsYXRlVXJsOiAnLi9uZy13aGl0ZWJvYXJkLmNvbXBvbmVudC5odG1sJyxcbiAgc3R5bGVVcmxzOiBbJy4vbmctd2hpdGVib2FyZC5jb21wb25lbnQuc2NzcyddLFxufSlcbmV4cG9ydCBjbGFzcyBOZ1doaXRlYm9hcmRDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uQ2hhbmdlcywgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95IHtcbiAgQFZpZXdDaGlsZCgnc3ZnQ29udGFpbmVyJywgeyBzdGF0aWM6IGZhbHNlIH0pXG4gIHN2Z0NvbnRhaW5lciE6IEVsZW1lbnRSZWY8Q29udGFpbmVyRWxlbWVudD47XG4gIEBWaWV3Q2hpbGQoJ3RleHRJbnB1dCcsIHsgc3RhdGljOiBmYWxzZSB9KSBwcml2YXRlIHRleHRJbnB1dCE6IEVsZW1lbnRSZWY8SFRNTElucHV0RWxlbWVudD47XG5cbiAgcHJpdmF0ZSBfZGF0YTogQmVoYXZpb3JTdWJqZWN0PFdoaXRlYm9hcmRFbGVtZW50W10+ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxXaGl0ZWJvYXJkRWxlbWVudFtdPihbXSk7XG5cbiAgQElucHV0KCkgc2V0IGRhdGEoZGF0YTogV2hpdGVib2FyZEVsZW1lbnRbXSkge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICB0aGlzLl9kYXRhLm5leHQoZGF0YSk7XG4gICAgfVxuICB9XG4gIGdldCBkYXRhKCk6IFdoaXRlYm9hcmRFbGVtZW50W10ge1xuICAgIHJldHVybiB0aGlzLl9kYXRhLmdldFZhbHVlKCk7XG4gIH1cblxuICBASW5wdXQoKSBvcHRpb25zITogV2hpdGVib2FyZE9wdGlvbnM7XG5cbiAgQElucHV0KCkgc2V0IHNlbGVjdGVkVG9vbCh0b29sOiBUb29sc0VudW0pIHtcbiAgICBpZiAodGhpcy5fc2VsZWN0ZWRUb29sICE9PSB0b29sKSB7XG4gICAgICB0aGlzLl9zZWxlY3RlZFRvb2wgPSB0b29sO1xuICAgICAgdGhpcy50b29sQ2hhbmdlZC5lbWl0KHRvb2wpO1xuICAgICAgdGhpcy5jbGVhclNlbGVjdGVkRWxlbWVudCgpO1xuICAgIH1cbiAgfVxuICBnZXQgc2VsZWN0ZWRUb29sKCk6IFRvb2xzRW51bSB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkVG9vbDtcbiAgfVxuICBASW5wdXQoKSBkcmF3aW5nRW5hYmxlZCA9IHRydWU7XG4gIEBJbnB1dCgpIGNhbnZhc1dpZHRoID0gODAwO1xuICBASW5wdXQoKSBjYW52YXNIZWlnaHQgPSA2MDA7XG4gIEBJbnB1dCgpIGZ1bGxTY3JlZW4gPSB0cnVlO1xuICBASW5wdXQoKSBjZW50ZXIgPSB0cnVlO1xuICBASW5wdXQoKSBzdHJva2VDb2xvciA9ICcjMDAwJztcbiAgQElucHV0KCkgc3Ryb2tlV2lkdGggPSAyO1xuICBASW5wdXQoKSBiYWNrZ3JvdW5kQ29sb3IgPSAnI2ZmZic7XG4gIEBJbnB1dCgpIGxpbmVKb2luID0gTGluZUpvaW5FbnVtLlJPVU5EO1xuICBASW5wdXQoKSBsaW5lQ2FwID0gTGluZUNhcEVudW0uUk9VTkQ7XG4gIEBJbnB1dCgpIGZpbGwgPSAnIzMzMyc7XG4gIEBJbnB1dCgpIHpvb20gPSAxO1xuICBASW5wdXQoKSBmb250RmFtaWx5ID0gJ3NhbnMtc2VyaWYnO1xuICBASW5wdXQoKSBmb250U2l6ZSA9IDI0O1xuICBASW5wdXQoKSBkYXNoYXJyYXkgPSAnJztcbiAgQElucHV0KCkgZGFzaG9mZnNldCA9IDA7XG4gIEBJbnB1dCgpIHggPSAwO1xuICBASW5wdXQoKSB5ID0gMDtcbiAgQElucHV0KCkgZW5hYmxlR3JpZCA9IGZhbHNlO1xuICBASW5wdXQoKSBncmlkU2l6ZSA9IDEwO1xuICBASW5wdXQoKSBzbmFwVG9HcmlkID0gZmFsc2U7XG4gIEBJbnB1dCgpIHBlcnNpc3RlbmNlSWQ6IHN0cmluZ3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgQE91dHB1dCgpIHJlYWR5ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZGF0YUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8V2hpdGVib2FyZEVsZW1lbnRbXT4oKTtcbiAgQE91dHB1dCgpIGNsZWFyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgdW5kbyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIHJlZG8gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBzYXZlID0gbmV3IEV2ZW50RW1pdHRlcjxzdHJpbmc+KCk7XG4gIEBPdXRwdXQoKSBpbWFnZUFkZGVkID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgc2VsZWN0RWxlbWVudCA9IG5ldyBFdmVudEVtaXR0ZXI8V2hpdGVib2FyZEVsZW1lbnQgfCBudWxsPigpO1xuICBAT3V0cHV0KCkgZGVsZXRlRWxlbWVudCA9IG5ldyBFdmVudEVtaXR0ZXI8V2hpdGVib2FyZEVsZW1lbnQ+KCk7XG4gIEBPdXRwdXQoKSB0b29sQ2hhbmdlZCA9IG5ldyBFdmVudEVtaXR0ZXI8VG9vbHNFbnVtPigpO1xuXG4gIHByaXZhdGUgc2VsZWN0aW9uITogU2VsZWN0aW9uPEVsZW1lbnQsIHVua25vd24sIG51bGwsIHVuZGVmaW5lZD47XG5cbiAgcHJpdmF0ZSBfc3Vic2NyaXB0aW9uTGlzdDogU3Vic2NyaXB0aW9uW10gPSBbXTtcblxuICBwcml2YXRlIF9pbml0aWFsRGF0YTogV2hpdGVib2FyZEVsZW1lbnRbXSA9IFtdO1xuICBwcml2YXRlIHVuZG9TdGFjazogV2hpdGVib2FyZEVsZW1lbnRbXVtdID0gW107XG4gIHByaXZhdGUgcmVkb1N0YWNrOiBXaGl0ZWJvYXJkRWxlbWVudFtdW10gPSBbXTtcbiAgcHJpdmF0ZSBfc2VsZWN0ZWRUb29sOiBUb29sc0VudW0gPSBUb29sc0VudW0uQlJVU0g7XG4gIHNlbGVjdGVkRWxlbWVudCE6IFdoaXRlYm9hcmRFbGVtZW50O1xuXG4gIHR5cGVzID0gRWxlbWVudFR5cGVFbnVtO1xuICB0b29scyA9IFRvb2xzRW51bTtcblxuICB0ZW1wRWxlbWVudCE6IFdoaXRlYm9hcmRFbGVtZW50O1xuICB0ZW1wRHJhdyE6IFtudW1iZXIsIG51bWJlcl1bXTtcblxuICBydWJiZXJCb3ggPSB7XG4gICAgeDogMCxcbiAgICB5OiAwLFxuICAgIHdpZHRoOiAwLFxuICAgIGhlaWdodDogMCxcbiAgICBkaXNwbGF5OiAnbm9uZScsXG4gIH07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB3aGl0ZWJvYXJkU2VydmljZTogTmdXaGl0ZWJvYXJkU2VydmljZSkge31cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLl9pbml0SW5wdXRzRnJvbU9wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLl9pbml0T2JzZXJ2YWJsZXMoKTtcbiAgICB0aGlzLl9pbml0aWFsRGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5kYXRhKSk7XG4gICAgaWYgKHRoaXMucGVyc2lzdGVuY2VJZCkge1xuICAgICAgdHJ5e1xuICAgICAgICBjb25zdCBzdG9yZWQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShgd2hpdGVib2FyZF8ke3RoaXMucGVyc2lzdGVuY2VJZH1gKVxuICAgICAgICBpZiAoc3RvcmVkKSB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShzdG9yZWQpO1xuICAgICAgICAgIHRoaXMuX2RhdGEubmV4dChwYXJzZWQuZGF0YSB8fCBbXSk7XG4gICAgICAgICAgdGhpcy51bmRvU3RhY2sgPSBwYXJzZWQudW5kb1N0YWNrIHx8IFtdO1xuICAgICAgICAgIHRoaXMucmVkb1N0YWNrID0gcGFyc2VkLnJlZG9TdGFjayB8fCBbXTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignQ29ycnVwdCB3aGl0ZWJvYXJkIGRhdGEnKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiB2b2lkIHtcbiAgICBpZiAoY2hhbmdlc1snb3B0aW9ucyddKSB7XG4gICAgICAvLyYmICFpc0VxdWFsKGNoYW5nZXMub3B0aW9ucy5jdXJyZW50VmFsdWUsIGNoYW5nZXMub3B0aW9ucy5wcmV2aW91c1ZhbHVlKVxuICAgICAgdGhpcy5faW5pdElucHV0c0Zyb21PcHRpb25zKGNoYW5nZXNbJ29wdGlvbnMnXS5jdXJyZW50VmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICB0aGlzLnNlbGVjdGlvbiA9IHNlbGVjdDxFbGVtZW50LCB1bmtub3duPih0aGlzLnN2Z0NvbnRhaW5lci5uYXRpdmVFbGVtZW50KTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMucmVzaXplU2NyZWVuKCk7XG4gICAgfSwgMCk7XG4gICAgdGhpcy5pbml0YWxpemVFdmVudHModGhpcy5zZWxlY3Rpb24pO1xuICAgIHRoaXMucmVhZHkuZW1pdCgpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5mb3JFYWNoKChzdWJzY3JpcHRpb24pID0+IHRoaXMuX3Vuc3Vic2NyaWJlKHN1YnNjcmlwdGlvbikpO1xuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdElucHV0c0Zyb21PcHRpb25zKG9wdGlvbnM6IFdoaXRlYm9hcmRPcHRpb25zKTogdm9pZCB7XG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgIGlmIChvcHRpb25zLmRyYXdpbmdFbmFibGVkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmRyYXdpbmdFbmFibGVkID0gb3B0aW9ucy5kcmF3aW5nRW5hYmxlZDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnNlbGVjdGVkVG9vbCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFRvb2wgPSBvcHRpb25zLnNlbGVjdGVkVG9vbDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmNhbnZhc1dpZHRoICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmNhbnZhc1dpZHRoID0gb3B0aW9ucy5jYW52YXNXaWR0aDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmNhbnZhc0hlaWdodCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jYW52YXNIZWlnaHQgPSBvcHRpb25zLmNhbnZhc0hlaWdodDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZ1bGxTY3JlZW4gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZnVsbFNjcmVlbiA9IG9wdGlvbnMuZnVsbFNjcmVlbjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmNlbnRlciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jZW50ZXIgPSBvcHRpb25zLmNlbnRlcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnN0cm9rZUNvbG9yICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnN0cm9rZUNvbG9yID0gb3B0aW9ucy5zdHJva2VDb2xvcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnN0cm9rZVdpZHRoICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnN0cm9rZVdpZHRoID0gb3B0aW9ucy5zdHJva2VXaWR0aDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmJhY2tncm91bmRDb2xvciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSBvcHRpb25zLmJhY2tncm91bmRDb2xvcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmxpbmVKb2luICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmxpbmVKb2luID0gb3B0aW9ucy5saW5lSm9pbjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmxpbmVDYXAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubGluZUNhcCA9IG9wdGlvbnMubGluZUNhcDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZpbGwgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZmlsbCA9IG9wdGlvbnMuZmlsbDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnpvb20gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuem9vbSA9IG9wdGlvbnMuem9vbTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZvbnRGYW1pbHkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZm9udEZhbWlseSA9IG9wdGlvbnMuZm9udEZhbWlseTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZvbnRTaXplICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmZvbnRTaXplID0gb3B0aW9ucy5mb250U2l6ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmRhc2hhcnJheSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5kYXNoYXJyYXkgPSBvcHRpb25zLmRhc2hhcnJheTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmRhc2hvZmZzZXQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZGFzaG9mZnNldCA9IG9wdGlvbnMuZGFzaG9mZnNldDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnggIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueCA9IG9wdGlvbnMueDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueSA9IG9wdGlvbnMueTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmVuYWJsZUdyaWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZW5hYmxlR3JpZCA9IG9wdGlvbnMuZW5hYmxlR3JpZDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmdyaWRTaXplICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmdyaWRTaXplID0gb3B0aW9ucy5ncmlkU2l6ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnNuYXBUb0dyaWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuc25hcFRvR3JpZCA9IG9wdGlvbnMuc25hcFRvR3JpZDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnBlcnNpc3RlbmNlSWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMucGVyc2lzdGVuY2VJZCA9IG9wdGlvbnMucGVyc2lzdGVuY2VJZDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9pbml0T2JzZXJ2YWJsZXMoKTogdm9pZCB7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKFxuICAgICAgdGhpcy53aGl0ZWJvYXJkU2VydmljZS5zYXZlU3ZnTWV0aG9kQ2FsbGVkJC5zdWJzY3JpYmUoKHsgbmFtZSwgZm9ybWF0IH0pID0+IHRoaXMuc2F2ZVN2ZyhuYW1lLCBmb3JtYXQpKVxuICAgICk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKFxuICAgICAgdGhpcy53aGl0ZWJvYXJkU2VydmljZS5hZGRJbWFnZU1ldGhvZENhbGxlZCQuc3Vic2NyaWJlKChpbWFnZSkgPT4gdGhpcy5oYW5kbGVEcmF3SW1hZ2UoaW1hZ2UpKVxuICAgICk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHRoaXMud2hpdGVib2FyZFNlcnZpY2UuZXJhc2VTdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLl9jbGVhclN2ZygpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHRoaXMud2hpdGVib2FyZFNlcnZpY2UucmVzZXRTdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLl9yZXNldCgpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHRoaXMud2hpdGVib2FyZFNlcnZpY2UudW5kb1N2Z01ldGhvZENhbGxlZCQuc3Vic2NyaWJlKCgpID0+IHRoaXMudW5kb0RyYXcoKSkpO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaCh0aGlzLndoaXRlYm9hcmRTZXJ2aWNlLnJlZG9TdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLnJlZG9EcmF3KCkpKTtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25MaXN0LnB1c2goZnJvbUV2ZW50KHdpbmRvdywgJ3Jlc2l6ZScpLnN1YnNjcmliZSgoKSA9PiB0aGlzLnJlc2l6ZVNjcmVlbigpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKFxuICAgICAgdGhpcy5fZGF0YS5waXBlKHNraXAoMSkpLnN1YnNjcmliZSgoZGF0YSkgPT4ge1xuICAgICAgICBjb25zdCBzdG9yZWQgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKGB3aGl0ZWJvYXJkXyR7dGhpcy5wZXJzaXN0ZW5jZUlkfWApfHwne30nKTtcbiAgICAgICAgc3RvcmVkLmRhdGEgPSBkYXRhO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShgd2hpdGVib2FyZF8ke3RoaXMucGVyc2lzdGVuY2VJZH1gLCBKU09OLnN0cmluZ2lmeShzdG9yZWQpKTtcbiAgICAgICAgdGhpcy5kYXRhQ2hhbmdlLmVtaXQoZGF0YSk7XG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICBpbml0YWxpemVFdmVudHMoc2VsZWN0aW9uOiBTZWxlY3Rpb248RWxlbWVudCwgdW5rbm93biwgbnVsbCwgdW5kZWZpbmVkPik6IHZvaWQge1xuICAgIGlmICghdGhpcy5kcmF3aW5nRW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgZHJhZ2dpbmcgPSBmYWxzZTtcblxuICAgIHNlbGVjdGlvbi5jYWxsKFxuICAgICAgZHJhZygpXG4gICAgICAgIC5vbignc3RhcnQnLCAoKSA9PiB7XG4gICAgICAgICAgZHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICAgIHRoaXMucmVkb1N0YWNrID0gW107XG4gICAgICAgICAgdGhpcy51cGRhdGVMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgICB0aGlzLmhhbmRsZVN0YXJ0RXZlbnQoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdkcmFnJywgKCkgPT4ge1xuICAgICAgICAgIGlmICghZHJhZ2dpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5oYW5kbGVEcmFnRXZlbnQoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLmhhbmRsZUVuZEV2ZW50KCk7XG4gICAgICAgIH0pXG4gICAgKTtcbiAgfVxuXG4gIGhhbmRsZVN0YXJ0RXZlbnQoKSB7XG4gICAgc3dpdGNoICh0aGlzLnNlbGVjdGVkVG9vbCkge1xuICAgICAgY2FzZSBUb29sc0VudW0uQlJVU0g6XG4gICAgICAgIHRoaXMuaGFuZGxlU3RhcnRCcnVzaCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLklNQUdFOlxuICAgICAgICB0aGlzLmhhbmRsZUltYWdlVG9vbCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkxJTkU6XG4gICAgICAgIHRoaXMuaGFuZGxlU3RhcnRMaW5lKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uUkVDVDpcbiAgICAgICAgdGhpcy5oYW5kbGVTdGFydFJlY3QoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5FTExJUFNFOlxuICAgICAgICB0aGlzLmhhbmRsZVN0YXJ0RWxsaXBzZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlRFWFQ6XG4gICAgICAgIHRoaXMuaGFuZGxlVGV4dFRvb2woKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5TRUxFQ1Q6XG4gICAgICAgIHRoaXMuaGFuZGxlU2VsZWN0VG9vbCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkVSQVNFUjpcbiAgICAgICAgdGhpcy5oYW5kbGVFcmFzZXJUb29sKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGhhbmRsZURyYWdFdmVudCgpIHtcbiAgICBzd2l0Y2ggKHRoaXMuc2VsZWN0ZWRUb29sKSB7XG4gICAgICBjYXNlIFRvb2xzRW51bS5CUlVTSDpcbiAgICAgICAgdGhpcy5oYW5kbGVEcmFnQnJ1c2goKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5MSU5FOlxuICAgICAgICB0aGlzLmhhbmRsZURyYWdMaW5lKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uUkVDVDpcbiAgICAgICAgdGhpcy5oYW5kbGVEcmFnUmVjdCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkVMTElQU0U6XG4gICAgICAgIHRoaXMuaGFuZGxlRHJhZ0VsbGlwc2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5URVhUOlxuICAgICAgICB0aGlzLmhhbmRsZVRleHREcmFnKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGhhbmRsZUVuZEV2ZW50KCkge1xuICAgIHN3aXRjaCAodGhpcy5zZWxlY3RlZFRvb2wpIHtcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkJSVVNIOlxuICAgICAgICB0aGlzLmhhbmRsZUVuZEJydXNoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uTElORTpcbiAgICAgICAgdGhpcy5oYW5kbGVFbmRMaW5lKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uUkVDVDpcbiAgICAgICAgdGhpcy5oYW5kbGVFbmRSZWN0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uRUxMSVBTRTpcbiAgICAgICAgdGhpcy5oYW5kbGVFbmRFbGxpcHNlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uVEVYVDpcbiAgICAgICAgdGhpcy5oYW5kbGVUZXh0RW5kKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBCcnVzaCB0b29sXG4gIGhhbmRsZVN0YXJ0QnJ1c2goKSB7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX2dlbmVyYXRlTmV3RWxlbWVudChFbGVtZW50VHlwZUVudW0uQlJVU0gpO1xuICAgIHRoaXMudGVtcERyYXcgPSBbdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKV07XG4gICAgZWxlbWVudC52YWx1ZSA9IGQzTGluZSh0aGlzLnRlbXBEcmF3KSBhcyBzdHJpbmc7XG4gICAgZWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoID0gdGhpcy5zdHJva2VXaWR0aDtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gZWxlbWVudDtcbiAgfVxuICBoYW5kbGVEcmFnQnJ1c2goKSB7XG4gICAgdGhpcy50ZW1wRHJhdy5wdXNoKHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSkpO1xuICAgIHRoaXMudGVtcEVsZW1lbnQudmFsdWUgPSBkM0xpbmUodGhpcy50ZW1wRHJhdykgYXMgc3RyaW5nO1xuICB9XG4gIGhhbmRsZUVuZEJydXNoKCkge1xuICAgIHRoaXMudGVtcERyYXcucHVzaCh0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpKTtcbiAgICB0aGlzLnRlbXBFbGVtZW50LnZhbHVlID0gZDNMaW5lKHRoaXMudGVtcERyYXcpIGFzIHN0cmluZztcbiAgICB0aGlzLl9wdXNoVG9EYXRhKHRoaXMudGVtcEVsZW1lbnQpO1xuICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICB0aGlzLnRlbXBEcmF3ID0gbnVsbCBhcyBuZXZlcjtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gbnVsbCBhcyBuZXZlcjtcbiAgfVxuICAvLyBIYW5kbGUgSW1hZ2UgdG9vbFxuICBoYW5kbGVJbWFnZVRvb2woKSB7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgaW5wdXQudHlwZSA9ICdmaWxlJztcbiAgICBpbnB1dC5hY2NlcHQgPSAnaW1hZ2UvKic7XG4gICAgaW5wdXQub25jaGFuZ2UgPSAoZSkgPT4ge1xuICAgICAgY29uc3QgZmlsZXMgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkuZmlsZXM7XG4gICAgICBpZiAoZmlsZXMpIHtcbiAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9IChlOiBQcm9ncmVzc0V2ZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgaW1hZ2UgPSAoZS50YXJnZXQgYXMgRmlsZVJlYWRlcikucmVzdWx0IGFzIHN0cmluZztcbiAgICAgICAgICB0aGlzLmhhbmRsZURyYXdJbWFnZSh7IGltYWdlLCB4LCB5IH0pO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIucmVhZEFzRGF0YVVSTChmaWxlc1swXSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBpbnB1dC5jbGljaygpO1xuICB9XG4gIC8vIEhhbmRsZSBEcmF3IEltYWdlXG4gIGhhbmRsZURyYXdJbWFnZShpbWFnZVNyYzogSUFkZEltYWdlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRlbXBJbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICAgIHRlbXBJbWcub25sb2FkID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBzdmdIZWlnaHQgPSB0aGlzLmNhbnZhc0hlaWdodDtcbiAgICAgICAgY29uc3QgaW1hZ2VXaWR0aCA9IHRlbXBJbWcud2lkdGg7XG4gICAgICAgIGNvbnN0IGltYWdlSGVpZ2h0ID0gdGVtcEltZy5oZWlnaHQ7XG4gICAgICAgIGNvbnN0IGFzcGVjdFJhdGlvID0gdGVtcEltZy53aWR0aCAvIHRlbXBJbWcuaGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWlnaHQgPSBpbWFnZUhlaWdodCA+IHN2Z0hlaWdodCA/IHN2Z0hlaWdodCAtIDQwIDogaW1hZ2VIZWlnaHQ7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gaGVpZ2h0ID09PSBzdmdIZWlnaHQgLSA0MCA/IChzdmdIZWlnaHQgLSA0MCkgKiBhc3BlY3RSYXRpbyA6IGltYWdlV2lkdGg7XG5cbiAgICAgICAgbGV0IHggPSBpbWFnZVNyYy54IHx8IChpbWFnZVdpZHRoIC0gd2lkdGgpICogKGltYWdlU3JjLnggfHwgMCk7XG4gICAgICAgIGxldCB5ID0gaW1hZ2VTcmMueSB8fCAoaW1hZ2VIZWlnaHQgLSBoZWlnaHQpICogKGltYWdlU3JjLnkgfHwgMCk7XG5cbiAgICAgICAgaWYgKHggPCAwKSB7XG4gICAgICAgICAgeCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHkgPCAwKSB7XG4gICAgICAgICAgeSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5JTUFHRSk7XG4gICAgICAgIGVsZW1lbnQudmFsdWUgPSBpbWFnZVNyYy5pbWFnZSBhcyBzdHJpbmc7XG4gICAgICAgIGVsZW1lbnQub3B0aW9ucy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBlbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICBlbGVtZW50LnggPSB4O1xuICAgICAgICBlbGVtZW50LnkgPSB5O1xuICAgICAgICB0aGlzLl9wdXNoVG9EYXRhKGVsZW1lbnQpO1xuICAgICAgICB0aGlzLmltYWdlQWRkZWQuZW1pdCgpO1xuICAgICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgICB9O1xuICAgICAgdGVtcEltZy5zcmMgPSBpbWFnZVNyYy5pbWFnZSBhcyBzdHJpbmc7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgTGluZSB0b29sXG4gIGhhbmRsZVN0YXJ0TGluZSgpIHtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5MSU5FKTtcbiAgICBsZXQgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcblxuICAgIGlmICh0aGlzLnNuYXBUb0dyaWQpIHtcbiAgICAgIHggPSB0aGlzLl9zbmFwVG9HcmlkKHgpO1xuICAgICAgeSA9IHRoaXMuX3NuYXBUb0dyaWQoeSk7XG4gICAgfVxuXG4gICAgZWxlbWVudC5vcHRpb25zLngxID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMueTEgPSB5O1xuICAgIGVsZW1lbnQub3B0aW9ucy54MiA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLnkyID0geTtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gZWxlbWVudDtcbiAgfVxuICBoYW5kbGVEcmFnTGluZSgpIHtcbiAgICBsZXQgW3gyLCB5Ml0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuXG4gICAgaWYgKHRoaXMuc25hcFRvR3JpZCkge1xuICAgICAgeDIgPSB0aGlzLl9zbmFwVG9HcmlkKHgyKTtcbiAgICAgIHkyID0gdGhpcy5fc25hcFRvR3JpZCh5Mik7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICBjb25zdCB4MSA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MSBhcyBudW1iZXI7XG4gICAgICBjb25zdCB5MSA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MSBhcyBudW1iZXI7XG4gICAgICBjb25zdCB7IHgsIHkgfSA9IHRoaXMuX3NuYXBUb0FuZ2xlKHgxLCB5MSwgeDIsIHkyKTtcbiAgICAgIFt4MiwgeTJdID0gW3gsIHldO1xuICAgIH1cblxuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MiA9IHgyO1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MiA9IHkyO1xuICB9XG4gIGhhbmRsZUVuZExpbmUoKSB7XG4gICAgaWYgKFxuICAgICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngxICE9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MiB8fFxuICAgICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkxICE9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MlxuICAgICkge1xuICAgICAgdGhpcy5fcHVzaFRvRGF0YSh0aGlzLnRlbXBFbGVtZW50KTtcbiAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICAgIHRoaXMudGVtcEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgUmVjdCB0b29sXG4gIGhhbmRsZVN0YXJ0UmVjdCgpIHtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5SRUNUKTtcbiAgICBsZXQgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBpZiAodGhpcy5zbmFwVG9HcmlkKSB7XG4gICAgICB4ID0gdGhpcy5fc25hcFRvR3JpZCh4KTtcbiAgICAgIHkgPSB0aGlzLl9zbmFwVG9HcmlkKHkpO1xuICAgIH1cbiAgICBlbGVtZW50Lm9wdGlvbnMueDEgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy55MSA9IHk7XG4gICAgZWxlbWVudC5vcHRpb25zLngyID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMueTIgPSB5O1xuICAgIGVsZW1lbnQub3B0aW9ucy53aWR0aCA9IDE7XG4gICAgZWxlbWVudC5vcHRpb25zLmhlaWdodCA9IDE7XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IGVsZW1lbnQ7XG4gIH1cbiAgaGFuZGxlRHJhZ1JlY3QoKSB7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBjb25zdCBzdGFydF94ID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngxIHx8IDA7XG4gICAgY29uc3Qgc3RhcnRfeSA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MSB8fCAwO1xuICAgIGxldCB3ID0gTWF0aC5hYnMoeCAtIHN0YXJ0X3gpO1xuICAgIGxldCBoID0gTWF0aC5hYnMoeSAtIHN0YXJ0X3kpO1xuICAgIGxldCBuZXdfeCA9IG51bGw7XG4gICAgbGV0IG5ld195ID0gbnVsbDtcblxuICAgIGlmIChldmVudC5zb3VyY2VFdmVudC5zaGlmdEtleSkge1xuICAgICAgdyA9IGggPSBNYXRoLm1heCh3LCBoKTtcbiAgICAgIG5ld194ID0gc3RhcnRfeCA8IHggPyBzdGFydF94IDogc3RhcnRfeCAtIHc7XG4gICAgICBuZXdfeSA9IHN0YXJ0X3kgPCB5ID8gc3RhcnRfeSA6IHN0YXJ0X3kgLSBoO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXdfeCA9IE1hdGgubWluKHN0YXJ0X3gsIHgpO1xuICAgICAgbmV3X3kgPSBNYXRoLm1pbihzdGFydF95LCB5KTtcbiAgICB9XG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LmFsdEtleSkge1xuICAgICAgdyAqPSAyO1xuICAgICAgaCAqPSAyO1xuICAgICAgbmV3X3ggPSBzdGFydF94IC0gdyAvIDI7XG4gICAgICBuZXdfeSA9IHN0YXJ0X3kgLSBoIC8gMjtcbiAgICB9XG4gICAgaWYgKHRoaXMuc25hcFRvR3JpZCkge1xuICAgICAgdyA9IHRoaXMuX3NuYXBUb0dyaWQodyk7XG4gICAgICBoID0gdGhpcy5fc25hcFRvR3JpZChoKTtcbiAgICAgIG5ld194ID0gdGhpcy5fc25hcFRvR3JpZChuZXdfeCk7XG4gICAgICBuZXdfeSA9IHRoaXMuX3NuYXBUb0dyaWQobmV3X3kpO1xuICAgIH1cblxuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IHc7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGg7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngyID0gbmV3X3g7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkyID0gbmV3X3k7XG4gIH1cbiAgaGFuZGxlRW5kUmVjdCgpIHtcbiAgICBpZiAodGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoICE9IDAgfHwgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLmhlaWdodCAhPSAwKSB7XG4gICAgICB0aGlzLl9wdXNoVG9EYXRhKHRoaXMudGVtcEVsZW1lbnQpO1xuICAgICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgICAgdGhpcy50ZW1wRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBFbGxpcHNlIHRvb2xcbiAgaGFuZGxlU3RhcnRFbGxpcHNlKCkge1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLkVMTElQU0UpO1xuICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG5cbiAgICAvLyB3b3JrYXJvdW5kXG4gICAgZWxlbWVudC5vcHRpb25zLngxID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMueTEgPSB5O1xuXG4gICAgZWxlbWVudC5vcHRpb25zLmN4ID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMuY3kgPSB5O1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBlbGVtZW50O1xuICB9XG4gIGhhbmRsZURyYWdFbGxpcHNlKCkge1xuICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG4gICAgY29uc3Qgc3RhcnRfeCA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MSB8fCAwO1xuICAgIGNvbnN0IHN0YXJ0X3kgPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTEgfHwgMDtcbiAgICBsZXQgY3ggPSBNYXRoLmFicyhzdGFydF94ICsgKHggLSBzdGFydF94KSAvIDIpO1xuICAgIGxldCBjeSA9IE1hdGguYWJzKHN0YXJ0X3kgKyAoeSAtIHN0YXJ0X3kpIC8gMik7XG4gICAgbGV0IHJ4ID0gTWF0aC5hYnMoc3RhcnRfeCAtIGN4KTtcbiAgICBsZXQgcnkgPSBNYXRoLmFicyhzdGFydF95IC0gY3kpO1xuXG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICByeSA9IHJ4O1xuICAgICAgY3kgPSB5ID4gc3RhcnRfeSA/IHN0YXJ0X3kgKyByeCA6IHN0YXJ0X3kgLSByeDtcbiAgICB9XG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LmFsdEtleSkge1xuICAgICAgY3ggPSBzdGFydF94O1xuICAgICAgY3kgPSBzdGFydF95O1xuICAgICAgcnggPSBNYXRoLmFicyh4IC0gY3gpO1xuICAgICAgcnkgPSBldmVudC5zb3VyY2VFdmVudC5zaGlmdEtleSA/IHJ4IDogTWF0aC5hYnMoeSAtIGN5KTtcbiAgICB9XG5cbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMucnggPSByeDtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMucnkgPSByeTtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMuY3ggPSBjeDtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMuY3kgPSBjeTtcbiAgfVxuICBoYW5kbGVFbmRFbGxpcHNlKCkge1xuICAgIGlmICh0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMucnggIT0gMCB8fCB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMucnkgIT0gMCkge1xuICAgICAgdGhpcy5fcHVzaFRvRGF0YSh0aGlzLnRlbXBFbGVtZW50KTtcbiAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICAgIHRoaXMudGVtcEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgVGV4dCB0b29sXG4gIGhhbmRsZVRleHRUb29sKCkge1xuICAgIGlmICh0aGlzLnRlbXBFbGVtZW50KSB7XG4gICAgICAvLyBmaW5pc2ggdGhlIGN1cnJlbnQgb25lIGlmIG5lZWRlZFxuICAgICAgdGhpcy5maW5pc2hUZXh0SW5wdXQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX2dlbmVyYXRlTmV3RWxlbWVudChFbGVtZW50VHlwZUVudW0uVEVYVCk7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBlbGVtZW50Lm9wdGlvbnMudG9wID0geTtcbiAgICBlbGVtZW50Lm9wdGlvbnMubGVmdCA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoID0gMDtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gZWxlbWVudDtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMudGV4dElucHV0Lm5hdGl2ZUVsZW1lbnQuZm9jdXMoKTtcbiAgICB9LCAwKTtcbiAgfVxuICBoYW5kbGVUZXh0RHJhZygpIHtcbiAgICBpZiAoIXRoaXMudGVtcEVsZW1lbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMudG9wID0geTtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMubGVmdCA9IHg7XG4gIH1cbiAgaGFuZGxlVGV4dEVuZCgpIHtcbiAgICBpZiAoIXRoaXMudGVtcEVsZW1lbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICB9XG4gIC8vIEhhbmRsZSBTZWxlY3QgdG9vbFxuICBoYW5kbGVTZWxlY3RUb29sKCkge1xuICAgIGNvbnN0IG1vdXNlX3RhcmdldCA9IHRoaXMuX2dldE1vdXNlVGFyZ2V0KCk7XG4gICAgaWYgKG1vdXNlX3RhcmdldCkge1xuICAgICAgaWYgKG1vdXNlX3RhcmdldC5pZCA9PT0gJ3NlbGVjdG9yR3JvdXAnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGlkID0gbW91c2VfdGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS13Yi1pZCcpO1xuICAgICAgY29uc3Qgc2VsZWN0ZWRFbGVtZW50ID0gdGhpcy5kYXRhLmZpbmQoKGVsKSA9PiBlbC5pZCA9PT0gaWQpIGFzIFdoaXRlYm9hcmRFbGVtZW50O1xuICAgICAgdGhpcy5zZXRTZWxlY3RlZEVsZW1lbnQoc2VsZWN0ZWRFbGVtZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jbGVhclNlbGVjdGVkRWxlbWVudCgpO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgRXJhc2VyIHRvb2xcbiAgaGFuZGxlRXJhc2VyVG9vbCgpIHtcbiAgICBjb25zdCBtb3VzZV90YXJnZXQgPSB0aGlzLl9nZXRNb3VzZVRhcmdldCgpO1xuICAgIGlmIChtb3VzZV90YXJnZXQpIHtcbiAgICAgIGNvbnN0IGlkID0gbW91c2VfdGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS13Yi1pZCcpO1xuICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMuZGF0YS5maW5kKChlbCkgPT4gZWwuaWQgPT09IGlkKSBhcyBXaGl0ZWJvYXJkRWxlbWVudDtcbiAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoKGVsKSA9PiBlbC5pZCAhPT0gaWQpO1xuICAgICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgICAgIHRoaXMuZGVsZXRlRWxlbWVudC5lbWl0KGVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBjb252ZXJ0IHRoZSB2YWx1ZSBvZiB0aGlzLnRleHRJbnB1dC5uYXRpdmVFbGVtZW50IHRvIGFuIFNWRyB0ZXh0IG5vZGUsIHVubGVzcyBpdCdzIGVtcHR5LFxuICAvLyBhbmQgdGhlbiBkaXNtaXNzIHRoaXMudGV4dElucHV0Lm5hdGl2ZUVsZW1lbnRcbiAgZmluaXNoVGV4dElucHV0KCkge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy50ZXh0SW5wdXQubmF0aXZlRWxlbWVudC52YWx1ZTtcbiAgICB0aGlzLnRlbXBFbGVtZW50LnZhbHVlID0gdmFsdWU7XG4gICAgaWYgKHRoaXMudGVtcEVsZW1lbnQudmFsdWUpIHtcbiAgICAgIHRoaXMuX3B1c2hUb0RhdGEodGhpcy50ZW1wRWxlbWVudCk7XG4gICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgfVxuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICB9XG4gIC8vIEhhbmRsZSBUZXh0IElucHV0XG4gIHVwZGF0ZVRleHRJdGVtKHZhbHVlOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy50ZW1wRWxlbWVudCAmJiB0aGlzLnNlbGVjdGVkVG9vbCA9PSBUb29sc0VudW0uVEVYVCkge1xuICAgICAgdGhpcy50ZW1wRWxlbWVudC52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgfVxuICBzZXRTZWxlY3RlZEVsZW1lbnQoZWxlbWVudDogV2hpdGVib2FyZEVsZW1lbnQpIHtcbiAgICB0aGlzLnNlbGVjdGVkVG9vbCA9IFRvb2xzRW51bS5TRUxFQ1Q7XG4gICAgY29uc3QgY3VycmVudEJCb3ggPSB0aGlzLl9nZXRFbGVtZW50QmJveChlbGVtZW50KTtcbiAgICB0aGlzLnNlbGVjdGVkRWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5zZWxlY3RFbGVtZW50LmVtaXQoZWxlbWVudCk7XG4gICAgdGhpcy5fc2hvd0dyaXBzKGN1cnJlbnRCQm94KTtcbiAgfVxuICBjbGVhclNlbGVjdGVkRWxlbWVudCgpIHtcbiAgICB0aGlzLnNlbGVjdGVkRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gICAgdGhpcy5ydWJiZXJCb3guZGlzcGxheSA9ICdub25lJztcbiAgICB0aGlzLnNlbGVjdEVsZW1lbnQuZW1pdChudWxsKTtcbiAgfVxuICBwcml2YXRlIHNhdmVTdmcobmFtZTogc3RyaW5nLCBmb3JtYXQ6IGZvcm1hdFR5cGVzKSB7XG4gICAgY29uc3Qgc3ZnQ2FudmFzID0gdGhpcy5zZWxlY3Rpb24uc2VsZWN0KCcjc3ZnY29udGVudCcpLmNsb25lKHRydWUpO1xuICAgIHN2Z0NhbnZhcy5zZWxlY3QoJyNzZWxlY3RvclBhcmVudEdyb3VwJykucmVtb3ZlKCk7XG4gICAgKHN2Z0NhbnZhcy5zZWxlY3QoJyNjb250ZW50QmFja2dyb3VuZCcpLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUoJ29wYWNpdHknKTtcbiAgICBjb25zdCBzdmcgPSBzdmdDYW52YXMubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQ7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgneCcsICcwJyk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgneScsICcwJyk7XG5cbiAgICBjb25zdCBzdmdTdHJpbmcgPSB0aGlzLnNhdmVBc1N2ZyhzdmcgYXMgRWxlbWVudCk7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgRm9ybWF0VHlwZS5CYXNlNjQ6XG4gICAgICAgIHRoaXMuc3ZnU3RyaW5nMkltYWdlKHN2Z1N0cmluZywgdGhpcy5jYW52YXNXaWR0aCwgdGhpcy5jYW52YXNIZWlnaHQsIGZvcm1hdCwgKGltZykgPT4ge1xuICAgICAgICAgIHRoaXMuc2F2ZS5lbWl0KGltZyk7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgRm9ybWF0VHlwZS5Tdmc6IHtcbiAgICAgICAgY29uc3QgaW1nU3JjID0gJ2RhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsJyArIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHN2Z1N0cmluZykpKTtcbiAgICAgICAgdGhpcy5kb3dubG9hZChpbWdTcmMsIG5hbWUpO1xuICAgICAgICB0aGlzLnNhdmUuZW1pdChpbWdTcmMpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMuc3ZnU3RyaW5nMkltYWdlKHN2Z1N0cmluZywgdGhpcy5jYW52YXNXaWR0aCwgdGhpcy5jYW52YXNIZWlnaHQsIGZvcm1hdCwgKGltZykgPT4ge1xuICAgICAgICAgIHRoaXMuZG93bmxvYWQoaW1nLCBuYW1lKTtcbiAgICAgICAgICB0aGlzLnNhdmUuZW1pdChpbWcpO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHN2Z0NhbnZhcy5yZW1vdmUoKTtcbiAgfVxuICBwcml2YXRlIHN2Z1N0cmluZzJJbWFnZShcbiAgICBzdmdTdHJpbmc6IHN0cmluZyxcbiAgICB3aWR0aDogbnVtYmVyLFxuICAgIGhlaWdodDogbnVtYmVyLFxuICAgIGZvcm1hdDogc3RyaW5nLFxuICAgIGNhbGxiYWNrOiAoaW1nOiBzdHJpbmcpID0+IHZvaWRcbiAgKSB7XG4gICAgLy8gc2V0IGRlZmF1bHQgZm9yIGZvcm1hdCBwYXJhbWV0ZXJcbiAgICBmb3JtYXQgPSBmb3JtYXQgfHwgJ3BuZyc7XG4gICAgLy8gU1ZHIGRhdGEgVVJMIGZyb20gU1ZHIHN0cmluZ1xuICAgIGNvbnN0IHN2Z0RhdGEgPSAnZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCwnICsgYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3ZnU3RyaW5nKSkpO1xuICAgIC8vIGNyZWF0ZSBjYW52YXMgaW4gbWVtb3J5KG5vdCBpbiBET00pXG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgLy8gZ2V0IGNhbnZhcyBjb250ZXh0IGZvciBkcmF3aW5nIG9uIGNhbnZhc1xuICAgIGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSBhcyBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XG4gICAgLy8gc2V0IGNhbnZhcyBzaXplXG4gICAgY2FudmFzLndpZHRoID0gd2lkdGg7XG4gICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICAvLyBjcmVhdGUgaW1hZ2UgaW4gbWVtb3J5KG5vdCBpbiBET00pXG4gICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICAvLyBsYXRlciB3aGVuIGltYWdlIGxvYWRzIHJ1biB0aGlzXG4gICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xuICAgICAgLy8gYXN5bmMgKGhhcHBlbnMgbGF0ZXIpXG4gICAgICAvLyBjbGVhciBjYW52YXNcbiAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgLy8gZHJhdyBpbWFnZSB3aXRoIFNWRyBkYXRhIHRvIGNhbnZhc1xuICAgICAgY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgLy8gc25hcHNob3QgY2FudmFzIGFzIHBuZ1xuICAgICAgY29uc3QgcG5nRGF0YSA9IGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlLycgKyBmb3JtYXQpO1xuICAgICAgLy8gcGFzcyBwbmcgZGF0YSBVUkwgdG8gY2FsbGJhY2tcbiAgICAgIGNhbGxiYWNrKHBuZ0RhdGEpO1xuICAgIH07IC8vIGVuZCBhc3luY1xuICAgIC8vIHN0YXJ0IGxvYWRpbmcgU1ZHIGRhdGEgaW50byBpbiBtZW1vcnkgaW1hZ2VcbiAgICBpbWFnZS5zcmMgPSBzdmdEYXRhO1xuICB9XG4gIHByaXZhdGUgc2F2ZUFzU3ZnKHN2Z05vZGU6IEVsZW1lbnQpOiBzdHJpbmcge1xuICAgIGNvbnN0IHNlcmlhbGl6ZXIgPSBuZXcgWE1MU2VyaWFsaXplcigpO1xuICAgIGxldCBzdmdTdHJpbmcgPSBzZXJpYWxpemVyLnNlcmlhbGl6ZVRvU3RyaW5nKHN2Z05vZGUpO1xuICAgIHN2Z1N0cmluZyA9IHN2Z1N0cmluZy5yZXBsYWNlKC8oXFx3Kyk/Oj94bGluaz0vZywgJ3htbG5zOnhsaW5rPScpOyAvLyBGaXggcm9vdCB4bGluayB3aXRob3V0IG5hbWVzcGFjZVxuICAgIHN2Z1N0cmluZyA9IHN2Z1N0cmluZy5yZXBsYWNlKC9OU1xcZCs6aHJlZi9nLCAneGxpbms6aHJlZicpO1xuICAgIHJldHVybiBzdmdTdHJpbmc7XG4gIH1cbiAgcHJpdmF0ZSBkb3dubG9hZCh1cmw6IHN0cmluZywgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICBsaW5rLmhyZWYgPSB1cmw7XG4gICAgbGluay5zZXRBdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgbGluay5kb3dubG9hZCA9IG5hbWUgfHwgJ25ldyB3aGl0ZS1ib2FyZCc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICBsaW5rLmNsaWNrKCk7XG4gIH1cbiAgcHJpdmF0ZSBfcHVzaFRvRGF0YShlbGVtZW50OiBXaGl0ZWJvYXJkRWxlbWVudCkge1xuICAgIHRoaXMuZGF0YS5wdXNoKGVsZW1lbnQpO1xuICAgIHRoaXMuX2RhdGEubmV4dCh0aGlzLmRhdGEpO1xuICB9XG4gIHByaXZhdGUgX2NsZWFyU3ZnKCkge1xuICAgIHRoaXMuZGF0YSA9IFtdO1xuICAgIHRoaXMuX2RhdGEubmV4dCh0aGlzLmRhdGEpO1xuICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICB0aGlzLmNsZWFyLmVtaXQoKTtcbiAgfVxuICBwcml2YXRlIHVuZG9EcmF3KCkge1xuICAgIGlmICghdGhpcy51bmRvU3RhY2subGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IHRoaXMudW5kb1N0YWNrLnBvcCgpO1xuICAgIHRoaXMucmVkb1N0YWNrLnB1c2goY3VycmVudFN0YXRlIGFzIFdoaXRlYm9hcmRFbGVtZW50W10pO1xuICAgIGlmKHRoaXMudW5kb1N0YWNrLmxlbmd0aCl7XG4gICAgICB0aGlzLmRhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMudW5kb1N0YWNrW3RoaXMudW5kb1N0YWNrLmxlbmd0aC0xXSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuX2luaXRpYWxEYXRhKSkgfHwgW107XG4gICAgfVxuICAgIHRoaXMudXBkYXRlTG9jYWxTdG9yYWdlKCk7XG4gICAgdGhpcy51bmRvLmVtaXQoKTtcbiAgfVxuICBwcml2YXRlIHJlZG9EcmF3KCkge1xuICAgIGlmICghdGhpcy5yZWRvU3RhY2subGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IHRoaXMucmVkb1N0YWNrLnBvcCgpO1xuICAgIHRoaXMudW5kb1N0YWNrLnB1c2goSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdXJyZW50U3RhdGUpKSBhcyBXaGl0ZWJvYXJkRWxlbWVudFtdKTtcbiAgICB0aGlzLmRhdGEgPSBjdXJyZW50U3RhdGUgfHwgW107XG4gICAgdGhpcy51cGRhdGVMb2NhbFN0b3JhZ2UoKTtcbiAgICB0aGlzLnJlZG8uZW1pdCgpO1xuICB9XG4gIHByaXZhdGUgX3B1c2hUb1VuZG8oKSB7XG4gICAgdGhpcy51bmRvU3RhY2sucHVzaChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZGF0YSkpKTtcbiAgICB0aGlzLnVwZGF0ZUxvY2FsU3RvcmFnZSgpO1xuICB9XG4gIHByaXZhdGUgX3Jlc2V0KCk6IHZvaWQge1xuICAgIHRoaXMudW5kb1N0YWNrID0gW107XG4gICAgdGhpcy5yZWRvU3RhY2sgPSBbXTtcbiAgICB0cnkge1xuICAgICAgdGhpcy5kYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLl9pbml0aWFsRGF0YSkpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgdGhpcy5kYXRhID0gW107XG4gICAgfVxuICAgIHRoaXMudXBkYXRlTG9jYWxTdG9yYWdlKCk7XG4gIH1cbiAgcHJpdmF0ZSB1cGRhdGVMb2NhbFN0b3JhZ2UoKTogdm9pZCB7XG4gICAgY29uc3Qgc3RvcmFnZU9iamVjdCA9IHtkYXRhOiB0aGlzLmRhdGEsIHVuZG9TdGFjazogdGhpcy51bmRvU3RhY2ssIHJlZG9TdGFjazogdGhpcy5yZWRvU3RhY2t9O1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGB3aGl0ZWJvYXJkXyR7dGhpcy5wZXJzaXN0ZW5jZUlkfWAsIEpTT04uc3RyaW5naWZ5KHN0b3JhZ2VPYmplY3QpKTtcbiAgfVxuICBwcml2YXRlIF9nZW5lcmF0ZU5ld0VsZW1lbnQobmFtZTogRWxlbWVudFR5cGVFbnVtKTogV2hpdGVib2FyZEVsZW1lbnQge1xuICAgIGNvbnN0IGVsZW1lbnQgPSBuZXcgV2hpdGVib2FyZEVsZW1lbnQobmFtZSwge1xuICAgICAgc3Ryb2tlV2lkdGg6IHRoaXMuc3Ryb2tlV2lkdGgsXG4gICAgICBzdHJva2VDb2xvcjogdGhpcy5zdHJva2VDb2xvcixcbiAgICAgIGZpbGw6IHRoaXMuZmlsbCxcbiAgICAgIGxpbmVKb2luOiB0aGlzLmxpbmVKb2luLFxuICAgICAgbGluZUNhcDogdGhpcy5saW5lQ2FwLFxuICAgICAgZm9udFNpemU6IHRoaXMuZm9udFNpemUsXG4gICAgICBmb250RmFtaWx5OiB0aGlzLmZvbnRGYW1pbHksXG4gICAgICBkYXNoYXJyYXk6IHRoaXMuZGFzaGFycmF5LFxuICAgICAgZGFzaG9mZnNldDogdGhpcy5kYXNob2Zmc2V0LFxuICAgIH0pO1xuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG4gIHByaXZhdGUgX2NhbGN1bGF0ZVhBbmRZKFt4LCB5XTogW251bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlcl0ge1xuICAgIHJldHVybiBbKHggLSB0aGlzLngpIC8gdGhpcy56b29tLCAoeSAtIHRoaXMueSkgLyB0aGlzLnpvb21dO1xuICB9XG4gIHByaXZhdGUgcmVzaXplU2NyZWVuKCkge1xuICAgIGNvbnN0IHN2Z0NvbnRhaW5lciA9IHRoaXMuc3ZnQ29udGFpbmVyLm5hdGl2ZUVsZW1lbnQ7XG4gICAgaWYgKHRoaXMuZnVsbFNjcmVlbikge1xuICAgICAgdGhpcy5jYW52YXNXaWR0aCA9IHN2Z0NvbnRhaW5lci5jbGllbnRXaWR0aDtcbiAgICAgIHRoaXMuY2FudmFzSGVpZ2h0ID0gc3ZnQ29udGFpbmVyLmNsaWVudEhlaWdodDtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2VudGVyKSB7XG4gICAgICB0aGlzLnggPSBzdmdDb250YWluZXIuY2xpZW50V2lkdGggLyAyIC0gdGhpcy5jYW52YXNXaWR0aCAvIDI7XG4gICAgICB0aGlzLnkgPSBzdmdDb250YWluZXIuY2xpZW50SGVpZ2h0IC8gMiAtIHRoaXMuY2FudmFzSGVpZ2h0IC8gMjtcbiAgICB9XG4gIH1cbiAgcHJpdmF0ZSBfc25hcFRvQW5nbGUoeDE6IG51bWJlciwgeTE6IG51bWJlciwgeDI6IG51bWJlciwgeTI6IG51bWJlcikge1xuICAgIGNvbnN0IHNuYXAgPSBNYXRoLlBJIC8gNDsgLy8gNDUgZGVncmVlc1xuICAgIGNvbnN0IGR4ID0geDIgLSB4MTtcbiAgICBjb25zdCBkeSA9IHkyIC0geTE7XG4gICAgY29uc3QgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeCk7XG4gICAgY29uc3QgZGlzdCA9IE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG4gICAgY29uc3Qgc25hcGFuZ2xlID0gTWF0aC5yb3VuZChhbmdsZSAvIHNuYXApICogc25hcDtcbiAgICBjb25zdCB4ID0geDEgKyBkaXN0ICogTWF0aC5jb3Moc25hcGFuZ2xlKTtcbiAgICBjb25zdCB5ID0geTEgKyBkaXN0ICogTWF0aC5zaW4oc25hcGFuZ2xlKTtcbiAgICByZXR1cm4geyB4OiB4LCB5OiB5LCBhOiBzbmFwYW5nbGUgfTtcbiAgfVxuICBwcml2YXRlIF9zbmFwVG9HcmlkKG46IG51bWJlcikge1xuICAgIGNvbnN0IHNuYXAgPSB0aGlzLmdyaWRTaXplO1xuICAgIGNvbnN0IG4xID0gTWF0aC5yb3VuZChuIC8gc25hcCkgKiBzbmFwO1xuICAgIHJldHVybiBuMTtcbiAgfVxuICBwcml2YXRlIF9nZXRFbGVtZW50QmJveChlbGVtZW50OiBXaGl0ZWJvYXJkRWxlbWVudCk6IERPTVJlY3Qge1xuICAgIGNvbnN0IGVsID0gdGhpcy5zZWxlY3Rpb24uc2VsZWN0KGAjaXRlbV8ke2VsZW1lbnQuaWR9YCkubm9kZSgpIGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICBjb25zdCBiYm94ID0gZWwuZ2V0QkJveCgpO1xuICAgIHJldHVybiBiYm94O1xuICB9XG4gIHByaXZhdGUgX2dldE1vdXNlVGFyZ2V0KCk6IFNWR0dyYXBoaWNzRWxlbWVudCB8IG51bGwge1xuICAgIGNvbnN0IGV2dDogRXZlbnQgPSBldmVudC5zb3VyY2VFdmVudDtcbiAgICBpZiAoZXZ0ID09IG51bGwgfHwgZXZ0LnRhcmdldCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgbGV0IG1vdXNlX3RhcmdldCA9IGV2dC50YXJnZXQgYXMgU1ZHR3JhcGhpY3NFbGVtZW50O1xuICAgIGlmIChtb3VzZV90YXJnZXQuaWQgPT09ICdzdmdyb290Jykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChtb3VzZV90YXJnZXQucGFyZW50Tm9kZSkge1xuICAgICAgbW91c2VfdGFyZ2V0ID0gbW91c2VfdGFyZ2V0LnBhcmVudE5vZGUucGFyZW50Tm9kZSBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgICBpZiAobW91c2VfdGFyZ2V0LmlkID09PSAnc2VsZWN0b3JHcm91cCcpIHtcbiAgICAgICAgcmV0dXJuIG1vdXNlX3RhcmdldDtcbiAgICAgIH1cbiAgICAgIHdoaWxlICghbW91c2VfdGFyZ2V0LmlkLmluY2x1ZGVzKCdpdGVtXycpKSB7XG4gICAgICAgIGlmIChtb3VzZV90YXJnZXQuaWQgPT09ICdzdmdyb290Jykge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIG1vdXNlX3RhcmdldCA9IG1vdXNlX3RhcmdldC5wYXJlbnROb2RlIGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1vdXNlX3RhcmdldDtcbiAgfVxuICBwcml2YXRlIF9zaG93R3JpcHMoYmJveDogRE9NUmVjdCkge1xuICAgIHRoaXMucnViYmVyQm94ID0ge1xuICAgICAgeDogYmJveC54IC0gKCh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoIGFzIG51bWJlcikgfHwgMCkgKiAwLjUsXG4gICAgICB5OiBiYm94LnkgLSAoKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggYXMgbnVtYmVyKSB8fCAwKSAqIDAuNSxcbiAgICAgIHdpZHRoOiBiYm94LndpZHRoICsgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggYXMgbnVtYmVyKSB8fCAwLFxuICAgICAgaGVpZ2h0OiBiYm94LmhlaWdodCArICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoIGFzIG51bWJlcikgfHwgMCxcbiAgICAgIGRpc3BsYXk6ICdibG9jaycsXG4gICAgfTtcbiAgfVxuICBtb3ZlU2VsZWN0KGRvd25FdmVudDogUG9pbnRlckV2ZW50KSB7XG4gICAgbGV0IGlzUG9pbnRlckRvd24gPSB0cnVlO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBkb3duRXZlbnQudGFyZ2V0IGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgKG1vdmVFdmVudCkgPT4ge1xuICAgICAgaWYgKCFpc1BvaW50ZXJEb3duKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5zZWxlY3RlZEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSAobW92ZUV2ZW50IGFzIFBvaW50ZXJFdmVudCkubW92ZW1lbnRYO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IChtb3ZlRXZlbnQgYXMgUG9pbnRlckV2ZW50KS5tb3ZlbWVudFk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCAoKSA9PiB7XG4gICAgICBpc1BvaW50ZXJEb3duID0gZmFsc2U7XG4gICAgfSk7XG4gIH1cbiAgcmVzaXplU2VsZWN0KGRvd25FdmVudDogUG9pbnRlckV2ZW50KSB7XG4gICAgbGV0IGlzUG9pbnRlckRvd24gPSB0cnVlO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBkb3duRXZlbnQudGFyZ2V0IGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIChtb3ZlRXZlbnQpID0+IHtcbiAgICAgIGlmICghaXNQb2ludGVyRG93bikgcmV0dXJuO1xuICAgICAgY29uc3QgZ3JpcCA9IGVsZW1lbnQuaWQuc3BsaXQoJ18nKVsyXTtcbiAgICAgIGNvbnN0IHggPSAobW92ZUV2ZW50IGFzIFBvaW50ZXJFdmVudCkubW92ZW1lbnRYO1xuICAgICAgY29uc3QgeSA9IChtb3ZlRXZlbnQgYXMgUG9pbnRlckV2ZW50KS5tb3ZlbWVudFk7XG4gICAgICBjb25zdCBiYm94ID0gdGhpcy5fZ2V0RWxlbWVudEJib3godGhpcy5zZWxlY3RlZEVsZW1lbnQpO1xuICAgICAgY29uc3Qgd2lkdGggPSBiYm94LndpZHRoO1xuICAgICAgY29uc3QgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICBzd2l0Y2ggKHRoaXMuc2VsZWN0ZWRFbGVtZW50LnR5cGUpIHtcbiAgICAgICAgY2FzZSBFbGVtZW50VHlwZUVudW0uRUxMSVBTRTpcbiAgICAgICAgICB0aGlzLl9yZXNpemVFbGlwc2UoZ3JpcCwgeyB4LCB5LCB3aWR0aCwgaGVpZ2h0IH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEVsZW1lbnRUeXBlRW51bS5MSU5FOlxuICAgICAgICAgIHRoaXMuX3Jlc2l6ZUxpbmUoZ3JpcCwgeyB4LCB5LCB3aWR0aCwgaGVpZ2h0IH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRoaXMuX3Jlc2l6ZURlZmF1bHQoZ3JpcCwgeyB4LCB5LCB3aWR0aCwgaGVpZ2h0IH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdGhpcy5fc2hvd0dyaXBzKHRoaXMuX2dldEVsZW1lbnRCYm94KHRoaXMuc2VsZWN0ZWRFbGVtZW50KSk7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgKCkgPT4ge1xuICAgICAgaXNQb2ludGVyRG93biA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG4gIHByaXZhdGUgX3Jlc2l6ZUxpbmUoZGlyOiBzdHJpbmcsIGJib3g6IEJCb3gpIHtcbiAgICBzd2l0Y2ggKGRpcikge1xuICAgICAgY2FzZSAnbncnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MSBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTEgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbic6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkxIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ25lJzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDIgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkxIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2UnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MiBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzZSc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLngyIGFzIG51bWJlcikgKz0gYmJveC54O1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy55MiBhcyBudW1iZXIpICs9IGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzJzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTIgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3cnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MSBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTIgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndyc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLngxIGFzIG51bWJlcikgKz0gYmJveC54O1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcHJpdmF0ZSBfcmVzaXplRWxpcHNlKGRpcjogc3RyaW5nLCBiYm94OiBCQm94KSB7XG4gICAgc3dpdGNoIChkaXIpIHtcbiAgICAgIGNhc2UgJ253JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgLT0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSAtPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ24nOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgLT0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpICs9IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgLT0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdlJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpICs9IGJib3gueCAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc2UnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueCAvIDI7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnggYXMgbnVtYmVyKSArPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeSBhcyBudW1iZXIpICs9IGJib3gueSAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSArPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3N3JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgLT0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSArPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3cnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgLT0gYmJveC54IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3Jlc2l6ZURlZmF1bHQoZGlyOiBzdHJpbmcsIGJib3g6IEJCb3gpIHtcbiAgICBzd2l0Y2ggKGRpcikge1xuICAgICAgY2FzZSAnbncnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94Lnk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMud2lkdGggPSBiYm94LndpZHRoIC0gYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGJib3guaGVpZ2h0IC0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ24nOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCAtIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCArIGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCAtIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdlJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggKyBiYm94Lng7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc2UnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCArIGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCArIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCArIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCAtIGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCArIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd3JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMud2lkdGggPSBiYm94LndpZHRoIC0gYmJveC54O1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF91bnN1YnNjcmliZShzdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbik6IHZvaWQge1xuICAgIGlmIChzdWJzY3JpcHRpb24pIHtcbiAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgfVxufVxuIiwiPHN2ZyBbY2xhc3NdPVwiJ3N2Z3Jvb3QgJyArIHNlbGVjdGVkVG9vbFwiICNzdmdDb250YWluZXIgaWQ9XCJzdmdyb290XCIgeGxpbmtucz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIj5cbiAgPHN2ZyBpZD1cImNhbnZhc0JhY2tncm91bmRcIiBbYXR0ci53aWR0aF09XCJjYW52YXNXaWR0aCAqIHpvb21cIiBbYXR0ci5oZWlnaHRdPVwiY2FudmFzSGVpZ2h0ICogem9vbVwiIFthdHRyLnhdPVwieFwiXG4gICAgW2F0dHIueV09XCJ5XCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogbm9uZTtcIj5cbiAgICA8ZGVmcyBpZD1cImdyaWQtcGF0dGVyblwiPlxuICAgICAgPHBhdHRlcm4gaWQ9XCJzbWFsbEdyaWRcIiBbYXR0ci53aWR0aF09XCJncmlkU2l6ZVwiIFthdHRyLmhlaWdodF09XCJncmlkU2l6ZVwiIHBhdHRlcm5Vbml0cz1cInVzZXJTcGFjZU9uVXNlXCI+XG4gICAgICAgIDxwYXRoIFthdHRyLmRdPVwiJ00gJytncmlkU2l6ZSsnIDAgSCAwIFYgJytncmlkU2l6ZSsnJ1wiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiZ3JheVwiIHN0cm9rZS13aWR0aD1cIjAuNVwiIC8+XG4gICAgICA8L3BhdHRlcm4+XG4gICAgICA8cGF0dGVybiBpZD1cImdyaWRcIiB3aWR0aD1cIjEwMFwiIGhlaWdodD1cIjEwMFwiIHBhdHRlcm5Vbml0cz1cInVzZXJTcGFjZU9uVXNlXCI+XG4gICAgICAgIDxyZWN0IHdpZHRoPVwiMTAwXCIgaGVpZ2h0PVwiMTAwXCIgZmlsbD1cInVybCgjc21hbGxHcmlkKVwiIC8+XG4gICAgICAgIDxwYXRoIGQ9XCJNIDEwMCAwIEggMCBWIDEwMFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiZ3JheVwiIHN0cm9rZS13aWR0aD1cIjJcIiAvPlxuICAgICAgPC9wYXR0ZXJuPlxuICAgIDwvZGVmcz5cbiAgICA8ZGVmcyBpZD1cInBsYWNlaG9sZGVyX2RlZnNcIj48L2RlZnM+XG4gICAgPHJlY3Qgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiIHg9XCIwXCIgeT1cIjBcIiBzdHJva2Utd2lkdGg9XCIwXCIgc3Ryb2tlPVwidHJhbnNwYXJlbnRcIiBbYXR0ci5maWxsXT1cImJhY2tncm91bmRDb2xvclwiXG4gICAgICBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBub25lO1wiPjwvcmVjdD5cbiAgICA8ZyAqbmdJZj1cImVuYWJsZUdyaWRcIj5cbiAgICAgIDxyZWN0IHg9XCItMTAwXCIgeT1cIi0xMDBcIiBbYXR0ci53aWR0aF09XCIoY2FudmFzV2lkdGggKiB6b29tKSArIDEwMCoyXCIgW2F0dHIuaGVpZ2h0XT1cIihjYW52YXNIZWlnaHQgKiB6b29tKSArIDEwMCoyXCJcbiAgICAgICAgZmlsbD1cInVybCgjZ3JpZClcIiAvPlxuICAgIDwvZz5cbiAgPC9zdmc+XG4gIDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIFthdHRyLndpZHRoXT1cImNhbnZhc1dpZHRoICogem9vbVwiIFthdHRyLmhlaWdodF09XCJjYW52YXNIZWlnaHQgKiB6b29tXCJcbiAgICBbYXR0ci52aWV3Qm94XT1cIlswLCAwLCBjYW52YXNXaWR0aCwgY2FudmFzSGVpZ2h0XVwiIGlkPVwic3ZnY29udGVudFwiIFthdHRyLnhdPVwieFwiIFthdHRyLnldPVwieVwiPlxuICAgIDxyZWN0IGlkPVwiY29udGVudEJhY2tncm91bmRcIiBvcGFjaXR5PVwiMFwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB4PVwiMFwiIHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiXG4gICAgICBzdHJva2U9XCJ0cmFuc3BhcmVudFwiIFthdHRyLmZpbGxdPVwiYmFja2dyb3VuZENvbG9yXCI+PC9yZWN0PlxuICAgIDxnIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGFsbDtcIj5cbiAgICAgIDx0aXRsZSBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiPldoaXRlYm9hcmQ8L3RpdGxlPlxuICAgICAgPG5nLWNvbnRhaW5lciAqbmdGb3I9XCJsZXQgaXRlbSBvZiBkYXRhXCI+XG4gICAgICAgIDxnIGNsYXNzPVwid2JfZWxlbWVudFwiIFtpZF09XCInaXRlbV8nICsgaXRlbS5pZFwiIFthdHRyLmRhdGEtd2ItaWRdPVwiaXRlbS5pZFwiIFtuZ1N3aXRjaF09XCJpdGVtLnR5cGVcIlxuICAgICAgICAgIFthdHRyLnRyYW5zZm9ybV09XCIndHJhbnNsYXRlKCcgKyBpdGVtLnggKyAnLCcgKyBpdGVtLnkgKyAnKScgKyAncm90YXRlKCcgKyBpdGVtLnJvdGF0aW9uICsgJyknXCJcbiAgICAgICAgICBbYXR0ci5vcGFjaXR5XT1cIml0ZW0ub3BhY2l0eSAvIDEwMFwiPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5CUlVTSFwiPlxuICAgICAgICAgICAgPHBhdGggY2xhc3M9XCJicnVzaFwiIGZpbGw9XCJub25lXCIgW2F0dHIuZF09XCJpdGVtLnZhbHVlXCIgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJpdGVtLm9wdGlvbnMubGluZUNhcFwiIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJpdGVtLm9wdGlvbnMubGluZUpvaW5cIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9wYXRoPlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuSU1BR0VcIj5cbiAgICAgICAgICAgIDxpbWFnZSBbYXR0ci5oZWlnaHRdPVwiaXRlbS5vcHRpb25zLmhlaWdodFwiIFthdHRyLndpZHRoXT1cIml0ZW0ub3B0aW9ucy53aWR0aFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJub25lXCJcbiAgICAgICAgICAgICAgW2F0dHIueGxpbms6aHJlZl09XCJpdGVtLnZhbHVlXCIgW2F0dHIuaHJlZl09XCJpdGVtLnZhbHVlXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwiaXRlbS5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLmZpbGxdPVwiaXRlbS5vcHRpb25zLmZpbGxcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIj48L2ltYWdlPlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuTElORVwiPlxuICAgICAgICAgICAgPGxpbmUgY2xhc3M9XCJsaW5lXCIgW2F0dHIueDFdPVwiaXRlbS5vcHRpb25zLngxXCIgW2F0dHIueTFdPVwiaXRlbS5vcHRpb25zLnkxXCIgW2F0dHIueDJdPVwiaXRlbS5vcHRpb25zLngyXCJcbiAgICAgICAgICAgICAgW2F0dHIueTJdPVwiaXRlbS5vcHRpb25zLnkyXCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VXaWR0aFwiIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cIml0ZW0ub3B0aW9ucy5saW5lQ2FwXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cIml0ZW0ub3B0aW9ucy5saW5lSm9pblwiIFthdHRyLnN0cm9rZV09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L2xpbmU+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5SRUNUXCI+XG4gICAgICAgICAgICA8cmVjdCBjbGFzcz1cInJlY3RcIiBbYXR0ci54XT1cIml0ZW0ub3B0aW9ucy54MlwiIFthdHRyLnldPVwiaXRlbS5vcHRpb25zLnkyXCIgW2F0dHIucnhdPVwiaXRlbS5vcHRpb25zLnJ4XCJcbiAgICAgICAgICAgICAgW2F0dHIud2lkdGhdPVwiaXRlbS5vcHRpb25zLndpZHRoXCIgW2F0dHIuaGVpZ2h0XT1cIml0ZW0ub3B0aW9ucy5oZWlnaHRcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCJpdGVtLm9wdGlvbnMuZGFzaG9mZnNldFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5maWxsXT1cIml0ZW0ub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiPjwvcmVjdD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLkVMTElQU0VcIj5cbiAgICAgICAgICAgIDxlbGxpcHNlIFthdHRyLmN4XT1cIml0ZW0ub3B0aW9ucy5jeFwiIFthdHRyLmN5XT1cIml0ZW0ub3B0aW9ucy5jeVwiIFthdHRyLnJ4XT1cIml0ZW0ub3B0aW9ucy5yeFwiXG4gICAgICAgICAgICAgIFthdHRyLnJ5XT1cIml0ZW0ub3B0aW9ucy5yeVwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJpdGVtLm9wdGlvbnMubGluZUNhcFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJpdGVtLm9wdGlvbnMubGluZUpvaW5cIiBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCJcbiAgICAgICAgICAgICAgW2F0dHIuZmlsbF09XCJpdGVtLm9wdGlvbnMuZmlsbFwiPjwvZWxsaXBzZT5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLlRFWFRcIj5cbiAgICAgICAgICAgIDx0ZXh0IGNsYXNzPVwidGV4dF9lbGVtZW50XCIgdGV4dC1hbmNob3I9XCJzdGFydFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCIgW2F0dHIueF09XCJpdGVtLm9wdGlvbnMubGVmdFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwiaXRlbS5vcHRpb25zLnRvcFwiIFthdHRyLndpZHRoXT1cIml0ZW0ub3B0aW9ucy53aWR0aFwiIFthdHRyLmhlaWdodF09XCJpdGVtLm9wdGlvbnMuaGVpZ2h0XCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIiBbYXR0ci5mb250LXNpemVdPVwiaXRlbS5vcHRpb25zLmZvbnRTaXplXCJcbiAgICAgICAgICAgICAgW2F0dHIuZm9udC1mYW1pbHldPVwiaXRlbS5vcHRpb25zLmZvbnRGYW1pbHlcIiBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cIml0ZW0ub3B0aW9ucy5saW5lQ2FwXCIgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cIml0ZW0ub3B0aW9ucy5saW5lSm9pblwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlQ29sb3JcIiBbYXR0ci5maWxsXT1cIml0ZW0ub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICAgICAgW2F0dHIuZm9udC1zdHlsZV09XCJpdGVtLm9wdGlvbnMuZm9udFN0eWxlXCIgW2F0dHIuZm9udC13ZWlnaHRdPVwiaXRlbS5vcHRpb25zLmZvbnRXZWlnaHRcIj5cbiAgICAgICAgICAgICAge3sgaXRlbS52YWx1ZSB9fVxuICAgICAgICAgICAgPC90ZXh0PlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hEZWZhdWx0PlxuICAgICAgICAgICAgPHRleHQ+Tm90IGRlZmluZWQgdHlwZTwvdGV4dD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgIDwvZz5cbiAgICAgIDwvbmctY29udGFpbmVyPlxuICAgICAgPGcgY2xhc3M9XCJ0ZW1wLWVsZW1lbnRcIiAqbmdJZj1cInRlbXBFbGVtZW50XCIgIFtuZ1N3aXRjaF09XCJzZWxlY3RlZFRvb2xcIj5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0b29scy5CUlVTSFwiPlxuICAgICAgICA8cGF0aCBjbGFzcz1cImJydXNoXCIgZmlsbD1cIm5vbmVcIiBbYXR0ci5kXT1cInRlbXBFbGVtZW50LnZhbHVlXCIgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVDYXBcIiBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lSm9pblwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L3BhdGg+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuSU1BR0VcIj5cbiAgICAgICAgPGltYWdlIFthdHRyLmhlaWdodF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmhlaWdodFwiIFthdHRyLndpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMud2lkdGhcIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPVwibm9uZVwiXG4gICAgICAgICAgW2F0dHIueGxpbms6aHJlZl09XCJ0ZW1wRWxlbWVudC52YWx1ZVwiIFthdHRyLmhyZWZdPVwidGVtcEVsZW1lbnQudmFsdWVcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLmZpbGxdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2VdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VDb2xvclwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCI+PC9pbWFnZT5cbiAgICAgIDwvZz5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5MSU5FXCI+XG4gICAgICAgIDxsaW5lIGNsYXNzPVwibGluZVwiIFthdHRyLngxXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueDFcIiBbYXR0ci55MV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnkxXCIgW2F0dHIueDJdPVwidGVtcEVsZW1lbnQub3B0aW9ucy54MlwiXG4gICAgICAgICAgW2F0dHIueTJdPVwidGVtcEVsZW1lbnQub3B0aW9ucy55MlwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVDYXBcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVKb2luXCIgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L2xpbmU+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuUkVDVFwiPlxuICAgICAgICA8cmVjdCBjbGFzcz1cInJlY3RcIiBbYXR0ci54XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueDJcIiBbYXR0ci55XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueTJcIiBbYXR0ci5yeF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnJ4XCJcbiAgICAgICAgICBbYXR0ci53aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoXCIgW2F0dHIuaGVpZ2h0XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNob2Zmc2V0XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiIFthdHRyLmZpbGxdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2VdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VDb2xvclwiPjwvcmVjdD5cbiAgICAgIDwvZz5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5FTExJUFNFXCI+XG4gICAgICAgIDxlbGxpcHNlIFthdHRyLmN4XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuY3hcIiBbYXR0ci5jeV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmN5XCIgW2F0dHIucnhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5yeFwiXG4gICAgICAgICAgW2F0dHIucnldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5yeVwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVDYXBcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVKb2luXCIgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIlxuICAgICAgICAgIFthdHRyLmZpbGxdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5maWxsXCI+PC9lbGxpcHNlPlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLlRFWFRcIj5cbiAgICAgICAgPHRleHQgY2xhc3M9XCJ0ZXh0X2VsZW1lbnRcIiB0ZXh0LWFuY2hvcj1cInN0YXJ0XCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIiBbYXR0ci54XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGVmdFwiXG4gICAgICAgICAgW2F0dHIueV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnRvcFwiIFthdHRyLndpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMud2lkdGhcIiBbYXR0ci5oZWlnaHRdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5oZWlnaHRcIlxuICAgICAgICAgIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCIgW2F0dHIuZm9udC1zaXplXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZm9udFNpemVcIlxuICAgICAgICAgIFthdHRyLmZvbnQtZmFtaWx5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZm9udEZhbWlseVwiIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNoYXJyYXlcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lQ2FwXCIgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUpvaW5cIlxuICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCIgW2F0dHIuZmlsbF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZpbGxcIlxuICAgICAgICAgIFthdHRyLmZvbnQtc3R5bGVdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5mb250U3R5bGVcIiBbYXR0ci5mb250LXdlaWdodF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZvbnRXZWlnaHRcIj5cbiAgICAgICAgICB7eyB0ZW1wRWxlbWVudC52YWx1ZSB9fVxuICAgICAgICA8L3RleHQ+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hEZWZhdWx0PlxuICAgICAgICA8dGV4dD5Ob3QgZGVmaW5lZCB0eXBlPC90ZXh0PlxuICAgICAgPC9nPlxuICAgIDwvZz5cbiAgICAgIDxnIGlkPVwic2VsZWN0b3JQYXJlbnRHcm91cFwiICpuZ0lmPVwic2VsZWN0ZWRFbGVtZW50XCI+XG4gICAgICAgIDxnIGNsYXNzPVwic2VsZWN0b3JHcm91cFwiIGlkPVwic2VsZWN0b3JHcm91cFwiIHRyYW5zZm9ybT1cIlwiIFtzdHlsZS5kaXNwbGF5XT1cInJ1YmJlckJveC5kaXNwbGF5XCJcbiAgICAgICAgICBbYXR0ci50cmFuc2Zvcm1dPVwiJ3RyYW5zbGF0ZSgnICsgc2VsZWN0ZWRFbGVtZW50LnggKyAnLCcgKyBzZWxlY3RlZEVsZW1lbnQueSArICcpJyArICdyb3RhdGUoJyArIHNlbGVjdGVkRWxlbWVudC5yb3RhdGlvbiArICcpJ1wiPlxuICAgICAgICAgIDxnIGRpc3BsYXk9XCJpbmxpbmVcIj5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0ZWRCb3hcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cIiM0RjgwRkZcIiBzaGFwZS1yZW5kZXJpbmc9XCJjcmlzcEVkZ2VzXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogbm9uZTtcIiBbYXR0ci54XT1cInJ1YmJlckJveC54XCIgW2F0dHIueV09XCJydWJiZXJCb3gueVwiIFthdHRyLndpZHRoXT1cInJ1YmJlckJveC53aWR0aFwiXG4gICAgICAgICAgICAgIFthdHRyLmhlaWdodF09XCJydWJiZXJCb3guaGVpZ2h0XCIgc3R5bGU9XCJjdXJzb3I6IG1vdmU7XCIgKHBvaW50ZXJkb3duKT1cIm1vdmVTZWxlY3QoJGV2ZW50KVwiPlxuICAgICAgICAgICAgPC9yZWN0PlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyBkaXNwbGF5PVwiaW5saW5lXCI+XG4gICAgICAgICAgICA8Y2lyY2xlIGNsYXNzPVwic2VsZWN0b3Jfcm90YXRlXCIgaWQ9XCJzZWxlY3RvckdyaXBfcm90YXRlX253XCIgZmlsbD1cIiMwMDBcIiByPVwiOFwiIHN0cm9rZT1cIiMwMDBcIiBmaWxsLW9wYWNpdHk9XCIwXCJcbiAgICAgICAgICAgICAgc3Ryb2tlLW9wYWNpdHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiIFthdHRyLmN4XT1cInJ1YmJlckJveC54IC0gNFwiIFthdHRyLmN5XT1cInJ1YmJlckJveC55IC0gNFwiPjwvY2lyY2xlPlxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cInNlbGVjdG9yX3JvdGF0ZVwiIGlkPVwic2VsZWN0b3JHcmlwX3JvdGF0ZV9uZVwiIGZpbGw9XCIjMDAwXCIgcj1cIjhcIiBzdHJva2U9XCIjMDAwXCIgZmlsbC1vcGFjaXR5PVwiMFwiXG4gICAgICAgICAgICAgIHN0cm9rZS1vcGFjaXR5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIiBbYXR0ci5jeF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCArIDRcIlxuICAgICAgICAgICAgICBbYXR0ci5jeV09XCJydWJiZXJCb3gueSAtIDRcIj5cbiAgICAgICAgICAgIDwvY2lyY2xlPlxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cInNlbGVjdG9yX3JvdGF0ZVwiIGlkPVwic2VsZWN0b3JHcmlwX3JvdGF0ZV9zZVwiIGZpbGw9XCIjMDAwXCIgcj1cIjhcIiBzdHJva2U9XCIjMDAwXCIgZmlsbC1vcGFjaXR5PVwiMFwiXG4gICAgICAgICAgICAgIHN0cm9rZS1vcGFjaXR5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIiBbYXR0ci5jeF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCArIDRcIlxuICAgICAgICAgICAgICBbYXR0ci5jeV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgKyA0XCI+PC9jaXJjbGU+XG4gICAgICAgICAgICA8Y2lyY2xlIGNsYXNzPVwic2VsZWN0b3Jfcm90YXRlXCIgaWQ9XCJzZWxlY3RvckdyaXBfcm90YXRlX3N3XCIgZmlsbD1cIiMwMDBcIiByPVwiOFwiIHN0cm9rZT1cIiMwMDBcIiBmaWxsLW9wYWNpdHk9XCIwXCJcbiAgICAgICAgICAgICAgc3Ryb2tlLW9wYWNpdHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiIFthdHRyLmN4XT1cInJ1YmJlckJveC54IC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLmN5XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCArIDRcIj5cbiAgICAgICAgICAgIDwvY2lyY2xlPlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX253XCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBudy1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54IC0gNFwiIFthdHRyLnldPVwicnViYmVyQm94LnkgLSA0XCJcbiAgICAgICAgICAgICAgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+XG4gICAgICAgICAgICA8L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfblwiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogbi1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoIC8gMiAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55IC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9uZVwiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogbmUtcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55IC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9lXCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBlLXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLyAyIC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9zZVwiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogc2UtcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfc1wiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogcy1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoIC8gMiAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfc3dcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IHN3LXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX3dcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IHctcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCAvIDIgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgPC9nPlxuICAgICAgPC9nPlxuICAgIDwvZz5cbiAgPC9zdmc+XG48L3N2Zz5cblxuPGRpdiBbc3R5bGVdPVwiJ2ZvbnQtZmFtaWx5OicgKyBmb250RmFtaWx5ICsgJzsnICsgJ2ZvbnQtc2l6ZTonICsgZm9udFNpemUgKyAncHg7Jytcbidwb2ludGVyLWV2ZW50czogbm9uZTsgd2lkdGg6ICcgKyBjYW52YXNXaWR0aCAqIHpvb20gKyAncHg7ICcrXG4gICdoZWlnaHQ6ICcgKyBjYW52YXNIZWlnaHQgKiB6b29tICsgJ3B4OycgK1xuICAncG9zaXRpb246IGFic29sdXRlOyB0b3A6ICcgKyB5ICsgJ3B4OyBsZWZ0OiAnICsgeCArICdweDsnXCIgKm5nSWY9XCJ0ZW1wRWxlbWVudCAmJiBzZWxlY3RlZFRvb2wgPT09IHRvb2xzLlRFWFRcIj5cbiAgPGlucHV0ICN0ZXh0SW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cInRleHQtaW5wdXRcIiBbc3R5bGVdPVwiJ3dpZHRoOiAnICsgdGV4dElucHV0LnZhbHVlLmxlbmd0aCArICdjaDsgJytcbiAgICAnaGVpZ2h0OiAnICsgKDIgKiB6b29tKSArICdjaDsnK1xuICAgICd0b3A6ICcgKyAoKHRlbXBFbGVtZW50Lm9wdGlvbnMudG9wIHx8IDAgLSAxMCkgKiB6b29tKSArICdweDsnICtcbiAgICAnbGVmdDogJyArICgodGVtcEVsZW1lbnQub3B0aW9ucy5sZWZ0IHx8IDAgKyAzKSogem9vbSkgKyAncHg7J1xuICAgIFwiIChpbnB1dCk9XCJ1cGRhdGVUZXh0SXRlbSh0ZXh0SW5wdXQudmFsdWUpXCIgYXV0b2ZvY3VzIC8+XG48L2Rpdj4iXX0=