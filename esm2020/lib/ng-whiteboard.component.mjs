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
            console.log('108', localStorage.getItem(`whitebaord_${this.persistenceId}`) || 'null');
            const stored = JSON.parse(localStorage.getItem(`whitebaord_${this.persistenceId}`) || 'null');
            if (stored) {
                this._data.next(stored.data || []);
                this.undoStack = stored.undoStack || [];
                this.redoStack = stored.redoStack || [];
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
            console.log('227', localStorage.getItem(`whitebaord_${this.persistenceId}`) || '{}');
            let stored = JSON.parse(localStorage.getItem(`whitebaord_${this.persistenceId}`) || '{}');
            stored.data = data;
            localStorage.setItem(`whitebaord_${this.persistenceId}`, JSON.stringify(stored));
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
        this.data = JSON.parse(JSON.stringify(this._initialData));
        this.updateLocalStorage();
    }
    updateLocalStorage() {
        const storageObject = { data: this.data, undoStack: this.undoStack, redoStack: this.redoStack };
        localStorage.setItem(`whitebaord_${this.persistenceId}`, JSON.stringify(storageObject));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctd2hpdGVib2FyZC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFpQixTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBYSxNQUFNLEVBQUUsWUFBWSxFQUFvQyxNQUFNLGVBQWUsQ0FBQztBQUMxSixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQWdCLFNBQVMsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUEwQixXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSxVQUFVLENBQUM7QUFDM0osT0FBTyxFQUFvQixVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFhLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQzs7OztBQUkvRixNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7QUFNeEMsTUFBTSxPQUFPLHFCQUFxQjtJQXNGaEMsWUFBb0IsaUJBQXNDO1FBQXRDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUI7UUFqRmxELFVBQUssR0FBeUMsSUFBSSxlQUFlLENBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBdUIxRixtQkFBYyxHQUFHLElBQUksQ0FBQztRQUN0QixnQkFBVyxHQUFHLEdBQUcsQ0FBQztRQUNsQixpQkFBWSxHQUFHLEdBQUcsQ0FB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YztzQkFBdEIsS0FBSztnQkFDRyxXQUFXO3NCQUFuQixLQUFLO2dCQUNHLFlBQVk7c0JBQXBCLEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxNQUFNO3NCQUFkLEtBQUs7Z0JBQ0csV0FBVztzQkFBbkIsS0FBSztnQkFDRyxXQUFXO3NCQUFuQixLQUFLO2dCQUNHLGVBQWU7c0JBQXZCLEtBQUs7Z0JBQ0csUUFBUTtzQkFBaEIsS0FBSztnQkFDRyxPQUFPO3NCQUFmLEtBQUs7Z0JBQ0csSUFBSTtzQkFBWixLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUNHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUNHLENBQUM7c0JBQVQsS0FBSztnQkFDRyxDQUFDO3NCQUFULEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBQ0csYUFBYTtzQkFBckIsS0FBSztnQkFFSSxLQUFLO3NCQUFkLE1BQU07Z0JBQ0csVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyxLQUFLO3NCQUFkLE1BQU07Z0JBQ0csSUFBSTtzQkFBYixNQUFNO2dCQUNHLElBQUk7c0JBQWIsTUFBTTtnQkFDRyxJQUFJO3NCQUFiLE1BQU07Z0JBQ0csVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyxhQUFhO3NCQUF0QixNQUFNO2dCQUNHLGFBQWE7c0JBQXRCLE1BQU07Z0JBQ0csV0FBVztzQkFBcEIsTUFBTSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgQWZ0ZXJWaWV3SW5pdCwgVmlld0NoaWxkLCBJbnB1dCwgRWxlbWVudFJlZiwgT25EZXN0cm95LCBPdXRwdXQsIEV2ZW50RW1pdHRlciwgT25DaGFuZ2VzLCBPbkluaXQsIFNpbXBsZUNoYW5nZXMgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IE5nV2hpdGVib2FyZFNlcnZpY2UgfSBmcm9tICcuL25nLXdoaXRlYm9hcmQuc2VydmljZSc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIGZyb21FdmVudCwgc2tpcCwgQmVoYXZpb3JTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBFbGVtZW50VHlwZUVudW0sIEZvcm1hdFR5cGUsIGZvcm1hdFR5cGVzLCBJQWRkSW1hZ2UsIExpbmVDYXBFbnVtLCBMaW5lSm9pbkVudW0sIFRvb2xzRW51bSwgV2hpdGVib2FyZEVsZW1lbnQsIFdoaXRlYm9hcmRPcHRpb25zIH0gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHsgQ29udGFpbmVyRWxlbWVudCwgY3VydmVCYXNpcywgZHJhZywgbGluZSwgbW91c2UsIHNlbGVjdCwgU2VsZWN0aW9uLCBldmVudCB9IGZyb20gJ2QzJztcblxudHlwZSBCQm94ID0geyB4OiBudW1iZXI7IHk6IG51bWJlcjsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfTtcblxuY29uc3QgZDNMaW5lID0gbGluZSgpLmN1cnZlKGN1cnZlQmFzaXMpO1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnbmctd2hpdGVib2FyZCcsXG4gIHRlbXBsYXRlVXJsOiAnLi9uZy13aGl0ZWJvYXJkLmNvbXBvbmVudC5odG1sJyxcbiAgc3R5bGVVcmxzOiBbJy4vbmctd2hpdGVib2FyZC5jb21wb25lbnQuc2NzcyddLFxufSlcbmV4cG9ydCBjbGFzcyBOZ1doaXRlYm9hcmRDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uQ2hhbmdlcywgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95IHtcbiAgQFZpZXdDaGlsZCgnc3ZnQ29udGFpbmVyJywgeyBzdGF0aWM6IGZhbHNlIH0pXG4gIHN2Z0NvbnRhaW5lciE6IEVsZW1lbnRSZWY8Q29udGFpbmVyRWxlbWVudD47XG4gIEBWaWV3Q2hpbGQoJ3RleHRJbnB1dCcsIHsgc3RhdGljOiBmYWxzZSB9KSBwcml2YXRlIHRleHRJbnB1dCE6IEVsZW1lbnRSZWY8SFRNTElucHV0RWxlbWVudD47XG5cbiAgcHJpdmF0ZSBfZGF0YTogQmVoYXZpb3JTdWJqZWN0PFdoaXRlYm9hcmRFbGVtZW50W10+ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxXaGl0ZWJvYXJkRWxlbWVudFtdPihbXSk7XG5cbiAgQElucHV0KCkgc2V0IGRhdGEoZGF0YTogV2hpdGVib2FyZEVsZW1lbnRbXSkge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICB0aGlzLl9kYXRhLm5leHQoZGF0YSk7XG4gICAgfVxuICB9XG4gIGdldCBkYXRhKCk6IFdoaXRlYm9hcmRFbGVtZW50W10ge1xuICAgIHJldHVybiB0aGlzLl9kYXRhLmdldFZhbHVlKCk7XG4gIH1cblxuICBASW5wdXQoKSBvcHRpb25zITogV2hpdGVib2FyZE9wdGlvbnM7XG5cbiAgQElucHV0KCkgc2V0IHNlbGVjdGVkVG9vbCh0b29sOiBUb29sc0VudW0pIHtcbiAgICBpZiAodGhpcy5fc2VsZWN0ZWRUb29sICE9PSB0b29sKSB7XG4gICAgICB0aGlzLl9zZWxlY3RlZFRvb2wgPSB0b29sO1xuICAgICAgdGhpcy50b29sQ2hhbmdlZC5lbWl0KHRvb2wpO1xuICAgICAgdGhpcy5jbGVhclNlbGVjdGVkRWxlbWVudCgpO1xuICAgIH1cbiAgfVxuICBnZXQgc2VsZWN0ZWRUb29sKCk6IFRvb2xzRW51bSB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbGVjdGVkVG9vbDtcbiAgfVxuICBASW5wdXQoKSBkcmF3aW5nRW5hYmxlZCA9IHRydWU7XG4gIEBJbnB1dCgpIGNhbnZhc1dpZHRoID0gODAwO1xuICBASW5wdXQoKSBjYW52YXNIZWlnaHQgPSA2MDA7XG4gIEBJbnB1dCgpIGZ1bGxTY3JlZW4gPSB0cnVlO1xuICBASW5wdXQoKSBjZW50ZXIgPSB0cnVlO1xuICBASW5wdXQoKSBzdHJva2VDb2xvciA9ICcjMDAwJztcbiAgQElucHV0KCkgc3Ryb2tlV2lkdGggPSAyO1xuICBASW5wdXQoKSBiYWNrZ3JvdW5kQ29sb3IgPSAnI2ZmZic7XG4gIEBJbnB1dCgpIGxpbmVKb2luID0gTGluZUpvaW5FbnVtLlJPVU5EO1xuICBASW5wdXQoKSBsaW5lQ2FwID0gTGluZUNhcEVudW0uUk9VTkQ7XG4gIEBJbnB1dCgpIGZpbGwgPSAnIzMzMyc7XG4gIEBJbnB1dCgpIHpvb20gPSAxO1xuICBASW5wdXQoKSBmb250RmFtaWx5ID0gJ3NhbnMtc2VyaWYnO1xuICBASW5wdXQoKSBmb250U2l6ZSA9IDI0O1xuICBASW5wdXQoKSBkYXNoYXJyYXkgPSAnJztcbiAgQElucHV0KCkgZGFzaG9mZnNldCA9IDA7XG4gIEBJbnB1dCgpIHggPSAwO1xuICBASW5wdXQoKSB5ID0gMDtcbiAgQElucHV0KCkgZW5hYmxlR3JpZCA9IGZhbHNlO1xuICBASW5wdXQoKSBncmlkU2l6ZSA9IDEwO1xuICBASW5wdXQoKSBzbmFwVG9HcmlkID0gZmFsc2U7XG4gIEBJbnB1dCgpIHBlcnNpc3RlbmNlSWQ6IHN0cmluZ3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgQE91dHB1dCgpIHJlYWR5ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZGF0YUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8V2hpdGVib2FyZEVsZW1lbnRbXT4oKTtcbiAgQE91dHB1dCgpIGNsZWFyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgdW5kbyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIHJlZG8gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBzYXZlID0gbmV3IEV2ZW50RW1pdHRlcjxzdHJpbmc+KCk7XG4gIEBPdXRwdXQoKSBpbWFnZUFkZGVkID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgc2VsZWN0RWxlbWVudCA9IG5ldyBFdmVudEVtaXR0ZXI8V2hpdGVib2FyZEVsZW1lbnQgfCBudWxsPigpO1xuICBAT3V0cHV0KCkgZGVsZXRlRWxlbWVudCA9IG5ldyBFdmVudEVtaXR0ZXI8V2hpdGVib2FyZEVsZW1lbnQ+KCk7XG4gIEBPdXRwdXQoKSB0b29sQ2hhbmdlZCA9IG5ldyBFdmVudEVtaXR0ZXI8VG9vbHNFbnVtPigpO1xuXG4gIHByaXZhdGUgc2VsZWN0aW9uITogU2VsZWN0aW9uPEVsZW1lbnQsIHVua25vd24sIG51bGwsIHVuZGVmaW5lZD47XG5cbiAgcHJpdmF0ZSBfc3Vic2NyaXB0aW9uTGlzdDogU3Vic2NyaXB0aW9uW10gPSBbXTtcblxuICBwcml2YXRlIF9pbml0aWFsRGF0YTogV2hpdGVib2FyZEVsZW1lbnRbXSA9IFtdO1xuICBwcml2YXRlIHVuZG9TdGFjazogV2hpdGVib2FyZEVsZW1lbnRbXVtdID0gW107XG4gIHByaXZhdGUgcmVkb1N0YWNrOiBXaGl0ZWJvYXJkRWxlbWVudFtdW10gPSBbXTtcbiAgcHJpdmF0ZSBfc2VsZWN0ZWRUb29sOiBUb29sc0VudW0gPSBUb29sc0VudW0uQlJVU0g7XG4gIHNlbGVjdGVkRWxlbWVudCE6IFdoaXRlYm9hcmRFbGVtZW50O1xuXG4gIHR5cGVzID0gRWxlbWVudFR5cGVFbnVtO1xuICB0b29scyA9IFRvb2xzRW51bTtcblxuICB0ZW1wRWxlbWVudCE6IFdoaXRlYm9hcmRFbGVtZW50O1xuICB0ZW1wRHJhdyE6IFtudW1iZXIsIG51bWJlcl1bXTtcblxuICBydWJiZXJCb3ggPSB7XG4gICAgeDogMCxcbiAgICB5OiAwLFxuICAgIHdpZHRoOiAwLFxuICAgIGhlaWdodDogMCxcbiAgICBkaXNwbGF5OiAnbm9uZScsXG4gIH07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB3aGl0ZWJvYXJkU2VydmljZTogTmdXaGl0ZWJvYXJkU2VydmljZSkge31cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLl9pbml0SW5wdXRzRnJvbU9wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLl9pbml0T2JzZXJ2YWJsZXMoKTtcbiAgICB0aGlzLl9pbml0aWFsRGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5kYXRhKSk7XG4gICAgaWYgKHRoaXMucGVyc2lzdGVuY2VJZCkge1xuICAgICAgY29uc29sZS5sb2coJzEwOCcsIGxvY2FsU3RvcmFnZS5nZXRJdGVtKGB3aGl0ZWJhb3JkXyR7dGhpcy5wZXJzaXN0ZW5jZUlkfWApfHwnbnVsbCcpO1xuICAgICAgY29uc3Qgc3RvcmVkID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShgd2hpdGViYW9yZF8ke3RoaXMucGVyc2lzdGVuY2VJZH1gKXx8J251bGwnKTtcblxuICAgICAgaWYgKHN0b3JlZCkge1xuICAgICAgICB0aGlzLl9kYXRhLm5leHQoc3RvcmVkLmRhdGEgfHwgW10pO1xuICAgICAgICB0aGlzLnVuZG9TdGFjayA9IHN0b3JlZC51bmRvU3RhY2sgfHwgW107XG4gICAgICAgIHRoaXMucmVkb1N0YWNrID0gc3RvcmVkLnJlZG9TdGFjayB8fCBbXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKTogdm9pZCB7XG4gICAgaWYgKGNoYW5nZXNbJ29wdGlvbnMnXSkge1xuICAgICAgLy8mJiAhaXNFcXVhbChjaGFuZ2VzLm9wdGlvbnMuY3VycmVudFZhbHVlLCBjaGFuZ2VzLm9wdGlvbnMucHJldmlvdXNWYWx1ZSlcbiAgICAgIHRoaXMuX2luaXRJbnB1dHNGcm9tT3B0aW9ucyhjaGFuZ2VzWydvcHRpb25zJ10uY3VycmVudFZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgdGhpcy5zZWxlY3Rpb24gPSBzZWxlY3Q8RWxlbWVudCwgdW5rbm93bj4odGhpcy5zdmdDb250YWluZXIubmF0aXZlRWxlbWVudCk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnJlc2l6ZVNjcmVlbigpO1xuICAgIH0sIDApO1xuICAgIHRoaXMuaW5pdGFsaXplRXZlbnRzKHRoaXMuc2VsZWN0aW9uKTtcbiAgICB0aGlzLnJlYWR5LmVtaXQoKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QuZm9yRWFjaCgoc3Vic2NyaXB0aW9uKSA9PiB0aGlzLl91bnN1YnNjcmliZShzdWJzY3JpcHRpb24pKTtcbiAgfVxuXG4gIHByaXZhdGUgX2luaXRJbnB1dHNGcm9tT3B0aW9ucyhvcHRpb25zOiBXaGl0ZWJvYXJkT3B0aW9ucyk6IHZvaWQge1xuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICBpZiAob3B0aW9ucy5kcmF3aW5nRW5hYmxlZCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5kcmF3aW5nRW5hYmxlZCA9IG9wdGlvbnMuZHJhd2luZ0VuYWJsZWQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5zZWxlY3RlZFRvb2wgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRUb29sID0gb3B0aW9ucy5zZWxlY3RlZFRvb2w7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5jYW52YXNXaWR0aCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jYW52YXNXaWR0aCA9IG9wdGlvbnMuY2FudmFzV2lkdGg7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5jYW52YXNIZWlnaHQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuY2FudmFzSGVpZ2h0ID0gb3B0aW9ucy5jYW52YXNIZWlnaHQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5mdWxsU2NyZWVuICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmZ1bGxTY3JlZW4gPSBvcHRpb25zLmZ1bGxTY3JlZW47XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5jZW50ZXIgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuY2VudGVyID0gb3B0aW9ucy5jZW50ZXI7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5zdHJva2VDb2xvciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5zdHJva2VDb2xvciA9IG9wdGlvbnMuc3Ryb2tlQ29sb3I7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5zdHJva2VXaWR0aCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5zdHJva2VXaWR0aCA9IG9wdGlvbnMuc3Ryb2tlV2lkdGg7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5iYWNrZ3JvdW5kQ29sb3IgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gb3B0aW9ucy5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5saW5lSm9pbiAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5saW5lSm9pbiA9IG9wdGlvbnMubGluZUpvaW47XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5saW5lQ2FwICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmxpbmVDYXAgPSBvcHRpb25zLmxpbmVDYXA7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5maWxsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmZpbGwgPSBvcHRpb25zLmZpbGw7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy56b29tICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnpvb20gPSBvcHRpb25zLnpvb207XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5mb250RmFtaWx5ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmZvbnRGYW1pbHkgPSBvcHRpb25zLmZvbnRGYW1pbHk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5mb250U2l6ZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5mb250U2l6ZSA9IG9wdGlvbnMuZm9udFNpemU7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5kYXNoYXJyYXkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZGFzaGFycmF5ID0gb3B0aW9ucy5kYXNoYXJyYXk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5kYXNob2Zmc2V0ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmRhc2hvZmZzZXQgPSBvcHRpb25zLmRhc2hvZmZzZXQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy54ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnggPSBvcHRpb25zLng7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy55ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnkgPSBvcHRpb25zLnk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5lbmFibGVHcmlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmVuYWJsZUdyaWQgPSBvcHRpb25zLmVuYWJsZUdyaWQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5ncmlkU2l6ZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5ncmlkU2l6ZSA9IG9wdGlvbnMuZ3JpZFNpemU7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5zbmFwVG9HcmlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnNuYXBUb0dyaWQgPSBvcHRpb25zLnNuYXBUb0dyaWQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5wZXJzaXN0ZW5jZUlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnBlcnNpc3RlbmNlSWQgPSBvcHRpb25zLnBlcnNpc3RlbmNlSWQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdE9ic2VydmFibGVzKCk6IHZvaWQge1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaChcbiAgICAgIHRoaXMud2hpdGVib2FyZFNlcnZpY2Uuc2F2ZVN2Z01ldGhvZENhbGxlZCQuc3Vic2NyaWJlKCh7IG5hbWUsIGZvcm1hdCB9KSA9PiB0aGlzLnNhdmVTdmcobmFtZSwgZm9ybWF0KSlcbiAgICApO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaChcbiAgICAgIHRoaXMud2hpdGVib2FyZFNlcnZpY2UuYWRkSW1hZ2VNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoaW1hZ2UpID0+IHRoaXMuaGFuZGxlRHJhd0ltYWdlKGltYWdlKSlcbiAgICApO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaCh0aGlzLndoaXRlYm9hcmRTZXJ2aWNlLmVyYXNlU3ZnTWV0aG9kQ2FsbGVkJC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5fY2xlYXJTdmcoKSkpO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaCh0aGlzLndoaXRlYm9hcmRTZXJ2aWNlLnJlc2V0U3ZnTWV0aG9kQ2FsbGVkJC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5fcmVzZXQoKSkpO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaCh0aGlzLndoaXRlYm9hcmRTZXJ2aWNlLnVuZG9TdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLnVuZG9EcmF3KCkpKTtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25MaXN0LnB1c2godGhpcy53aGl0ZWJvYXJkU2VydmljZS5yZWRvU3ZnTWV0aG9kQ2FsbGVkJC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5yZWRvRHJhdygpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKGZyb21FdmVudCh3aW5kb3csICdyZXNpemUnKS5zdWJzY3JpYmUoKCkgPT4gdGhpcy5yZXNpemVTY3JlZW4oKSkpO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaChcbiAgICAgIHRoaXMuX2RhdGEucGlwZShza2lwKDEpKS5zdWJzY3JpYmUoKGRhdGEpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJzIyNycsIGxvY2FsU3RvcmFnZS5nZXRJdGVtKGB3aGl0ZWJhb3JkXyR7dGhpcy5wZXJzaXN0ZW5jZUlkfWApfHwne30nKTtcbiAgICAgICAgbGV0IHN0b3JlZCA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oYHdoaXRlYmFvcmRfJHt0aGlzLnBlcnNpc3RlbmNlSWR9YCl8fCd7fScpO1xuICAgICAgICBzdG9yZWQuZGF0YSA9IGRhdGE7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGB3aGl0ZWJhb3JkXyR7dGhpcy5wZXJzaXN0ZW5jZUlkfWAsIEpTT04uc3RyaW5naWZ5KHN0b3JlZCkpO1xuICAgICAgICB0aGlzLmRhdGFDaGFuZ2UuZW1pdChkYXRhKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfVxuXG4gIGluaXRhbGl6ZUV2ZW50cyhzZWxlY3Rpb246IFNlbGVjdGlvbjxFbGVtZW50LCB1bmtub3duLCBudWxsLCB1bmRlZmluZWQ+KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmRyYXdpbmdFbmFibGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxldCBkcmFnZ2luZyA9IGZhbHNlO1xuXG4gICAgc2VsZWN0aW9uLmNhbGwoXG4gICAgICBkcmFnKClcbiAgICAgICAgLm9uKCdzdGFydCcsICgpID0+IHtcbiAgICAgICAgICBkcmFnZ2luZyA9IHRydWU7XG4gICAgICAgICAgdGhpcy5yZWRvU3RhY2sgPSBbXTtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUxvY2FsU3RvcmFnZSgpO1xuICAgICAgICAgIHRoaXMuaGFuZGxlU3RhcnRFdmVudCgpO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ2RyYWcnLCAoKSA9PiB7XG4gICAgICAgICAgaWYgKCFkcmFnZ2luZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmhhbmRsZURyYWdFdmVudCgpO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICBkcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMuaGFuZGxlRW5kRXZlbnQoKTtcbiAgICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgaGFuZGxlU3RhcnRFdmVudCgpIHtcbiAgICBzd2l0Y2ggKHRoaXMuc2VsZWN0ZWRUb29sKSB7XG4gICAgICBjYXNlIFRvb2xzRW51bS5CUlVTSDpcbiAgICAgICAgdGhpcy5oYW5kbGVTdGFydEJydXNoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uSU1BR0U6XG4gICAgICAgIHRoaXMuaGFuZGxlSW1hZ2VUb29sKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uTElORTpcbiAgICAgICAgdGhpcy5oYW5kbGVTdGFydExpbmUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5SRUNUOlxuICAgICAgICB0aGlzLmhhbmRsZVN0YXJ0UmVjdCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkVMTElQU0U6XG4gICAgICAgIHRoaXMuaGFuZGxlU3RhcnRFbGxpcHNlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uVEVYVDpcbiAgICAgICAgdGhpcy5oYW5kbGVUZXh0VG9vbCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlNFTEVDVDpcbiAgICAgICAgdGhpcy5oYW5kbGVTZWxlY3RUb29sKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uRVJBU0VSOlxuICAgICAgICB0aGlzLmhhbmRsZUVyYXNlclRvb2woKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgaGFuZGxlRHJhZ0V2ZW50KCkge1xuICAgIHN3aXRjaCAodGhpcy5zZWxlY3RlZFRvb2wpIHtcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkJSVVNIOlxuICAgICAgICB0aGlzLmhhbmRsZURyYWdCcnVzaCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkxJTkU6XG4gICAgICAgIHRoaXMuaGFuZGxlRHJhZ0xpbmUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5SRUNUOlxuICAgICAgICB0aGlzLmhhbmRsZURyYWdSZWN0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uRUxMSVBTRTpcbiAgICAgICAgdGhpcy5oYW5kbGVEcmFnRWxsaXBzZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlRFWFQ6XG4gICAgICAgIHRoaXMuaGFuZGxlVGV4dERyYWcoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgaGFuZGxlRW5kRXZlbnQoKSB7XG4gICAgc3dpdGNoICh0aGlzLnNlbGVjdGVkVG9vbCkge1xuICAgICAgY2FzZSBUb29sc0VudW0uQlJVU0g6XG4gICAgICAgIHRoaXMuaGFuZGxlRW5kQnJ1c2goKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5MSU5FOlxuICAgICAgICB0aGlzLmhhbmRsZUVuZExpbmUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5SRUNUOlxuICAgICAgICB0aGlzLmhhbmRsZUVuZFJlY3QoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5FTExJUFNFOlxuICAgICAgICB0aGlzLmhhbmRsZUVuZEVsbGlwc2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5URVhUOlxuICAgICAgICB0aGlzLmhhbmRsZVRleHRFbmQoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgLy8gSGFuZGxlIEJydXNoIHRvb2xcbiAgaGFuZGxlU3RhcnRCcnVzaCgpIHtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5CUlVTSCk7XG4gICAgdGhpcy50ZW1wRHJhdyA9IFt0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpXTtcbiAgICBlbGVtZW50LnZhbHVlID0gZDNMaW5lKHRoaXMudGVtcERyYXcpIGFzIHN0cmluZztcbiAgICBlbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggPSB0aGlzLnN0cm9rZVdpZHRoO1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBlbGVtZW50O1xuICB9XG4gIGhhbmRsZURyYWdCcnVzaCgpIHtcbiAgICB0aGlzLnRlbXBEcmF3LnB1c2godGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKSk7XG4gICAgdGhpcy50ZW1wRWxlbWVudC52YWx1ZSA9IGQzTGluZSh0aGlzLnRlbXBEcmF3KSBhcyBzdHJpbmc7XG4gIH1cbiAgaGFuZGxlRW5kQnJ1c2goKSB7XG4gICAgdGhpcy50ZW1wRHJhdy5wdXNoKHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSkpO1xuICAgIHRoaXMudGVtcEVsZW1lbnQudmFsdWUgPSBkM0xpbmUodGhpcy50ZW1wRHJhdykgYXMgc3RyaW5nO1xuICAgIHRoaXMuX3B1c2hUb0RhdGEodGhpcy50ZW1wRWxlbWVudCk7XG4gICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgIHRoaXMudGVtcERyYXcgPSBudWxsIGFzIG5ldmVyO1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICB9XG4gIC8vIEhhbmRsZSBJbWFnZSB0b29sXG4gIGhhbmRsZUltYWdlVG9vbCgpIHtcbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xuICAgIGlucHV0LmFjY2VwdCA9ICdpbWFnZS8qJztcbiAgICBpbnB1dC5vbmNoYW5nZSA9IChlKSA9PiB7XG4gICAgICBjb25zdCBmaWxlcyA9IChlLnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS5maWxlcztcbiAgICAgIGlmIChmaWxlcykge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICByZWFkZXIub25sb2FkID0gKGU6IFByb2dyZXNzRXZlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBpbWFnZSA9IChlLnRhcmdldCBhcyBGaWxlUmVhZGVyKS5yZXN1bHQgYXMgc3RyaW5nO1xuICAgICAgICAgIHRoaXMuaGFuZGxlRHJhd0ltYWdlKHsgaW1hZ2UsIHgsIHkgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGVzWzBdKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGlucHV0LmNsaWNrKCk7XG4gIH1cbiAgLy8gSGFuZGxlIERyYXcgSW1hZ2VcbiAgaGFuZGxlRHJhd0ltYWdlKGltYWdlU3JjOiBJQWRkSW1hZ2UpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdGVtcEltZyA9IG5ldyBJbWFnZSgpO1xuICAgICAgdGVtcEltZy5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHN2Z0hlaWdodCA9IHRoaXMuY2FudmFzSGVpZ2h0O1xuICAgICAgICBjb25zdCBpbWFnZVdpZHRoID0gdGVtcEltZy53aWR0aDtcbiAgICAgICAgY29uc3QgaW1hZ2VIZWlnaHQgPSB0ZW1wSW1nLmhlaWdodDtcbiAgICAgICAgY29uc3QgYXNwZWN0UmF0aW8gPSB0ZW1wSW1nLndpZHRoIC8gdGVtcEltZy5oZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IGltYWdlSGVpZ2h0ID4gc3ZnSGVpZ2h0ID8gc3ZnSGVpZ2h0IC0gNDAgOiBpbWFnZUhlaWdodDtcbiAgICAgICAgY29uc3Qgd2lkdGggPSBoZWlnaHQgPT09IHN2Z0hlaWdodCAtIDQwID8gKHN2Z0hlaWdodCAtIDQwKSAqIGFzcGVjdFJhdGlvIDogaW1hZ2VXaWR0aDtcblxuICAgICAgICBsZXQgeCA9IGltYWdlU3JjLnggfHwgKGltYWdlV2lkdGggLSB3aWR0aCkgKiAoaW1hZ2VTcmMueCB8fCAwKTtcbiAgICAgICAgbGV0IHkgPSBpbWFnZVNyYy55IHx8IChpbWFnZUhlaWdodCAtIGhlaWdodCkgKiAoaW1hZ2VTcmMueSB8fCAwKTtcblxuICAgICAgICBpZiAoeCA8IDApIHtcbiAgICAgICAgICB4ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoeSA8IDApIHtcbiAgICAgICAgICB5ID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLklNQUdFKTtcbiAgICAgICAgZWxlbWVudC52YWx1ZSA9IGltYWdlU3JjLmltYWdlIGFzIHN0cmluZztcbiAgICAgICAgZWxlbWVudC5vcHRpb25zLndpZHRoID0gd2lkdGg7XG4gICAgICAgIGVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIGVsZW1lbnQueCA9IHg7XG4gICAgICAgIGVsZW1lbnQueSA9IHk7XG4gICAgICAgIHRoaXMuX3B1c2hUb0RhdGEoZWxlbWVudCk7XG4gICAgICAgIHRoaXMuaW1hZ2VBZGRlZC5lbWl0KCk7XG4gICAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICAgIH07XG4gICAgICB0ZW1wSW1nLnNyYyA9IGltYWdlU3JjLmltYWdlIGFzIHN0cmluZztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBMaW5lIHRvb2xcbiAgaGFuZGxlU3RhcnRMaW5lKCkge1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLkxJTkUpO1xuICAgIGxldCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuXG4gICAgaWYgKHRoaXMuc25hcFRvR3JpZCkge1xuICAgICAgeCA9IHRoaXMuX3NuYXBUb0dyaWQoeCk7XG4gICAgICB5ID0gdGhpcy5fc25hcFRvR3JpZCh5KTtcbiAgICB9XG5cbiAgICBlbGVtZW50Lm9wdGlvbnMueDEgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy55MSA9IHk7XG4gICAgZWxlbWVudC5vcHRpb25zLngyID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMueTIgPSB5O1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBlbGVtZW50O1xuICB9XG4gIGhhbmRsZURyYWdMaW5lKCkge1xuICAgIGxldCBbeDIsIHkyXSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG5cbiAgICBpZiAodGhpcy5zbmFwVG9HcmlkKSB7XG4gICAgICB4MiA9IHRoaXMuX3NuYXBUb0dyaWQoeDIpO1xuICAgICAgeTIgPSB0aGlzLl9zbmFwVG9HcmlkKHkyKTtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQuc291cmNlRXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgIGNvbnN0IHgxID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngxIGFzIG51bWJlcjtcbiAgICAgIGNvbnN0IHkxID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkxIGFzIG51bWJlcjtcbiAgICAgIGNvbnN0IHsgeCwgeSB9ID0gdGhpcy5fc25hcFRvQW5nbGUoeDEsIHkxLCB4MiwgeTIpO1xuICAgICAgW3gyLCB5Ml0gPSBbeCwgeV07XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngyID0geDI7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkyID0geTI7XG4gIH1cbiAgaGFuZGxlRW5kTGluZSgpIHtcbiAgICBpZiAoXG4gICAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDEgIT0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngyIHx8XG4gICAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTEgIT0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkyXG4gICAgKSB7XG4gICAgICB0aGlzLl9wdXNoVG9EYXRhKHRoaXMudGVtcEVsZW1lbnQpO1xuICAgICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgICAgdGhpcy50ZW1wRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBSZWN0IHRvb2xcbiAgaGFuZGxlU3RhcnRSZWN0KCkge1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLlJFQ1QpO1xuICAgIGxldCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIGlmICh0aGlzLnNuYXBUb0dyaWQpIHtcbiAgICAgIHggPSB0aGlzLl9zbmFwVG9HcmlkKHgpO1xuICAgICAgeSA9IHRoaXMuX3NuYXBUb0dyaWQoeSk7XG4gICAgfVxuICAgIGVsZW1lbnQub3B0aW9ucy54MSA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLnkxID0geTtcbiAgICBlbGVtZW50Lm9wdGlvbnMueDIgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy55MiA9IHk7XG4gICAgZWxlbWVudC5vcHRpb25zLndpZHRoID0gMTtcbiAgICBlbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gMTtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gZWxlbWVudDtcbiAgfVxuICBoYW5kbGVEcmFnUmVjdCgpIHtcbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIGNvbnN0IHN0YXJ0X3ggPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDEgfHwgMDtcbiAgICBjb25zdCBzdGFydF95ID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkxIHx8IDA7XG4gICAgbGV0IHcgPSBNYXRoLmFicyh4IC0gc3RhcnRfeCk7XG4gICAgbGV0IGggPSBNYXRoLmFicyh5IC0gc3RhcnRfeSk7XG4gICAgbGV0IG5ld194ID0gbnVsbDtcbiAgICBsZXQgbmV3X3kgPSBudWxsO1xuXG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICB3ID0gaCA9IE1hdGgubWF4KHcsIGgpO1xuICAgICAgbmV3X3ggPSBzdGFydF94IDwgeCA/IHN0YXJ0X3ggOiBzdGFydF94IC0gdztcbiAgICAgIG5ld195ID0gc3RhcnRfeSA8IHkgPyBzdGFydF95IDogc3RhcnRfeSAtIGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ld194ID0gTWF0aC5taW4oc3RhcnRfeCwgeCk7XG4gICAgICBuZXdfeSA9IE1hdGgubWluKHN0YXJ0X3ksIHkpO1xuICAgIH1cbiAgICBpZiAoZXZlbnQuc291cmNlRXZlbnQuYWx0S2V5KSB7XG4gICAgICB3ICo9IDI7XG4gICAgICBoICo9IDI7XG4gICAgICBuZXdfeCA9IHN0YXJ0X3ggLSB3IC8gMjtcbiAgICAgIG5ld195ID0gc3RhcnRfeSAtIGggLyAyO1xuICAgIH1cbiAgICBpZiAodGhpcy5zbmFwVG9HcmlkKSB7XG4gICAgICB3ID0gdGhpcy5fc25hcFRvR3JpZCh3KTtcbiAgICAgIGggPSB0aGlzLl9zbmFwVG9HcmlkKGgpO1xuICAgICAgbmV3X3ggPSB0aGlzLl9zbmFwVG9HcmlkKG5ld194KTtcbiAgICAgIG5ld195ID0gdGhpcy5fc25hcFRvR3JpZChuZXdfeSk7XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoID0gdztcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gaDtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDIgPSBuZXdfeDtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTIgPSBuZXdfeTtcbiAgfVxuICBoYW5kbGVFbmRSZWN0KCkge1xuICAgIGlmICh0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMud2lkdGggIT0gMCB8fCB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ICE9IDApIHtcbiAgICAgIHRoaXMuX3B1c2hUb0RhdGEodGhpcy50ZW1wRWxlbWVudCk7XG4gICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgICB0aGlzLnRlbXBFbGVtZW50ID0gbnVsbCBhcyBuZXZlcjtcbiAgICB9XG4gIH1cbiAgLy8gSGFuZGxlIEVsbGlwc2UgdG9vbFxuICBoYW5kbGVTdGFydEVsbGlwc2UoKSB7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX2dlbmVyYXRlTmV3RWxlbWVudChFbGVtZW50VHlwZUVudW0uRUxMSVBTRSk7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcblxuICAgIC8vIHdvcmthcm91bmRcbiAgICBlbGVtZW50Lm9wdGlvbnMueDEgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy55MSA9IHk7XG5cbiAgICBlbGVtZW50Lm9wdGlvbnMuY3ggPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy5jeSA9IHk7XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IGVsZW1lbnQ7XG4gIH1cbiAgaGFuZGxlRHJhZ0VsbGlwc2UoKSB7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBjb25zdCBzdGFydF94ID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngxIHx8IDA7XG4gICAgY29uc3Qgc3RhcnRfeSA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MSB8fCAwO1xuICAgIGxldCBjeCA9IE1hdGguYWJzKHN0YXJ0X3ggKyAoeCAtIHN0YXJ0X3gpIC8gMik7XG4gICAgbGV0IGN5ID0gTWF0aC5hYnMoc3RhcnRfeSArICh5IC0gc3RhcnRfeSkgLyAyKTtcbiAgICBsZXQgcnggPSBNYXRoLmFicyhzdGFydF94IC0gY3gpO1xuICAgIGxldCByeSA9IE1hdGguYWJzKHN0YXJ0X3kgLSBjeSk7XG5cbiAgICBpZiAoZXZlbnQuc291cmNlRXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgIHJ5ID0gcng7XG4gICAgICBjeSA9IHkgPiBzdGFydF95ID8gc3RhcnRfeSArIHJ4IDogc3RhcnRfeSAtIHJ4O1xuICAgIH1cbiAgICBpZiAoZXZlbnQuc291cmNlRXZlbnQuYWx0S2V5KSB7XG4gICAgICBjeCA9IHN0YXJ0X3g7XG4gICAgICBjeSA9IHN0YXJ0X3k7XG4gICAgICByeCA9IE1hdGguYWJzKHggLSBjeCk7XG4gICAgICByeSA9IGV2ZW50LnNvdXJjZUV2ZW50LnNoaWZ0S2V5ID8gcnggOiBNYXRoLmFicyh5IC0gY3kpO1xuICAgIH1cblxuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5yeCA9IHJ4O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5yeSA9IHJ5O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5jeCA9IGN4O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5jeSA9IGN5O1xuICB9XG4gIGhhbmRsZUVuZEVsbGlwc2UoKSB7XG4gICAgaWYgKHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5yeCAhPSAwIHx8IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5yeSAhPSAwKSB7XG4gICAgICB0aGlzLl9wdXNoVG9EYXRhKHRoaXMudGVtcEVsZW1lbnQpO1xuICAgICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgICAgdGhpcy50ZW1wRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBUZXh0IHRvb2xcbiAgaGFuZGxlVGV4dFRvb2woKSB7XG4gICAgaWYgKHRoaXMudGVtcEVsZW1lbnQpIHtcbiAgICAgIC8vIGZpbmlzaCB0aGUgY3VycmVudCBvbmUgaWYgbmVlZGVkXG4gICAgICB0aGlzLmZpbmlzaFRleHRJbnB1dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5URVhUKTtcbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIGVsZW1lbnQub3B0aW9ucy50b3AgPSB5O1xuICAgIGVsZW1lbnQub3B0aW9ucy5sZWZ0ID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggPSAwO1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy50ZXh0SW5wdXQubmF0aXZlRWxlbWVudC5mb2N1cygpO1xuICAgIH0sIDApO1xuICB9XG4gIGhhbmRsZVRleHREcmFnKCkge1xuICAgIGlmICghdGhpcy50ZW1wRWxlbWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy50b3AgPSB5O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5sZWZ0ID0geDtcbiAgfVxuICBoYW5kbGVUZXh0RW5kKCkge1xuICAgIGlmICghdGhpcy50ZW1wRWxlbWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gIH1cbiAgLy8gSGFuZGxlIFNlbGVjdCB0b29sXG4gIGhhbmRsZVNlbGVjdFRvb2woKSB7XG4gICAgY29uc3QgbW91c2VfdGFyZ2V0ID0gdGhpcy5fZ2V0TW91c2VUYXJnZXQoKTtcbiAgICBpZiAobW91c2VfdGFyZ2V0KSB7XG4gICAgICBpZiAobW91c2VfdGFyZ2V0LmlkID09PSAnc2VsZWN0b3JHcm91cCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgaWQgPSBtb3VzZV90YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLXdiLWlkJyk7XG4gICAgICBjb25zdCBzZWxlY3RlZEVsZW1lbnQgPSB0aGlzLmRhdGEuZmluZCgoZWwpID0+IGVsLmlkID09PSBpZCkgYXMgV2hpdGVib2FyZEVsZW1lbnQ7XG4gICAgICB0aGlzLnNldFNlbGVjdGVkRWxlbWVudChzZWxlY3RlZEVsZW1lbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNsZWFyU2VsZWN0ZWRFbGVtZW50KCk7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBFcmFzZXIgdG9vbFxuICBoYW5kbGVFcmFzZXJUb29sKCkge1xuICAgIGNvbnN0IG1vdXNlX3RhcmdldCA9IHRoaXMuX2dldE1vdXNlVGFyZ2V0KCk7XG4gICAgaWYgKG1vdXNlX3RhcmdldCkge1xuICAgICAgY29uc3QgaWQgPSBtb3VzZV90YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLXdiLWlkJyk7XG4gICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5kYXRhLmZpbmQoKGVsKSA9PiBlbC5pZCA9PT0gaWQpIGFzIFdoaXRlYm9hcmRFbGVtZW50O1xuICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5kYXRhID0gdGhpcy5kYXRhLmZpbHRlcigoZWwpID0+IGVsLmlkICE9PSBpZCk7XG4gICAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICAgICAgdGhpcy5kZWxldGVFbGVtZW50LmVtaXQoZWxlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIGNvbnZlcnQgdGhlIHZhbHVlIG9mIHRoaXMudGV4dElucHV0Lm5hdGl2ZUVsZW1lbnQgdG8gYW4gU1ZHIHRleHQgbm9kZSwgdW5sZXNzIGl0J3MgZW1wdHksXG4gIC8vIGFuZCB0aGVuIGRpc21pc3MgdGhpcy50ZXh0SW5wdXQubmF0aXZlRWxlbWVudFxuICBmaW5pc2hUZXh0SW5wdXQoKSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnRleHRJbnB1dC5uYXRpdmVFbGVtZW50LnZhbHVlO1xuICAgIHRoaXMudGVtcEVsZW1lbnQudmFsdWUgPSB2YWx1ZTtcbiAgICBpZiAodGhpcy50ZW1wRWxlbWVudC52YWx1ZSkge1xuICAgICAgdGhpcy5fcHVzaFRvRGF0YSh0aGlzLnRlbXBFbGVtZW50KTtcbiAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICB9XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gIH1cbiAgLy8gSGFuZGxlIFRleHQgSW5wdXRcbiAgdXBkYXRlVGV4dEl0ZW0odmFsdWU6IHN0cmluZykge1xuICAgIGlmICh0aGlzLnRlbXBFbGVtZW50ICYmIHRoaXMuc2VsZWN0ZWRUb29sID09IFRvb2xzRW51bS5URVhUKSB7XG4gICAgICB0aGlzLnRlbXBFbGVtZW50LnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICB9XG4gIHNldFNlbGVjdGVkRWxlbWVudChlbGVtZW50OiBXaGl0ZWJvYXJkRWxlbWVudCkge1xuICAgIHRoaXMuc2VsZWN0ZWRUb29sID0gVG9vbHNFbnVtLlNFTEVDVDtcbiAgICBjb25zdCBjdXJyZW50QkJveCA9IHRoaXMuX2dldEVsZW1lbnRCYm94KGVsZW1lbnQpO1xuICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLnNlbGVjdEVsZW1lbnQuZW1pdChlbGVtZW50KTtcbiAgICB0aGlzLl9zaG93R3JpcHMoY3VycmVudEJCb3gpO1xuICB9XG4gIGNsZWFyU2VsZWN0ZWRFbGVtZW50KCkge1xuICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50ID0gbnVsbCBhcyBuZXZlcjtcbiAgICB0aGlzLnJ1YmJlckJveC5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIHRoaXMuc2VsZWN0RWxlbWVudC5lbWl0KG51bGwpO1xuICB9XG4gIHByaXZhdGUgc2F2ZVN2ZyhuYW1lOiBzdHJpbmcsIGZvcm1hdDogZm9ybWF0VHlwZXMpIHtcbiAgICBjb25zdCBzdmdDYW52YXMgPSB0aGlzLnNlbGVjdGlvbi5zZWxlY3QoJyNzdmdjb250ZW50JykuY2xvbmUodHJ1ZSk7XG4gICAgc3ZnQ2FudmFzLnNlbGVjdCgnI3NlbGVjdG9yUGFyZW50R3JvdXAnKS5yZW1vdmUoKTtcbiAgICAoc3ZnQ2FudmFzLnNlbGVjdCgnI2NvbnRlbnRCYWNrZ3JvdW5kJykubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZSgnb3BhY2l0eScpO1xuICAgIGNvbnN0IHN2ZyA9IHN2Z0NhbnZhcy5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudDtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd4JywgJzAnKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd5JywgJzAnKTtcblxuICAgIGNvbnN0IHN2Z1N0cmluZyA9IHRoaXMuc2F2ZUFzU3ZnKHN2ZyBhcyBFbGVtZW50KTtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSBGb3JtYXRUeXBlLkJhc2U2NDpcbiAgICAgICAgdGhpcy5zdmdTdHJpbmcySW1hZ2Uoc3ZnU3RyaW5nLCB0aGlzLmNhbnZhc1dpZHRoLCB0aGlzLmNhbnZhc0hlaWdodCwgZm9ybWF0LCAoaW1nKSA9PiB7XG4gICAgICAgICAgdGhpcy5zYXZlLmVtaXQoaW1nKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBGb3JtYXRUeXBlLlN2Zzoge1xuICAgICAgICBjb25zdCBpbWdTcmMgPSAnZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCwnICsgYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3ZnU3RyaW5nKSkpO1xuICAgICAgICB0aGlzLmRvd25sb2FkKGltZ1NyYywgbmFtZSk7XG4gICAgICAgIHRoaXMuc2F2ZS5lbWl0KGltZ1NyYyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5zdmdTdHJpbmcySW1hZ2Uoc3ZnU3RyaW5nLCB0aGlzLmNhbnZhc1dpZHRoLCB0aGlzLmNhbnZhc0hlaWdodCwgZm9ybWF0LCAoaW1nKSA9PiB7XG4gICAgICAgICAgdGhpcy5kb3dubG9hZChpbWcsIG5hbWUpO1xuICAgICAgICAgIHRoaXMuc2F2ZS5lbWl0KGltZyk7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgc3ZnQ2FudmFzLnJlbW92ZSgpO1xuICB9XG4gIHByaXZhdGUgc3ZnU3RyaW5nMkltYWdlKFxuICAgIHN2Z1N0cmluZzogc3RyaW5nLFxuICAgIHdpZHRoOiBudW1iZXIsXG4gICAgaGVpZ2h0OiBudW1iZXIsXG4gICAgZm9ybWF0OiBzdHJpbmcsXG4gICAgY2FsbGJhY2s6IChpbWc6IHN0cmluZykgPT4gdm9pZFxuICApIHtcbiAgICAvLyBzZXQgZGVmYXVsdCBmb3IgZm9ybWF0IHBhcmFtZXRlclxuICAgIGZvcm1hdCA9IGZvcm1hdCB8fCAncG5nJztcbiAgICAvLyBTVkcgZGF0YSBVUkwgZnJvbSBTVkcgc3RyaW5nXG4gICAgY29uc3Qgc3ZnRGF0YSA9ICdkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LCcgKyBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzdmdTdHJpbmcpKSk7XG4gICAgLy8gY3JlYXRlIGNhbnZhcyBpbiBtZW1vcnkobm90IGluIERPTSlcbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAvLyBnZXQgY2FudmFzIGNvbnRleHQgZm9yIGRyYXdpbmcgb24gY2FudmFzXG4gICAgY29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpIGFzIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDtcbiAgICAvLyBzZXQgY2FudmFzIHNpemVcbiAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIC8vIGNyZWF0ZSBpbWFnZSBpbiBtZW1vcnkobm90IGluIERPTSlcbiAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuICAgIC8vIGxhdGVyIHdoZW4gaW1hZ2UgbG9hZHMgcnVuIHRoaXNcbiAgICBpbWFnZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAvLyBhc3luYyAoaGFwcGVucyBsYXRlcilcbiAgICAgIC8vIGNsZWFyIGNhbnZhc1xuICAgICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAvLyBkcmF3IGltYWdlIHdpdGggU1ZHIGRhdGEgdG8gY2FudmFzXG4gICAgICBjb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAvLyBzbmFwc2hvdCBjYW52YXMgYXMgcG5nXG4gICAgICBjb25zdCBwbmdEYXRhID0gY2FudmFzLnRvRGF0YVVSTCgnaW1hZ2UvJyArIGZvcm1hdCk7XG4gICAgICAvLyBwYXNzIHBuZyBkYXRhIFVSTCB0byBjYWxsYmFja1xuICAgICAgY2FsbGJhY2socG5nRGF0YSk7XG4gICAgfTsgLy8gZW5kIGFzeW5jXG4gICAgLy8gc3RhcnQgbG9hZGluZyBTVkcgZGF0YSBpbnRvIGluIG1lbW9yeSBpbWFnZVxuICAgIGltYWdlLnNyYyA9IHN2Z0RhdGE7XG4gIH1cbiAgcHJpdmF0ZSBzYXZlQXNTdmcoc3ZnTm9kZTogRWxlbWVudCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc2VyaWFsaXplciA9IG5ldyBYTUxTZXJpYWxpemVyKCk7XG4gICAgbGV0IHN2Z1N0cmluZyA9IHNlcmlhbGl6ZXIuc2VyaWFsaXplVG9TdHJpbmcoc3ZnTm9kZSk7XG4gICAgc3ZnU3RyaW5nID0gc3ZnU3RyaW5nLnJlcGxhY2UoLyhcXHcrKT86P3hsaW5rPS9nLCAneG1sbnM6eGxpbms9Jyk7IC8vIEZpeCByb290IHhsaW5rIHdpdGhvdXQgbmFtZXNwYWNlXG4gICAgc3ZnU3RyaW5nID0gc3ZnU3RyaW5nLnJlcGxhY2UoL05TXFxkKzpocmVmL2csICd4bGluazpocmVmJyk7XG4gICAgcmV0dXJuIHN2Z1N0cmluZztcbiAgfVxuICBwcml2YXRlIGRvd25sb2FkKHVybDogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgIGxpbmsuaHJlZiA9IHVybDtcbiAgICBsaW5rLnNldEF0dHJpYnV0ZSgndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICBsaW5rLmRvd25sb2FkID0gbmFtZSB8fCAnbmV3IHdoaXRlLWJvYXJkJztcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgIGxpbmsuY2xpY2soKTtcbiAgfVxuICBwcml2YXRlIF9wdXNoVG9EYXRhKGVsZW1lbnQ6IFdoaXRlYm9hcmRFbGVtZW50KSB7XG4gICAgdGhpcy5kYXRhLnB1c2goZWxlbWVudCk7XG4gICAgdGhpcy5fZGF0YS5uZXh0KHRoaXMuZGF0YSk7XG4gIH1cbiAgcHJpdmF0ZSBfY2xlYXJTdmcoKSB7XG4gICAgdGhpcy5kYXRhID0gW107XG4gICAgdGhpcy5fZGF0YS5uZXh0KHRoaXMuZGF0YSk7XG4gICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgIHRoaXMuY2xlYXIuZW1pdCgpO1xuICB9XG4gIHByaXZhdGUgdW5kb0RyYXcoKSB7XG4gICAgaWYgKCF0aGlzLnVuZG9TdGFjay5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY3VycmVudFN0YXRlID0gdGhpcy51bmRvU3RhY2sucG9wKCk7XG4gICAgdGhpcy5yZWRvU3RhY2sucHVzaChjdXJyZW50U3RhdGUgYXMgV2hpdGVib2FyZEVsZW1lbnRbXSk7XG4gICAgaWYodGhpcy51bmRvU3RhY2subGVuZ3RoKXtcbiAgICAgIHRoaXMuZGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy51bmRvU3RhY2tbdGhpcy51bmRvU3RhY2subGVuZ3RoLTFdKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5faW5pdGlhbERhdGEpKSB8fCBbXTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGVMb2NhbFN0b3JhZ2UoKTtcbiAgICB0aGlzLnVuZG8uZW1pdCgpO1xuICB9XG4gIHByaXZhdGUgcmVkb0RyYXcoKSB7XG4gICAgaWYgKCF0aGlzLnJlZG9TdGFjay5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY3VycmVudFN0YXRlID0gdGhpcy5yZWRvU3RhY2sucG9wKCk7XG4gICAgdGhpcy51bmRvU3RhY2sucHVzaChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN1cnJlbnRTdGF0ZSkpIGFzIFdoaXRlYm9hcmRFbGVtZW50W10pO1xuICAgIHRoaXMuZGF0YSA9IGN1cnJlbnRTdGF0ZSB8fCBbXTtcbiAgICB0aGlzLnVwZGF0ZUxvY2FsU3RvcmFnZSgpO1xuICAgIHRoaXMucmVkby5lbWl0KCk7XG4gIH1cbiAgcHJpdmF0ZSBfcHVzaFRvVW5kbygpIHtcbiAgICB0aGlzLnVuZG9TdGFjay5wdXNoKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5kYXRhKSkpO1xuICAgIHRoaXMudXBkYXRlTG9jYWxTdG9yYWdlKCk7XG4gIH1cbiAgcHJpdmF0ZSBfcmVzZXQoKTogdm9pZCB7XG4gICAgdGhpcy51bmRvU3RhY2sgPSBbXTtcbiAgICB0aGlzLnJlZG9TdGFjayA9IFtdO1xuICAgIHRoaXMuZGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5faW5pdGlhbERhdGEpKTtcbiAgICB0aGlzLnVwZGF0ZUxvY2FsU3RvcmFnZSgpO1xuICB9XG4gIHByaXZhdGUgdXBkYXRlTG9jYWxTdG9yYWdlKCk6IHZvaWQge1xuICAgIGNvbnN0IHN0b3JhZ2VPYmplY3QgPSB7ZGF0YTogdGhpcy5kYXRhLCB1bmRvU3RhY2s6IHRoaXMudW5kb1N0YWNrLCByZWRvU3RhY2s6IHRoaXMucmVkb1N0YWNrfTtcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShgd2hpdGViYW9yZF8ke3RoaXMucGVyc2lzdGVuY2VJZH1gLCBKU09OLnN0cmluZ2lmeShzdG9yYWdlT2JqZWN0KSk7XG4gIH1cbiAgcHJpdmF0ZSBfZ2VuZXJhdGVOZXdFbGVtZW50KG5hbWU6IEVsZW1lbnRUeXBlRW51bSk6IFdoaXRlYm9hcmRFbGVtZW50IHtcbiAgICBjb25zdCBlbGVtZW50ID0gbmV3IFdoaXRlYm9hcmRFbGVtZW50KG5hbWUsIHtcbiAgICAgIHN0cm9rZVdpZHRoOiB0aGlzLnN0cm9rZVdpZHRoLFxuICAgICAgc3Ryb2tlQ29sb3I6IHRoaXMuc3Ryb2tlQ29sb3IsXG4gICAgICBmaWxsOiB0aGlzLmZpbGwsXG4gICAgICBsaW5lSm9pbjogdGhpcy5saW5lSm9pbixcbiAgICAgIGxpbmVDYXA6IHRoaXMubGluZUNhcCxcbiAgICAgIGZvbnRTaXplOiB0aGlzLmZvbnRTaXplLFxuICAgICAgZm9udEZhbWlseTogdGhpcy5mb250RmFtaWx5LFxuICAgICAgZGFzaGFycmF5OiB0aGlzLmRhc2hhcnJheSxcbiAgICAgIGRhc2hvZmZzZXQ6IHRoaXMuZGFzaG9mZnNldCxcbiAgICB9KTtcbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuICBwcml2YXRlIF9jYWxjdWxhdGVYQW5kWShbeCwgeV06IFtudW1iZXIsIG51bWJlcl0pOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgICByZXR1cm4gWyh4IC0gdGhpcy54KSAvIHRoaXMuem9vbSwgKHkgLSB0aGlzLnkpIC8gdGhpcy56b29tXTtcbiAgfVxuICBwcml2YXRlIHJlc2l6ZVNjcmVlbigpIHtcbiAgICBjb25zdCBzdmdDb250YWluZXIgPSB0aGlzLnN2Z0NvbnRhaW5lci5uYXRpdmVFbGVtZW50O1xuICAgIGlmICh0aGlzLmZ1bGxTY3JlZW4pIHtcbiAgICAgIHRoaXMuY2FudmFzV2lkdGggPSBzdmdDb250YWluZXIuY2xpZW50V2lkdGg7XG4gICAgICB0aGlzLmNhbnZhc0hlaWdodCA9IHN2Z0NvbnRhaW5lci5jbGllbnRIZWlnaHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLmNlbnRlcikge1xuICAgICAgdGhpcy54ID0gc3ZnQ29udGFpbmVyLmNsaWVudFdpZHRoIC8gMiAtIHRoaXMuY2FudmFzV2lkdGggLyAyO1xuICAgICAgdGhpcy55ID0gc3ZnQ29udGFpbmVyLmNsaWVudEhlaWdodCAvIDIgLSB0aGlzLmNhbnZhc0hlaWdodCAvIDI7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3NuYXBUb0FuZ2xlKHgxOiBudW1iZXIsIHkxOiBudW1iZXIsIHgyOiBudW1iZXIsIHkyOiBudW1iZXIpIHtcbiAgICBjb25zdCBzbmFwID0gTWF0aC5QSSAvIDQ7IC8vIDQ1IGRlZ3JlZXNcbiAgICBjb25zdCBkeCA9IHgyIC0geDE7XG4gICAgY29uc3QgZHkgPSB5MiAtIHkxO1xuICAgIGNvbnN0IGFuZ2xlID0gTWF0aC5hdGFuMihkeSwgZHgpO1xuICAgIGNvbnN0IGRpc3QgPSBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xuICAgIGNvbnN0IHNuYXBhbmdsZSA9IE1hdGgucm91bmQoYW5nbGUgLyBzbmFwKSAqIHNuYXA7XG4gICAgY29uc3QgeCA9IHgxICsgZGlzdCAqIE1hdGguY29zKHNuYXBhbmdsZSk7XG4gICAgY29uc3QgeSA9IHkxICsgZGlzdCAqIE1hdGguc2luKHNuYXBhbmdsZSk7XG4gICAgcmV0dXJuIHsgeDogeCwgeTogeSwgYTogc25hcGFuZ2xlIH07XG4gIH1cbiAgcHJpdmF0ZSBfc25hcFRvR3JpZChuOiBudW1iZXIpIHtcbiAgICBjb25zdCBzbmFwID0gdGhpcy5ncmlkU2l6ZTtcbiAgICBjb25zdCBuMSA9IE1hdGgucm91bmQobiAvIHNuYXApICogc25hcDtcbiAgICByZXR1cm4gbjE7XG4gIH1cbiAgcHJpdmF0ZSBfZ2V0RWxlbWVudEJib3goZWxlbWVudDogV2hpdGVib2FyZEVsZW1lbnQpOiBET01SZWN0IHtcbiAgICBjb25zdCBlbCA9IHRoaXMuc2VsZWN0aW9uLnNlbGVjdChgI2l0ZW1fJHtlbGVtZW50LmlkfWApLm5vZGUoKSBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgY29uc3QgYmJveCA9IGVsLmdldEJCb3goKTtcbiAgICByZXR1cm4gYmJveDtcbiAgfVxuICBwcml2YXRlIF9nZXRNb3VzZVRhcmdldCgpOiBTVkdHcmFwaGljc0VsZW1lbnQgfCBudWxsIHtcbiAgICBjb25zdCBldnQ6IEV2ZW50ID0gZXZlbnQuc291cmNlRXZlbnQ7XG4gICAgaWYgKGV2dCA9PSBudWxsIHx8IGV2dC50YXJnZXQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGxldCBtb3VzZV90YXJnZXQgPSBldnQudGFyZ2V0IGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICBpZiAobW91c2VfdGFyZ2V0LmlkID09PSAnc3Zncm9vdCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAobW91c2VfdGFyZ2V0LnBhcmVudE5vZGUpIHtcbiAgICAgIG1vdXNlX3RhcmdldCA9IG1vdXNlX3RhcmdldC5wYXJlbnROb2RlLnBhcmVudE5vZGUgYXMgU1ZHR3JhcGhpY3NFbGVtZW50O1xuICAgICAgaWYgKG1vdXNlX3RhcmdldC5pZCA9PT0gJ3NlbGVjdG9yR3JvdXAnKSB7XG4gICAgICAgIHJldHVybiBtb3VzZV90YXJnZXQ7XG4gICAgICB9XG4gICAgICB3aGlsZSAoIW1vdXNlX3RhcmdldC5pZC5pbmNsdWRlcygnaXRlbV8nKSkge1xuICAgICAgICBpZiAobW91c2VfdGFyZ2V0LmlkID09PSAnc3Zncm9vdCcpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBtb3VzZV90YXJnZXQgPSBtb3VzZV90YXJnZXQucGFyZW50Tm9kZSBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtb3VzZV90YXJnZXQ7XG4gIH1cbiAgcHJpdmF0ZSBfc2hvd0dyaXBzKGJib3g6IERPTVJlY3QpIHtcbiAgICB0aGlzLnJ1YmJlckJveCA9IHtcbiAgICAgIHg6IGJib3gueCAtICgodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aCBhcyBudW1iZXIpIHx8IDApICogMC41LFxuICAgICAgeTogYmJveC55IC0gKCh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoIGFzIG51bWJlcikgfHwgMCkgKiAwLjUsXG4gICAgICB3aWR0aDogYmJveC53aWR0aCArICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoIGFzIG51bWJlcikgfHwgMCxcbiAgICAgIGhlaWdodDogYmJveC5oZWlnaHQgKyAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aCBhcyBudW1iZXIpIHx8IDAsXG4gICAgICBkaXNwbGF5OiAnYmxvY2snLFxuICAgIH07XG4gIH1cbiAgbW92ZVNlbGVjdChkb3duRXZlbnQ6IFBvaW50ZXJFdmVudCkge1xuICAgIGxldCBpc1BvaW50ZXJEb3duID0gdHJ1ZTtcbiAgICBjb25zdCBlbGVtZW50ID0gZG93bkV2ZW50LnRhcmdldCBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIChtb3ZlRXZlbnQpID0+IHtcbiAgICAgIGlmICghaXNQb2ludGVyRG93bikgcmV0dXJuO1xuICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRFbGVtZW50KSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gKG1vdmVFdmVudCBhcyBQb2ludGVyRXZlbnQpLm1vdmVtZW50WDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSAobW92ZUV2ZW50IGFzIFBvaW50ZXJFdmVudCkubW92ZW1lbnRZO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgKCkgPT4ge1xuICAgICAgaXNQb2ludGVyRG93biA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG4gIHJlc2l6ZVNlbGVjdChkb3duRXZlbnQ6IFBvaW50ZXJFdmVudCkge1xuICAgIGxldCBpc1BvaW50ZXJEb3duID0gdHJ1ZTtcbiAgICBjb25zdCBlbGVtZW50ID0gZG93bkV2ZW50LnRhcmdldCBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCAobW92ZUV2ZW50KSA9PiB7XG4gICAgICBpZiAoIWlzUG9pbnRlckRvd24pIHJldHVybjtcbiAgICAgIGNvbnN0IGdyaXAgPSBlbGVtZW50LmlkLnNwbGl0KCdfJylbMl07XG4gICAgICBjb25zdCB4ID0gKG1vdmVFdmVudCBhcyBQb2ludGVyRXZlbnQpLm1vdmVtZW50WDtcbiAgICAgIGNvbnN0IHkgPSAobW92ZUV2ZW50IGFzIFBvaW50ZXJFdmVudCkubW92ZW1lbnRZO1xuICAgICAgY29uc3QgYmJveCA9IHRoaXMuX2dldEVsZW1lbnRCYm94KHRoaXMuc2VsZWN0ZWRFbGVtZW50KTtcbiAgICAgIGNvbnN0IHdpZHRoID0gYmJveC53aWR0aDtcbiAgICAgIGNvbnN0IGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgc3dpdGNoICh0aGlzLnNlbGVjdGVkRWxlbWVudC50eXBlKSB7XG4gICAgICAgIGNhc2UgRWxlbWVudFR5cGVFbnVtLkVMTElQU0U6XG4gICAgICAgICAgdGhpcy5fcmVzaXplRWxpcHNlKGdyaXAsIHsgeCwgeSwgd2lkdGgsIGhlaWdodCB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBFbGVtZW50VHlwZUVudW0uTElORTpcbiAgICAgICAgICB0aGlzLl9yZXNpemVMaW5lKGdyaXAsIHsgeCwgeSwgd2lkdGgsIGhlaWdodCB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aGlzLl9yZXNpemVEZWZhdWx0KGdyaXAsIHsgeCwgeSwgd2lkdGgsIGhlaWdodCB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRoaXMuX3Nob3dHcmlwcyh0aGlzLl9nZXRFbGVtZW50QmJveCh0aGlzLnNlbGVjdGVkRWxlbWVudCkpO1xuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsICgpID0+IHtcbiAgICAgIGlzUG9pbnRlckRvd24gPSBmYWxzZTtcbiAgICB9KTtcbiAgfVxuICBwcml2YXRlIF9yZXNpemVMaW5lKGRpcjogc3RyaW5nLCBiYm94OiBCQm94KSB7XG4gICAgc3dpdGNoIChkaXIpIHtcbiAgICAgIGNhc2UgJ253JzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDEgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkxIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ24nOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy55MSBhcyBudW1iZXIpICs9IGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduZSc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLngyIGFzIG51bWJlcikgKz0gYmJveC54O1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy55MSBhcyBudW1iZXIpICs9IGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdlJzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDIgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc2UnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MiBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTIgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncyc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkyIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3N3JzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDEgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkyIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MSBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3Jlc2l6ZUVsaXBzZShkaXI6IHN0cmluZywgYmJveDogQkJveCkge1xuICAgIHN3aXRjaCAoZGlyKSB7XG4gICAgICBjYXNlICdudyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpIC09IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgLT0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeSBhcyBudW1iZXIpIC09IGJib3gueSAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbmUnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueCAvIDI7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnggYXMgbnVtYmVyKSArPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeSBhcyBudW1iZXIpIC09IGJib3gueSAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnggYXMgbnVtYmVyKSArPSBiYm94LnggLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3NlJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgKz0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSArPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3MnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgKz0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpIC09IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgKz0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd3JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpIC09IGJib3gueCAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBwcml2YXRlIF9yZXNpemVEZWZhdWx0KGRpcjogc3RyaW5nLCBiYm94OiBCQm94KSB7XG4gICAgc3dpdGNoIChkaXIpIHtcbiAgICAgIGNhc2UgJ253JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCAtIGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCAtIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94Lnk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgLSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbmUnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggKyBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgLSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMud2lkdGggPSBiYm94LndpZHRoICsgYmJveC54O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3NlJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggKyBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgKyBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgKyBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3cnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggLSBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgKyBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCAtIGJib3gueDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfdW5zdWJzY3JpYmUoc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb24pOiB2b2lkIHtcbiAgICBpZiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cbn1cbiIsIjxzdmcgW2NsYXNzXT1cIidzdmdyb290ICcgKyBzZWxlY3RlZFRvb2xcIiAjc3ZnQ29udGFpbmVyIGlkPVwic3Zncm9vdFwiIHhsaW5rbnM9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI+XG4gIDxzdmcgaWQ9XCJjYW52YXNCYWNrZ3JvdW5kXCIgW2F0dHIud2lkdGhdPVwiY2FudmFzV2lkdGggKiB6b29tXCIgW2F0dHIuaGVpZ2h0XT1cImNhbnZhc0hlaWdodCAqIHpvb21cIiBbYXR0ci54XT1cInhcIlxuICAgIFthdHRyLnldPVwieVwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IG5vbmU7XCI+XG4gICAgPGRlZnMgaWQ9XCJncmlkLXBhdHRlcm5cIj5cbiAgICAgIDxwYXR0ZXJuIGlkPVwic21hbGxHcmlkXCIgW2F0dHIud2lkdGhdPVwiZ3JpZFNpemVcIiBbYXR0ci5oZWlnaHRdPVwiZ3JpZFNpemVcIiBwYXR0ZXJuVW5pdHM9XCJ1c2VyU3BhY2VPblVzZVwiPlxuICAgICAgICA8cGF0aCBbYXR0ci5kXT1cIidNICcrZ3JpZFNpemUrJyAwIEggMCBWICcrZ3JpZFNpemUrJydcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImdyYXlcIiBzdHJva2Utd2lkdGg9XCIwLjVcIiAvPlxuICAgICAgPC9wYXR0ZXJuPlxuICAgICAgPHBhdHRlcm4gaWQ9XCJncmlkXCIgd2lkdGg9XCIxMDBcIiBoZWlnaHQ9XCIxMDBcIiBwYXR0ZXJuVW5pdHM9XCJ1c2VyU3BhY2VPblVzZVwiPlxuICAgICAgICA8cmVjdCB3aWR0aD1cIjEwMFwiIGhlaWdodD1cIjEwMFwiIGZpbGw9XCJ1cmwoI3NtYWxsR3JpZClcIiAvPlxuICAgICAgICA8cGF0aCBkPVwiTSAxMDAgMCBIIDAgViAxMDBcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImdyYXlcIiBzdHJva2Utd2lkdGg9XCIyXCIgLz5cbiAgICAgIDwvcGF0dGVybj5cbiAgICA8L2RlZnM+XG4gICAgPGRlZnMgaWQ9XCJwbGFjZWhvbGRlcl9kZWZzXCI+PC9kZWZzPlxuICAgIDxyZWN0IHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB4PVwiMFwiIHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiIHN0cm9rZT1cInRyYW5zcGFyZW50XCIgW2F0dHIuZmlsbF09XCJiYWNrZ3JvdW5kQ29sb3JcIlxuICAgICAgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogbm9uZTtcIj48L3JlY3Q+XG4gICAgPGcgKm5nSWY9XCJlbmFibGVHcmlkXCI+XG4gICAgICA8cmVjdCB4PVwiLTEwMFwiIHk9XCItMTAwXCIgW2F0dHIud2lkdGhdPVwiKGNhbnZhc1dpZHRoICogem9vbSkgKyAxMDAqMlwiIFthdHRyLmhlaWdodF09XCIoY2FudmFzSGVpZ2h0ICogem9vbSkgKyAxMDAqMlwiXG4gICAgICAgIGZpbGw9XCJ1cmwoI2dyaWQpXCIgLz5cbiAgICA8L2c+XG4gIDwvc3ZnPlxuICA8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBbYXR0ci53aWR0aF09XCJjYW52YXNXaWR0aCAqIHpvb21cIiBbYXR0ci5oZWlnaHRdPVwiY2FudmFzSGVpZ2h0ICogem9vbVwiXG4gICAgW2F0dHIudmlld0JveF09XCJbMCwgMCwgY2FudmFzV2lkdGgsIGNhbnZhc0hlaWdodF1cIiBpZD1cInN2Z2NvbnRlbnRcIiBbYXR0ci54XT1cInhcIiBbYXR0ci55XT1cInlcIj5cbiAgICA8cmVjdCBpZD1cImNvbnRlbnRCYWNrZ3JvdW5kXCIgb3BhY2l0eT1cIjBcIiB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIxMDAlXCIgeD1cIjBcIiB5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIlxuICAgICAgc3Ryb2tlPVwidHJhbnNwYXJlbnRcIiBbYXR0ci5maWxsXT1cImJhY2tncm91bmRDb2xvclwiPjwvcmVjdD5cbiAgICA8ZyBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBhbGw7XCI+XG4gICAgICA8dGl0bGUgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIj5XaGl0ZWJvYXJkPC90aXRsZT5cbiAgICAgIDxuZy1jb250YWluZXIgKm5nRm9yPVwibGV0IGl0ZW0gb2YgZGF0YVwiPlxuICAgICAgICA8ZyBjbGFzcz1cIndiX2VsZW1lbnRcIiBbaWRdPVwiJ2l0ZW1fJyArIGl0ZW0uaWRcIiBbYXR0ci5kYXRhLXdiLWlkXT1cIml0ZW0uaWRcIiBbbmdTd2l0Y2hdPVwiaXRlbS50eXBlXCJcbiAgICAgICAgICBbYXR0ci50cmFuc2Zvcm1dPVwiJ3RyYW5zbGF0ZSgnICsgaXRlbS54ICsgJywnICsgaXRlbS55ICsgJyknICsgJ3JvdGF0ZSgnICsgaXRlbS5yb3RhdGlvbiArICcpJ1wiXG4gICAgICAgICAgW2F0dHIub3BhY2l0eV09XCJpdGVtLm9wYWNpdHkgLyAxMDBcIj5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuQlJVU0hcIj5cbiAgICAgICAgICAgIDxwYXRoIGNsYXNzPVwiYnJ1c2hcIiBmaWxsPVwibm9uZVwiIFthdHRyLmRdPVwiaXRlbS52YWx1ZVwiIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwiaXRlbS5vcHRpb25zLmRhc2hhcnJheVwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwiaXRlbS5vcHRpb25zLnN0cm9rZVdpZHRoXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwiaXRlbS5vcHRpb25zLmxpbmVDYXBcIiBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwiaXRlbS5vcHRpb25zLmxpbmVKb2luXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiPjwvcGF0aD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLklNQUdFXCI+XG4gICAgICAgICAgICA8aW1hZ2UgW2F0dHIuaGVpZ2h0XT1cIml0ZW0ub3B0aW9ucy5oZWlnaHRcIiBbYXR0ci53aWR0aF09XCJpdGVtLm9wdGlvbnMud2lkdGhcIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPVwibm9uZVwiXG4gICAgICAgICAgICAgIFthdHRyLnhsaW5rOmhyZWZdPVwiaXRlbS52YWx1ZVwiIFthdHRyLmhyZWZdPVwiaXRlbS52YWx1ZVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5maWxsXT1cIml0ZW0ub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCI+PC9pbWFnZT5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLkxJTkVcIj5cbiAgICAgICAgICAgIDxsaW5lIGNsYXNzPVwibGluZVwiIFthdHRyLngxXT1cIml0ZW0ub3B0aW9ucy54MVwiIFthdHRyLnkxXT1cIml0ZW0ub3B0aW9ucy55MVwiIFthdHRyLngyXT1cIml0ZW0ub3B0aW9ucy54MlwiXG4gICAgICAgICAgICAgIFthdHRyLnkyXT1cIml0ZW0ub3B0aW9ucy55MlwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJpdGVtLm9wdGlvbnMubGluZUNhcFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJpdGVtLm9wdGlvbnMubGluZUpvaW5cIiBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9saW5lPlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuUkVDVFwiPlxuICAgICAgICAgICAgPHJlY3QgY2xhc3M9XCJyZWN0XCIgW2F0dHIueF09XCJpdGVtLm9wdGlvbnMueDJcIiBbYXR0ci55XT1cIml0ZW0ub3B0aW9ucy55MlwiIFthdHRyLnJ4XT1cIml0ZW0ub3B0aW9ucy5yeFwiXG4gICAgICAgICAgICAgIFthdHRyLndpZHRoXT1cIml0ZW0ub3B0aW9ucy53aWR0aFwiIFthdHRyLmhlaWdodF09XCJpdGVtLm9wdGlvbnMuaGVpZ2h0XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiaXRlbS5vcHRpb25zLmRhc2hvZmZzZXRcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwiaXRlbS5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuZmlsbF09XCJpdGVtLm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L3JlY3Q+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5FTExJUFNFXCI+XG4gICAgICAgICAgICA8ZWxsaXBzZSBbYXR0ci5jeF09XCJpdGVtLm9wdGlvbnMuY3hcIiBbYXR0ci5jeV09XCJpdGVtLm9wdGlvbnMuY3lcIiBbYXR0ci5yeF09XCJpdGVtLm9wdGlvbnMucnhcIlxuICAgICAgICAgICAgICBbYXR0ci5yeV09XCJpdGVtLm9wdGlvbnMucnlcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwiaXRlbS5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwiaXRlbS5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwiaXRlbS5vcHRpb25zLmxpbmVDYXBcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwiaXRlbS5vcHRpb25zLmxpbmVKb2luXCIgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiXG4gICAgICAgICAgICAgIFthdHRyLmZpbGxdPVwiaXRlbS5vcHRpb25zLmZpbGxcIj48L2VsbGlwc2U+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5URVhUXCI+XG4gICAgICAgICAgICA8dGV4dCBjbGFzcz1cInRleHRfZWxlbWVudFwiIHRleHQtYW5jaG9yPVwic3RhcnRcIiB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiIFthdHRyLnhdPVwiaXRlbS5vcHRpb25zLmxlZnRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cIml0ZW0ub3B0aW9ucy50b3BcIiBbYXR0ci53aWR0aF09XCJpdGVtLm9wdGlvbnMud2lkdGhcIiBbYXR0ci5oZWlnaHRdPVwiaXRlbS5vcHRpb25zLmhlaWdodFwiXG4gICAgICAgICAgICAgIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCIgW2F0dHIuZm9udC1zaXplXT1cIml0ZW0ub3B0aW9ucy5mb250U2l6ZVwiXG4gICAgICAgICAgICAgIFthdHRyLmZvbnQtZmFtaWx5XT1cIml0ZW0ub3B0aW9ucy5mb250RmFtaWx5XCIgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJpdGVtLm9wdGlvbnMubGluZUNhcFwiIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJpdGVtLm9wdGlvbnMubGluZUpvaW5cIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCIgW2F0dHIuZmlsbF09XCJpdGVtLm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgICAgIFthdHRyLmZvbnQtc3R5bGVdPVwiaXRlbS5vcHRpb25zLmZvbnRTdHlsZVwiIFthdHRyLmZvbnQtd2VpZ2h0XT1cIml0ZW0ub3B0aW9ucy5mb250V2VpZ2h0XCI+XG4gICAgICAgICAgICAgIHt7IGl0ZW0udmFsdWUgfX1cbiAgICAgICAgICAgIDwvdGV4dD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoRGVmYXVsdD5cbiAgICAgICAgICAgIDx0ZXh0Pk5vdCBkZWZpbmVkIHR5cGU8L3RleHQ+XG4gICAgICAgICAgPC9nPlxuICAgICAgICA8L2c+XG4gICAgICA8L25nLWNvbnRhaW5lcj5cbiAgICAgIDxnIGNsYXNzPVwidGVtcC1lbGVtZW50XCIgKm5nSWY9XCJ0ZW1wRWxlbWVudFwiICBbbmdTd2l0Y2hdPVwic2VsZWN0ZWRUb29sXCI+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidG9vbHMuQlJVU0hcIj5cbiAgICAgICAgPHBhdGggY2xhc3M9XCJicnVzaFwiIGZpbGw9XCJub25lXCIgW2F0dHIuZF09XCJ0ZW1wRWxlbWVudC52YWx1ZVwiIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNoYXJyYXlcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lQ2FwXCIgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUpvaW5cIlxuICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9wYXRoPlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLklNQUdFXCI+XG4gICAgICAgIDxpbWFnZSBbYXR0ci5oZWlnaHRdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5oZWlnaHRcIiBbYXR0ci53aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoXCIgcHJlc2VydmVBc3BlY3RSYXRpbz1cIm5vbmVcIlxuICAgICAgICAgIFthdHRyLnhsaW5rOmhyZWZdPVwidGVtcEVsZW1lbnQudmFsdWVcIiBbYXR0ci5ocmVmXT1cInRlbXBFbGVtZW50LnZhbHVlXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5maWxsXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiPjwvaW1hZ2U+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuTElORVwiPlxuICAgICAgICA8bGluZSBjbGFzcz1cImxpbmVcIiBbYXR0ci54MV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLngxXCIgW2F0dHIueTFdPVwidGVtcEVsZW1lbnQub3B0aW9ucy55MVwiIFthdHRyLngyXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueDJcIlxuICAgICAgICAgIFthdHRyLnkyXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueTJcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lQ2FwXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lSm9pblwiIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9saW5lPlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLlJFQ1RcIj5cbiAgICAgICAgPHJlY3QgY2xhc3M9XCJyZWN0XCIgW2F0dHIueF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLngyXCIgW2F0dHIueV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnkyXCIgW2F0dHIucnhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5yeFwiXG4gICAgICAgICAgW2F0dHIud2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy53aWR0aFwiIFthdHRyLmhlaWdodF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmhlaWdodFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaG9mZnNldFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5maWxsXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L3JlY3Q+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuRUxMSVBTRVwiPlxuICAgICAgICA8ZWxsaXBzZSBbYXR0ci5jeF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmN4XCIgW2F0dHIuY3ldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5jeVwiIFthdHRyLnJ4XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMucnhcIlxuICAgICAgICAgIFthdHRyLnJ5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMucnlcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lQ2FwXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lSm9pblwiIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCJcbiAgICAgICAgICBbYXR0ci5maWxsXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZmlsbFwiPjwvZWxsaXBzZT5cbiAgICAgIDwvZz5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5URVhUXCI+XG4gICAgICAgIDx0ZXh0IGNsYXNzPVwidGV4dF9lbGVtZW50XCIgdGV4dC1hbmNob3I9XCJzdGFydFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCIgW2F0dHIueF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxlZnRcIlxuICAgICAgICAgIFthdHRyLnldPVwidGVtcEVsZW1lbnQub3B0aW9ucy50b3BcIiBbYXR0ci53aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoXCIgW2F0dHIuaGVpZ2h0XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0XCJcbiAgICAgICAgICBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiIFthdHRyLmZvbnQtc2l6ZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZvbnRTaXplXCJcbiAgICAgICAgICBbYXR0ci5mb250LWZhbWlseV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZvbnRGYW1pbHlcIiBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUNhcFwiIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVKb2luXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2VdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VDb2xvclwiIFthdHRyLmZpbGxdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICBbYXR0ci5mb250LXN0eWxlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZm9udFN0eWxlXCIgW2F0dHIuZm9udC13ZWlnaHRdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5mb250V2VpZ2h0XCI+XG4gICAgICAgICAge3sgdGVtcEVsZW1lbnQudmFsdWUgfX1cbiAgICAgICAgPC90ZXh0PlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoRGVmYXVsdD5cbiAgICAgICAgPHRleHQ+Tm90IGRlZmluZWQgdHlwZTwvdGV4dD5cbiAgICAgIDwvZz5cbiAgICA8L2c+XG4gICAgICA8ZyBpZD1cInNlbGVjdG9yUGFyZW50R3JvdXBcIiAqbmdJZj1cInNlbGVjdGVkRWxlbWVudFwiPlxuICAgICAgICA8ZyBjbGFzcz1cInNlbGVjdG9yR3JvdXBcIiBpZD1cInNlbGVjdG9yR3JvdXBcIiB0cmFuc2Zvcm09XCJcIiBbc3R5bGUuZGlzcGxheV09XCJydWJiZXJCb3guZGlzcGxheVwiXG4gICAgICAgICAgW2F0dHIudHJhbnNmb3JtXT1cIid0cmFuc2xhdGUoJyArIHNlbGVjdGVkRWxlbWVudC54ICsgJywnICsgc2VsZWN0ZWRFbGVtZW50LnkgKyAnKScgKyAncm90YXRlKCcgKyBzZWxlY3RlZEVsZW1lbnQucm90YXRpb24gKyAnKSdcIj5cbiAgICAgICAgICA8ZyBkaXNwbGF5PVwiaW5saW5lXCI+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdGVkQm94XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCIjNEY4MEZGXCIgc2hhcGUtcmVuZGVyaW5nPVwiY3Jpc3BFZGdlc1wiXG4gICAgICAgICAgICAgIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IG5vbmU7XCIgW2F0dHIueF09XCJydWJiZXJCb3gueFwiIFthdHRyLnldPVwicnViYmVyQm94LnlcIiBbYXR0ci53aWR0aF09XCJydWJiZXJCb3gud2lkdGhcIlxuICAgICAgICAgICAgICBbYXR0ci5oZWlnaHRdPVwicnViYmVyQm94LmhlaWdodFwiIHN0eWxlPVwiY3Vyc29yOiBtb3ZlO1wiIChwb2ludGVyZG93bik9XCJtb3ZlU2VsZWN0KCRldmVudClcIj5cbiAgICAgICAgICAgIDwvcmVjdD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgZGlzcGxheT1cImlubGluZVwiPlxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cInNlbGVjdG9yX3JvdGF0ZVwiIGlkPVwic2VsZWN0b3JHcmlwX3JvdGF0ZV9ud1wiIGZpbGw9XCIjMDAwXCIgcj1cIjhcIiBzdHJva2U9XCIjMDAwXCIgZmlsbC1vcGFjaXR5PVwiMFwiXG4gICAgICAgICAgICAgIHN0cm9rZS1vcGFjaXR5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIiBbYXR0ci5jeF09XCJydWJiZXJCb3gueCAtIDRcIiBbYXR0ci5jeV09XCJydWJiZXJCb3gueSAtIDRcIj48L2NpcmNsZT5cbiAgICAgICAgICAgIDxjaXJjbGUgY2xhc3M9XCJzZWxlY3Rvcl9yb3RhdGVcIiBpZD1cInNlbGVjdG9yR3JpcF9yb3RhdGVfbmVcIiBmaWxsPVwiIzAwMFwiIHI9XCI4XCIgc3Ryb2tlPVwiIzAwMFwiIGZpbGwtb3BhY2l0eT1cIjBcIlxuICAgICAgICAgICAgICBzdHJva2Utb3BhY2l0eT1cIjBcIiBzdHJva2Utd2lkdGg9XCIwXCIgW2F0dHIuY3hdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggKyA0XCJcbiAgICAgICAgICAgICAgW2F0dHIuY3ldPVwicnViYmVyQm94LnkgLSA0XCI+XG4gICAgICAgICAgICA8L2NpcmNsZT5cbiAgICAgICAgICAgIDxjaXJjbGUgY2xhc3M9XCJzZWxlY3Rvcl9yb3RhdGVcIiBpZD1cInNlbGVjdG9yR3JpcF9yb3RhdGVfc2VcIiBmaWxsPVwiIzAwMFwiIHI9XCI4XCIgc3Ryb2tlPVwiIzAwMFwiIGZpbGwtb3BhY2l0eT1cIjBcIlxuICAgICAgICAgICAgICBzdHJva2Utb3BhY2l0eT1cIjBcIiBzdHJva2Utd2lkdGg9XCIwXCIgW2F0dHIuY3hdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggKyA0XCJcbiAgICAgICAgICAgICAgW2F0dHIuY3ldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0ICsgNFwiPjwvY2lyY2xlPlxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cInNlbGVjdG9yX3JvdGF0ZVwiIGlkPVwic2VsZWN0b3JHcmlwX3JvdGF0ZV9zd1wiIGZpbGw9XCIjMDAwXCIgcj1cIjhcIiBzdHJva2U9XCIjMDAwXCIgZmlsbC1vcGFjaXR5PVwiMFwiXG4gICAgICAgICAgICAgIHN0cm9rZS1vcGFjaXR5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIiBbYXR0ci5jeF09XCJydWJiZXJCb3gueCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci5jeV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgKyA0XCI+XG4gICAgICAgICAgICA8L2NpcmNsZT5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9ud1wiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogbnctcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCAtIDRcIiBbYXR0ci55XT1cInJ1YmJlckJveC55IC0gNFwiXG4gICAgICAgICAgICAgIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPlxuICAgICAgICAgICAgPC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX25cIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IG4tcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCAvIDIgLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfbmVcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IG5lLXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfZVwiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogZS1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoIC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0IC8gMiAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfc2VcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IHNlLXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX3NcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IHMtcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCAvIDIgLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX3N3XCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBzdy1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54IC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0IC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV93XCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiB3LXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLyAyIC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgIDwvZz5cbiAgICAgIDwvZz5cbiAgICA8L2c+XG4gIDwvc3ZnPlxuPC9zdmc+XG5cbjxkaXYgW3N0eWxlXT1cIidmb250LWZhbWlseTonICsgZm9udEZhbWlseSArICc7JyArICdmb250LXNpemU6JyArIGZvbnRTaXplICsgJ3B4OycrXG4ncG9pbnRlci1ldmVudHM6IG5vbmU7IHdpZHRoOiAnICsgY2FudmFzV2lkdGggKiB6b29tICsgJ3B4OyAnK1xuICAnaGVpZ2h0OiAnICsgY2FudmFzSGVpZ2h0ICogem9vbSArICdweDsnICtcbiAgJ3Bvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAnICsgeSArICdweDsgbGVmdDogJyArIHggKyAncHg7J1wiICpuZ0lmPVwidGVtcEVsZW1lbnQgJiYgc2VsZWN0ZWRUb29sID09PSB0b29scy5URVhUXCI+XG4gIDxpbnB1dCAjdGV4dElucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJ0ZXh0LWlucHV0XCIgW3N0eWxlXT1cIid3aWR0aDogJyArIHRleHRJbnB1dC52YWx1ZS5sZW5ndGggKyAnY2g7ICcrXG4gICAgJ2hlaWdodDogJyArICgyICogem9vbSkgKyAnY2g7JytcbiAgICAndG9wOiAnICsgKCh0ZW1wRWxlbWVudC5vcHRpb25zLnRvcCB8fCAwIC0gMTApICogem9vbSkgKyAncHg7JyArXG4gICAgJ2xlZnQ6ICcgKyAoKHRlbXBFbGVtZW50Lm9wdGlvbnMubGVmdCB8fCAwICsgMykqIHpvb20pICsgJ3B4OydcbiAgICBcIiAoaW5wdXQpPVwidXBkYXRlVGV4dEl0ZW0odGV4dElucHV0LnZhbHVlKVwiIGF1dG9mb2N1cyAvPlxuPC9kaXY+Il19