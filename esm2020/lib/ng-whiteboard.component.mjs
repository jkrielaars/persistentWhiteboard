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
            let stored = JSON.parse(localStorage.getItem(`whitebaord_${this.persistenceId}`) || '');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctd2hpdGVib2FyZC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFpQixTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBYSxNQUFNLEVBQUUsWUFBWSxFQUFvQyxNQUFNLGVBQWUsQ0FBQztBQUMxSixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQWdCLFNBQVMsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUEwQixXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSxVQUFVLENBQUM7QUFDM0osT0FBTyxFQUFvQixVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFhLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQzs7OztBQUkvRixNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7QUFNeEMsTUFBTSxPQUFPLHFCQUFxQjtJQXNGaEMsWUFBb0IsaUJBQXNDO1FBQXRDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUI7UUFqRmxELFVBQUssR0FBeUMsSUFBSSxlQUFlLENBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBdUIxRixtQkFBYyxHQUFHLElBQUksQ0FBQztRQUN0QixnQkFBVyxHQUFHLEdBQUcsQ0FBQztRQUNsQixpQkFBWSxHQUFHLEdBQUcsQ0FB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eEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLFNBQVMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO2FBQ2xDO1lBQ0QsSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFJLFNBQVMsRUFBRTtnQkFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQ2hDO1lBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO2FBQzFCO1lBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO2FBQzFCO1lBQ0QsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLFNBQVMsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQ3RDO1lBQ0QsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLFNBQVMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO2FBQ2xDO1lBQ0QsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLFNBQVMsRUFBRTtnQkFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO2FBQ3BDO1lBQ0QsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLFNBQVMsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQ3RDO1lBQ0QsSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLFNBQVMsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ3BCO1lBQ0QsSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLFNBQVMsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ3BCO1lBQ0QsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLFNBQVMsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQ3RDO1lBQ0QsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLFNBQVMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO2FBQ2xDO1lBQ0QsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLFNBQVMsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQ3RDO1lBQ0QsSUFBSSxPQUFPLENBQUMsYUFBYSxJQUFJLFNBQVMsRUFBRTtnQkFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO2FBQzVDO1NBQ0Y7SUFDSCxDQUFDO0lBRU8sZ0JBQWdCO1FBQ3RCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQ3pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FDeEcsQ0FBQztRQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQ3pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FDL0YsQ0FBQztRQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUN6QixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMxQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQztZQUN0RixNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNuQixZQUFZLENBQUMsT0FBTyxDQUFDLGNBQWMsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNqRixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQztJQUVELGVBQWUsQ0FBQyxTQUF1RDtRQUNyRSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUN4QixPQUFPO1NBQ1I7UUFDRCxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFFckIsU0FBUyxDQUFDLElBQUksQ0FDWixJQUFJLEVBQUU7YUFDSCxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNoQixRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzFCLENBQUMsQ0FBQzthQUNELEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ2YsSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDYixPQUFPO2FBQ1I7WUFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDekIsQ0FBQyxDQUFDO2FBQ0QsRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7WUFDZCxRQUFRLEdBQUcsS0FBSyxDQUFDO1lBQ2pCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FDTCxDQUFDO0lBQ0osQ0FBQztJQUVELGdCQUFnQjtRQUNkLFFBQVEsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN6QixLQUFLLFNBQVMsQ0FBQyxLQUFLO2dCQUNsQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDeEIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLEtBQUs7Z0JBQ2xCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDdkIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2pCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDdkIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2pCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDdkIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLE9BQU87Z0JBQ3BCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUMxQixNQUFNO1lBQ1IsS0FBSyxTQUFTLENBQUMsSUFBSTtnQkFDakIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN0QixNQUFNO1lBQ1IsS0FBSyxTQUFTLENBQUMsTUFBTTtnQkFDbkIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hCLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQyxNQUFNO2dCQUNuQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDeEIsTUFBTTtZQUNSO2dCQUNFLE1BQU07U0FDVDtJQUNILENBQUM7SUFDRCxlQUFlO1FBQ2IsUUFBUSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ3pCLEtBQUssU0FBUyxDQUFDLEtBQUs7Z0JBQ2xCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDdkIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2pCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdEIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2pCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdEIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLE9BQU87Z0JBQ3BCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUN6QixNQUFNO1lBQ1IsS0FBSyxTQUFTLENBQUMsSUFBSTtnQkFDakIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN0QixNQUFNO1lBQ1I7Z0JBQ0UsTUFBTTtTQUNUO0lBQ0gsQ0FBQztJQUNELGNBQWM7UUFDWixRQUFRLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDekIsS0FBSyxTQUFTLENBQUMsS0FBSztnQkFDbEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN0QixNQUFNO1lBQ1IsS0FBSyxTQUFTLENBQUMsSUFBSTtnQkFDakIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNyQixNQUFNO1lBQ1IsS0FBSyxTQUFTLENBQUMsSUFBSTtnQkFDakIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNyQixNQUFNO1lBQ1IsS0FBSyxTQUFTLENBQUMsT0FBTztnQkFDcEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hCLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQyxJQUFJO2dCQUNqQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3JCLE1BQU07WUFDUjtnQkFDRSxNQUFNO1NBQ1Q7SUFDSCxDQUFDO0lBQ0Qsb0JBQW9CO0lBQ3BCLGdCQUFnQjtRQUNkLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQVcsQ0FBQztRQUNoRCxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQy9DLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO0lBQzdCLENBQUM7SUFDRCxlQUFlO1FBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQVcsQ0FBQztJQUMzRCxDQUFDO0lBQ0QsY0FBYztRQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFXLENBQUM7UUFDekQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBYSxDQUFDO1FBQzlCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBYSxDQUFDO0lBQ25DLENBQUM7SUFDRCxvQkFBb0I7SUFDcEIsZUFBZTtRQUNiLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUMsS0FBSyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7UUFDcEIsS0FBSyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDekIsS0FBSyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3JCLE1BQU0sS0FBSyxHQUFJLENBQUMsQ0FBQyxNQUEyQixDQUFDLEtBQUssQ0FBQztZQUNuRCxJQUFJLEtBQUssRUFBRTtnQkFDVCxNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBZ0IsRUFBRSxFQUFFO29CQUNuQyxNQUFNLEtBQUssR0FBSSxDQUFDLENBQUMsTUFBcUIsQ0FBQyxNQUFnQixDQUFDO29CQUN4RCxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxDQUFDLENBQUM7Z0JBQ0YsTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUMsQ0FBQztRQUNGLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBQ0Qsb0JBQW9CO0lBQ3BCLGVBQWUsQ0FBQyxRQUFtQjtRQUNqQyxJQUFJO1lBQ0YsTUFBTSxPQUFPLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUM1QixPQUFPLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRTtnQkFDcEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztnQkFDcEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztnQkFDakMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDbkMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO2dCQUNuRCxNQUFNLE1BQU0sR0FBRyxXQUFXLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7Z0JBQ3RFLE1BQU0sS0FBSyxHQUFHLE1BQU0sS0FBSyxTQUFTLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztnQkFFdEYsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQy9ELElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUVqRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ1QsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDUDtnQkFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ1QsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDUDtnQkFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNoRSxPQUFPLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFlLENBQUM7Z0JBQ3pDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztnQkFDOUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO2dCQUNoQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZCxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN2QixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDckIsQ0FBQyxDQUFDO1lBQ0YsT0FBTyxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUMsS0FBZSxDQUFDO1NBQ3hDO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3RCO0lBQ0gsQ0FBQztJQUNELG1CQUFtQjtJQUNuQixlQUFlO1FBQ2IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUMsQ0FBQztRQUVqRixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDbkIsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDekI7UUFFRCxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QixPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7SUFDN0IsQ0FBQztJQUNELGNBQWM7UUFDWixJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUMsQ0FBQztRQUVuRixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDbkIsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUIsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDM0I7UUFFRCxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFO1lBQzlCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQVksQ0FBQztZQUNqRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFZLENBQUM7WUFDakQsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ25CO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFDRCxhQUFhO1FBQ1gsSUFDRSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMxRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUMxRDtZQUNBLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQWEsQ0FBQztTQUNsQztJQUNILENBQUM7SUFDRCxtQkFBbUI7SUFDbkIsZUFBZTtRQUNiLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDakYsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ25CLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3pCO1FBQ0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QixPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUMxQixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7SUFDN0IsQ0FBQztJQUNELGNBQWM7UUFDWixNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDOUIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDOUIsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQztRQUVqQixJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFO1lBQzlCLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkIsS0FBSyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUM1QyxLQUFLLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO1NBQzdDO2FBQU07WUFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDN0IsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzlCO1FBQ0QsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRTtZQUM1QixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNQLEtBQUssR0FBRyxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN4QixLQUFLLEdBQUcsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDekI7UUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDbkIsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDakM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUNwQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDO0lBQ3RDLENBQUM7SUFDRCxhQUFhO1FBQ1gsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDL0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBYSxDQUFDO1NBQ2xDO0lBQ0gsQ0FBQztJQUNELHNCQUFzQjtJQUN0QixrQkFBa0I7UUFDaEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUMsQ0FBQztRQUVuRixhQUFhO1FBQ2IsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUV2QixPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO0lBQzdCLENBQUM7SUFDRCxpQkFBaUI7UUFDZixNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0MsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0MsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDaEMsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFaEMsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTtZQUM5QixFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ1IsRUFBRSxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDaEQ7UUFDRCxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFO1lBQzVCLEVBQUUsR0FBRyxPQUFPLENBQUM7WUFDYixFQUFFLEdBQUcsT0FBTyxDQUFDO1lBQ2IsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3RCLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztTQUN6RDtRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUNELGdCQUFnQjtRQUNkLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ3hFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQWEsQ0FBQztTQUNsQztJQUNILENBQUM7SUFDRCxtQkFBbUI7SUFDbkIsY0FBYztRQUNaLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNwQixtQ0FBbUM7WUFDbkMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3ZCLE9BQU87U0FDUjtRQUNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDbkYsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztRQUN6QixPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7UUFDM0IsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNkLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNSLENBQUM7SUFDRCxjQUFjO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDckIsT0FBTztTQUNSO1FBQ0QsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDRCxhQUFhO1FBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDckIsT0FBTztTQUNSO1FBQ0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxxQkFBcUI7SUFDckIsZ0JBQWdCO1FBQ2QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzVDLElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQUksWUFBWSxDQUFDLEVBQUUsS0FBSyxlQUFlLEVBQUU7Z0JBQ3ZDLE9BQU87YUFDUjtZQUNELE1BQU0sRUFBRSxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFzQixDQUFDO1lBQ2xGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUMxQzthQUFNO1lBQ0wsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7U0FDN0I7SUFDSCxDQUFDO0lBQ0QscUJBQXFCO0lBQ3JCLGdCQUFnQjtRQUNkLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUM1QyxJQUFJLFlBQVksRUFBRTtZQUNoQixNQUFNLEVBQUUsR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBc0IsQ0FBQztZQUMxRSxJQUFJLE9BQU8sRUFBRTtnQkFDWCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2xDO1NBQ0Y7SUFDSCxDQUFDO0lBQ0QsNEZBQTRGO0lBQzVGLGdEQUFnRDtJQUNoRCxlQUFlO1FBQ2IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO1FBQ2pELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUMvQixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO1lBQzFCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUNwQjtRQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBYSxDQUFDO0lBQ25DLENBQUM7SUFDRCxvQkFBb0I7SUFDcEIsY0FBYyxDQUFDLEtBQWE7UUFDMUIsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksU0FBUyxDQUFDLElBQUksRUFBRTtZQUMzRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7U0FDaEM7SUFDSCxDQUFDO0lBQ0Qsa0JBQWtCLENBQUMsT0FBMEI7UUFDM0MsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQ3JDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUM7UUFDL0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBQ0Qsb0JBQW9CO1FBQ2xCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBYSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUNoQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBQ08sT0FBTyxDQUFDLElBQVksRUFBRSxNQUFtQjtRQUMvQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2pELFNBQVMsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLEVBQW9CLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQW1CLENBQUM7UUFDOUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDM0IsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFM0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFjLENBQUMsQ0FBQztRQUNqRCxRQUFRLE1BQU0sRUFBRTtZQUNkLEtBQUssVUFBVSxDQUFDLE1BQU07Z0JBQ3BCLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtvQkFDbkYsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDO2dCQUNILE1BQU07WUFDUixLQUFLLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbkIsTUFBTSxNQUFNLEdBQUcsNEJBQTRCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVGLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdkIsTUFBTTthQUNQO1lBQ0Q7Z0JBQ0UsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO29CQUNuRixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDO2dCQUNILE1BQU07U0FDVDtRQUNELFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBQ08sZUFBZSxDQUNyQixTQUFpQixFQUNqQixLQUFhLEVBQ2IsTUFBYyxFQUNkLE1BQWMsRUFDZCxRQUErQjtRQUUvQixtQ0FBbUM7UUFDbkMsTUFBTSxHQUFHLE1BQU0sSUFBSSxLQUFLLENBQUM7UUFDekIsK0JBQStCO1FBQy9CLE1BQU0sT0FBTyxHQUFHLDRCQUE0QixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdGLHNDQUFzQztRQUN0QyxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELDJDQUEyQztRQUMzQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBNkIsQ0FBQztRQUNwRSxrQkFBa0I7UUFDbEIsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDckIsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDdkIscUNBQXFDO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7UUFDMUIsa0NBQWtDO1FBQ2xDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ2xCLHdCQUF3QjtZQUN4QixlQUFlO1lBQ2YsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxxQ0FBcUM7WUFDckMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDOUMseUJBQXlCO1lBQ3pCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxDQUFDO1lBQ3BELGdDQUFnQztZQUNoQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUMsWUFBWTtRQUNmLDhDQUE4QztRQUM5QyxLQUFLLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQztJQUN0QixDQUFDO0lBQ08sU0FBUyxDQUFDLE9BQWdCO1FBQ2hDLE1BQU0sVUFBVSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7UUFDdkMsSUFBSSxTQUFTLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsbUNBQW1DO1FBQ3JHLFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUMzRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBQ08sUUFBUSxDQUFDLEdBQVcsRUFBRSxJQUFZO1FBQ3hDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7UUFDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksaUJBQWlCLENBQUM7UUFDMUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUNPLFdBQVcsQ0FBQyxPQUEwQjtRQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUNPLFNBQVM7UUFDZixJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBQ08sUUFBUTtRQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtZQUMxQixPQUFPO1NBQ1I7UUFDRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQW1DLENBQUMsQ0FBQztRQUN6RCxJQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFDO1lBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2pGO2FBQU07WUFDTCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDakU7UUFDRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFDTyxRQUFRO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO1lBQzFCLE9BQU87U0FDUjtRQUNELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUF3QixDQUFDLENBQUM7UUFDckYsSUFBSSxDQUFDLElBQUksR0FBRyxZQUFZLElBQUksRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUNPLFdBQVc7UUFDakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUNPLE1BQU07UUFDWixJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBQ08sa0JBQWtCO1FBQ3hCLE1BQU0sYUFBYSxHQUFHLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQztRQUM5RixZQUFZLENBQUMsT0FBTyxDQUFDLGNBQWMsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBQ08sbUJBQW1CLENBQUMsSUFBcUI7UUFDL0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUU7WUFDMUMsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtTQUM1QixDQUFDLENBQUM7UUFDSCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBQ08sZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBbUI7UUFDOUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUNPLFlBQVk7UUFDbEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUM7UUFDckQsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQztZQUM1QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUM7U0FDL0M7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDZixJQUFJLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLFlBQVksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7U0FDaEU7SUFDSCxDQUFDO0lBQ08sWUFBWSxDQUFDLEVBQVUsRUFBRSxFQUFVLEVBQUUsRUFBVSxFQUFFLEVBQVU7UUFDakUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhO1FBQ3ZDLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDbkIsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNuQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNsRCxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFDTyxXQUFXLENBQUMsQ0FBUztRQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzNCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN2QyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFDTyxlQUFlLENBQUMsT0FBMEI7UUFDaEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQXdCLENBQUM7UUFDckYsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNPLGVBQWU7UUFDckIsTUFBTSxHQUFHLEdBQVUsS0FBSyxDQUFDLFdBQVcsQ0FBQztRQUNyQyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDckMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxNQUE0QixDQUFDO1FBQ3BELElBQUksWUFBWSxDQUFDLEVBQUUsS0FBSyxTQUFTLEVBQUU7WUFDakMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQUksWUFBWSxDQUFDLFVBQVUsRUFBRTtZQUMzQixZQUFZLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxVQUFnQyxDQUFDO1lBQ3hFLElBQUksWUFBWSxDQUFDLEVBQUUsS0FBSyxlQUFlLEVBQUU7Z0JBQ3ZDLE9BQU8sWUFBWSxDQUFDO2FBQ3JCO1lBQ0QsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUN6QyxJQUFJLFlBQVksQ0FBQyxFQUFFLEtBQUssU0FBUyxFQUFFO29CQUNqQyxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFDRCxZQUFZLEdBQUcsWUFBWSxDQUFDLFVBQWdDLENBQUM7YUFDOUQ7U0FDRjtRQUNELE9BQU8sWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFDTyxVQUFVLENBQUMsSUFBYTtRQUM5QixJQUFJLENBQUMsU0FBUyxHQUFHO1lBQ2YsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBRSxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFzQixJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUc7WUFDN0UsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBRSxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFzQixJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUc7WUFDN0UsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsV0FBc0IsSUFBSSxDQUFDO1lBQzdFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFdBQXNCLElBQUksQ0FBQztZQUMvRSxPQUFPLEVBQUUsT0FBTztTQUNqQixDQUFDO0lBQ0osQ0FBQztJQUNELFVBQVUsQ0FBQyxTQUF1QjtRQUNoQyxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDekIsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLE1BQTRCLENBQUM7UUFDdkQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ3BELElBQUksQ0FBQyxhQUFhO2dCQUFFLE9BQU87WUFDM0IsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFO2dCQUN4QixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSyxTQUEwQixDQUFDLFNBQVMsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUssU0FBMEIsQ0FBQyxTQUFTLENBQUM7YUFDakU7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ0QsWUFBWSxDQUFDLFNBQXVCO1FBQ2xDLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQztRQUN6QixNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsTUFBNEIsQ0FBQztRQUN2RCxRQUFRLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDckQsSUFBSSxDQUFDLGFBQWE7Z0JBQUUsT0FBTztZQUMzQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsR0FBSSxTQUEwQixDQUFDLFNBQVMsQ0FBQztZQUNoRCxNQUFNLENBQUMsR0FBSSxTQUEwQixDQUFDLFNBQVMsQ0FBQztZQUNoRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN4RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ3pCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDM0IsUUFBUSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRTtnQkFDakMsS0FBSyxlQUFlLENBQUMsT0FBTztvQkFDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO29CQUNsRCxNQUFNO2dCQUNSLEtBQUssZUFBZSxDQUFDLElBQUk7b0JBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztvQkFDaEQsTUFBTTtnQkFDUjtvQkFDRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7b0JBQ25ELE1BQU07YUFDVDtZQUNELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUMsQ0FBQztRQUNILFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1lBQzFDLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ08sV0FBVyxDQUFDLEdBQVcsRUFBRSxJQUFVO1FBQ3pDLFFBQVEsR0FBRyxFQUFFO1lBQ1gsS0FBSyxJQUFJO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsTUFBTTtZQUNSLEtBQUssSUFBSTtnQkFDTixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDckQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELE1BQU07WUFDUixLQUFLLEdBQUc7Z0JBQ0wsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELE1BQU07WUFDUixLQUFLLElBQUk7Z0JBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxNQUFNO1lBQ1IsS0FBSyxHQUFHO2dCQUNMLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxNQUFNO1lBQ1IsS0FBSyxJQUFJO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsTUFBTTtTQUNUO0lBQ0gsQ0FBQztJQUNPLGFBQWEsQ0FBQyxHQUFXLEVBQUUsSUFBVTtRQUMzQyxRQUFRLEdBQUcsRUFBRTtZQUNYLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNO1lBQ1IsS0FBSyxHQUFHO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFELE1BQU07WUFDUixLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNO1lBQ1IsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFELE1BQU07WUFDUixLQUFLLEdBQUc7Z0JBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsTUFBTTtZQUNSLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNO1lBQ1IsS0FBSyxHQUFHO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFELE1BQU07U0FDVDtJQUNILENBQUM7SUFDTyxjQUFjLENBQUMsR0FBVyxFQUFFLElBQVU7UUFDNUMsUUFBUSxHQUFHLEVBQUU7WUFDWCxLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDM0QsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMzRCxNQUFNO1lBQ1IsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzNELE1BQU07WUFDUixLQUFLLEdBQUc7Z0JBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekQsTUFBTTtZQUNSLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMzRCxNQUFNO1lBQ1IsS0FBSyxHQUFHO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzNELE1BQU07WUFDUixLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDM0QsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNO1NBQ1Q7SUFDSCxDQUFDO0lBRU8sWUFBWSxDQUFDLFlBQTBCO1FBQzdDLElBQUksWUFBWSxFQUFFO1lBQ2hCLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUM1QjtJQUNILENBQUM7O2tIQXIrQlUscUJBQXFCO3NHQUFyQixxQkFBcUIsMGtDQ2RsQyw0aGVBb01NOzJGRHRMTyxxQkFBcUI7a0JBTGpDLFNBQVM7K0JBQ0UsZUFBZTswR0FNekIsWUFBWTtzQkFEWCxTQUFTO3VCQUFDLGNBQWMsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7Z0JBRU8sU0FBUztzQkFBM0QsU0FBUzt1QkFBQyxXQUFXLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO2dCQUk1QixJQUFJO3NCQUFoQixLQUFLO2dCQVNHLE9BQU87c0JBQWYsS0FBSztnQkFFTyxZQUFZO3NCQUF4QixLQUFLO2dCQVVHLGNBQWM7c0JBQXRCLEtBQUs7Z0JBQ0csV0FBVztzQkFBbkIsS0FBSztnQkFDRyxZQUFZO3NCQUFwQixLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBQ0csTUFBTTtzQkFBZCxLQUFLO2dCQUNHLFdBQVc7c0JBQW5CLEtBQUs7Z0JBQ0csV0FBVztzQkFBbkIsS0FBSztnQkFDRyxlQUFlO3NCQUF2QixLQUFLO2dCQUNHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csT0FBTztzQkFBZixLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxJQUFJO3NCQUFaLEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxDQUFDO3NCQUFULEtBQUs7Z0JBQ0csQ0FBQztzQkFBVCxLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBQ0csUUFBUTtzQkFBaEIsS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUNHLGFBQWE7c0JBQXJCLEtBQUs7Z0JBRUksS0FBSztzQkFBZCxNQUFNO2dCQUNHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csS0FBSztzQkFBZCxNQUFNO2dCQUNHLElBQUk7c0JBQWIsTUFBTTtnQkFDRyxJQUFJO3NCQUFiLE1BQU07Z0JBQ0csSUFBSTtzQkFBYixNQUFNO2dCQUNHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csYUFBYTtzQkFBdEIsTUFBTTtnQkFDRyxhQUFhO3NCQUF0QixNQUFNO2dCQUNHLFdBQVc7c0JBQXBCLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIEFmdGVyVmlld0luaXQsIFZpZXdDaGlsZCwgSW5wdXQsIEVsZW1lbnRSZWYsIE9uRGVzdHJveSwgT3V0cHV0LCBFdmVudEVtaXR0ZXIsIE9uQ2hhbmdlcywgT25Jbml0LCBTaW1wbGVDaGFuZ2VzIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBOZ1doaXRlYm9hcmRTZXJ2aWNlIH0gZnJvbSAnLi9uZy13aGl0ZWJvYXJkLnNlcnZpY2UnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBmcm9tRXZlbnQsIHNraXAsIEJlaGF2aW9yU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgRWxlbWVudFR5cGVFbnVtLCBGb3JtYXRUeXBlLCBmb3JtYXRUeXBlcywgSUFkZEltYWdlLCBMaW5lQ2FwRW51bSwgTGluZUpvaW5FbnVtLCBUb29sc0VudW0sIFdoaXRlYm9hcmRFbGVtZW50LCBXaGl0ZWJvYXJkT3B0aW9ucyB9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7IENvbnRhaW5lckVsZW1lbnQsIGN1cnZlQmFzaXMsIGRyYWcsIGxpbmUsIG1vdXNlLCBzZWxlY3QsIFNlbGVjdGlvbiwgZXZlbnQgfSBmcm9tICdkMyc7XG5cbnR5cGUgQkJveCA9IHsgeDogbnVtYmVyOyB5OiBudW1iZXI7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH07XG5cbmNvbnN0IGQzTGluZSA9IGxpbmUoKS5jdXJ2ZShjdXJ2ZUJhc2lzKTtcbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ25nLXdoaXRlYm9hcmQnLFxuICB0ZW1wbGF0ZVVybDogJy4vbmctd2hpdGVib2FyZC5jb21wb25lbnQuaHRtbCcsXG4gIHN0eWxlVXJsczogWycuL25nLXdoaXRlYm9hcmQuY29tcG9uZW50LnNjc3MnXSxcbn0pXG5leHBvcnQgY2xhc3MgTmdXaGl0ZWJvYXJkQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkNoYW5nZXMsIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSB7XG4gIEBWaWV3Q2hpbGQoJ3N2Z0NvbnRhaW5lcicsIHsgc3RhdGljOiBmYWxzZSB9KVxuICBzdmdDb250YWluZXIhOiBFbGVtZW50UmVmPENvbnRhaW5lckVsZW1lbnQ+O1xuICBAVmlld0NoaWxkKCd0ZXh0SW5wdXQnLCB7IHN0YXRpYzogZmFsc2UgfSkgcHJpdmF0ZSB0ZXh0SW5wdXQhOiBFbGVtZW50UmVmPEhUTUxJbnB1dEVsZW1lbnQ+O1xuXG4gIHByaXZhdGUgX2RhdGE6IEJlaGF2aW9yU3ViamVjdDxXaGl0ZWJvYXJkRWxlbWVudFtdPiA9IG5ldyBCZWhhdmlvclN1YmplY3Q8V2hpdGVib2FyZEVsZW1lbnRbXT4oW10pO1xuXG4gIEBJbnB1dCgpIHNldCBkYXRhKGRhdGE6IFdoaXRlYm9hcmRFbGVtZW50W10pIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgdGhpcy5fZGF0YS5uZXh0KGRhdGEpO1xuICAgIH1cbiAgfVxuICBnZXQgZGF0YSgpOiBXaGl0ZWJvYXJkRWxlbWVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgQElucHV0KCkgb3B0aW9ucyE6IFdoaXRlYm9hcmRPcHRpb25zO1xuXG4gIEBJbnB1dCgpIHNldCBzZWxlY3RlZFRvb2wodG9vbDogVG9vbHNFbnVtKSB7XG4gICAgaWYgKHRoaXMuX3NlbGVjdGVkVG9vbCAhPT0gdG9vbCkge1xuICAgICAgdGhpcy5fc2VsZWN0ZWRUb29sID0gdG9vbDtcbiAgICAgIHRoaXMudG9vbENoYW5nZWQuZW1pdCh0b29sKTtcbiAgICAgIHRoaXMuY2xlYXJTZWxlY3RlZEVsZW1lbnQoKTtcbiAgICB9XG4gIH1cbiAgZ2V0IHNlbGVjdGVkVG9vbCgpOiBUb29sc0VudW0ge1xuICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZFRvb2w7XG4gIH1cbiAgQElucHV0KCkgZHJhd2luZ0VuYWJsZWQgPSB0cnVlO1xuICBASW5wdXQoKSBjYW52YXNXaWR0aCA9IDgwMDtcbiAgQElucHV0KCkgY2FudmFzSGVpZ2h0ID0gNjAwO1xuICBASW5wdXQoKSBmdWxsU2NyZWVuID0gdHJ1ZTtcbiAgQElucHV0KCkgY2VudGVyID0gdHJ1ZTtcbiAgQElucHV0KCkgc3Ryb2tlQ29sb3IgPSAnIzAwMCc7XG4gIEBJbnB1dCgpIHN0cm9rZVdpZHRoID0gMjtcbiAgQElucHV0KCkgYmFja2dyb3VuZENvbG9yID0gJyNmZmYnO1xuICBASW5wdXQoKSBsaW5lSm9pbiA9IExpbmVKb2luRW51bS5ST1VORDtcbiAgQElucHV0KCkgbGluZUNhcCA9IExpbmVDYXBFbnVtLlJPVU5EO1xuICBASW5wdXQoKSBmaWxsID0gJyMzMzMnO1xuICBASW5wdXQoKSB6b29tID0gMTtcbiAgQElucHV0KCkgZm9udEZhbWlseSA9ICdzYW5zLXNlcmlmJztcbiAgQElucHV0KCkgZm9udFNpemUgPSAyNDtcbiAgQElucHV0KCkgZGFzaGFycmF5ID0gJyc7XG4gIEBJbnB1dCgpIGRhc2hvZmZzZXQgPSAwO1xuICBASW5wdXQoKSB4ID0gMDtcbiAgQElucHV0KCkgeSA9IDA7XG4gIEBJbnB1dCgpIGVuYWJsZUdyaWQgPSBmYWxzZTtcbiAgQElucHV0KCkgZ3JpZFNpemUgPSAxMDtcbiAgQElucHV0KCkgc25hcFRvR3JpZCA9IGZhbHNlO1xuICBASW5wdXQoKSBwZXJzaXN0ZW5jZUlkOiBzdHJpbmd8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIEBPdXRwdXQoKSByZWFkeSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGRhdGFDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPFdoaXRlYm9hcmRFbGVtZW50W10+KCk7XG4gIEBPdXRwdXQoKSBjbGVhciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIHVuZG8gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSByZWRvID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgc2F2ZSA9IG5ldyBFdmVudEVtaXR0ZXI8c3RyaW5nPigpO1xuICBAT3V0cHV0KCkgaW1hZ2VBZGRlZCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIHNlbGVjdEVsZW1lbnQgPSBuZXcgRXZlbnRFbWl0dGVyPFdoaXRlYm9hcmRFbGVtZW50IHwgbnVsbD4oKTtcbiAgQE91dHB1dCgpIGRlbGV0ZUVsZW1lbnQgPSBuZXcgRXZlbnRFbWl0dGVyPFdoaXRlYm9hcmRFbGVtZW50PigpO1xuICBAT3V0cHV0KCkgdG9vbENoYW5nZWQgPSBuZXcgRXZlbnRFbWl0dGVyPFRvb2xzRW51bT4oKTtcblxuICBwcml2YXRlIHNlbGVjdGlvbiE6IFNlbGVjdGlvbjxFbGVtZW50LCB1bmtub3duLCBudWxsLCB1bmRlZmluZWQ+O1xuXG4gIHByaXZhdGUgX3N1YnNjcmlwdGlvbkxpc3Q6IFN1YnNjcmlwdGlvbltdID0gW107XG5cbiAgcHJpdmF0ZSBfaW5pdGlhbERhdGE6IFdoaXRlYm9hcmRFbGVtZW50W10gPSBbXTtcbiAgcHJpdmF0ZSB1bmRvU3RhY2s6IFdoaXRlYm9hcmRFbGVtZW50W11bXSA9IFtdO1xuICBwcml2YXRlIHJlZG9TdGFjazogV2hpdGVib2FyZEVsZW1lbnRbXVtdID0gW107XG4gIHByaXZhdGUgX3NlbGVjdGVkVG9vbDogVG9vbHNFbnVtID0gVG9vbHNFbnVtLkJSVVNIO1xuICBzZWxlY3RlZEVsZW1lbnQhOiBXaGl0ZWJvYXJkRWxlbWVudDtcblxuICB0eXBlcyA9IEVsZW1lbnRUeXBlRW51bTtcbiAgdG9vbHMgPSBUb29sc0VudW07XG5cbiAgdGVtcEVsZW1lbnQhOiBXaGl0ZWJvYXJkRWxlbWVudDtcbiAgdGVtcERyYXchOiBbbnVtYmVyLCBudW1iZXJdW107XG5cbiAgcnViYmVyQm94ID0ge1xuICAgIHg6IDAsXG4gICAgeTogMCxcbiAgICB3aWR0aDogMCxcbiAgICBoZWlnaHQ6IDAsXG4gICAgZGlzcGxheTogJ25vbmUnLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgd2hpdGVib2FyZFNlcnZpY2U6IE5nV2hpdGVib2FyZFNlcnZpY2UpIHt9XG5cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgdGhpcy5faW5pdElucHV0c0Zyb21PcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdE9ic2VydmFibGVzKCk7XG4gICAgdGhpcy5faW5pdGlhbERhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZGF0YSkpO1xuICAgIGlmICh0aGlzLnBlcnNpc3RlbmNlSWQpIHtcbiAgICAgIGNvbnN0IHN0b3JlZCA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oYHdoaXRlYmFvcmRfJHt0aGlzLnBlcnNpc3RlbmNlSWR9YCl8fCdudWxsJyk7XG4gICAgICBpZiAoc3RvcmVkKSB7XG4gICAgICAgIHRoaXMuX2RhdGEubmV4dChzdG9yZWQuZGF0YSB8fCBbXSk7XG4gICAgICAgIHRoaXMudW5kb1N0YWNrID0gc3RvcmVkLnVuZG9TdGFjayB8fCBbXTtcbiAgICAgICAgdGhpcy5yZWRvU3RhY2sgPSBzdG9yZWQucmVkb1N0YWNrIHx8IFtdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiB2b2lkIHtcbiAgICBpZiAoY2hhbmdlc1snb3B0aW9ucyddKSB7XG4gICAgICAvLyYmICFpc0VxdWFsKGNoYW5nZXMub3B0aW9ucy5jdXJyZW50VmFsdWUsIGNoYW5nZXMub3B0aW9ucy5wcmV2aW91c1ZhbHVlKVxuICAgICAgdGhpcy5faW5pdElucHV0c0Zyb21PcHRpb25zKGNoYW5nZXNbJ29wdGlvbnMnXS5jdXJyZW50VmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICB0aGlzLnNlbGVjdGlvbiA9IHNlbGVjdDxFbGVtZW50LCB1bmtub3duPih0aGlzLnN2Z0NvbnRhaW5lci5uYXRpdmVFbGVtZW50KTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMucmVzaXplU2NyZWVuKCk7XG4gICAgfSwgMCk7XG4gICAgdGhpcy5pbml0YWxpemVFdmVudHModGhpcy5zZWxlY3Rpb24pO1xuICAgIHRoaXMucmVhZHkuZW1pdCgpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5mb3JFYWNoKChzdWJzY3JpcHRpb24pID0+IHRoaXMuX3Vuc3Vic2NyaWJlKHN1YnNjcmlwdGlvbikpO1xuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdElucHV0c0Zyb21PcHRpb25zKG9wdGlvbnM6IFdoaXRlYm9hcmRPcHRpb25zKTogdm9pZCB7XG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgIGlmIChvcHRpb25zLmRyYXdpbmdFbmFibGVkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmRyYXdpbmdFbmFibGVkID0gb3B0aW9ucy5kcmF3aW5nRW5hYmxlZDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnNlbGVjdGVkVG9vbCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFRvb2wgPSBvcHRpb25zLnNlbGVjdGVkVG9vbDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmNhbnZhc1dpZHRoICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmNhbnZhc1dpZHRoID0gb3B0aW9ucy5jYW52YXNXaWR0aDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmNhbnZhc0hlaWdodCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jYW52YXNIZWlnaHQgPSBvcHRpb25zLmNhbnZhc0hlaWdodDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZ1bGxTY3JlZW4gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZnVsbFNjcmVlbiA9IG9wdGlvbnMuZnVsbFNjcmVlbjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmNlbnRlciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jZW50ZXIgPSBvcHRpb25zLmNlbnRlcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnN0cm9rZUNvbG9yICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnN0cm9rZUNvbG9yID0gb3B0aW9ucy5zdHJva2VDb2xvcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnN0cm9rZVdpZHRoICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnN0cm9rZVdpZHRoID0gb3B0aW9ucy5zdHJva2VXaWR0aDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmJhY2tncm91bmRDb2xvciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSBvcHRpb25zLmJhY2tncm91bmRDb2xvcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmxpbmVKb2luICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmxpbmVKb2luID0gb3B0aW9ucy5saW5lSm9pbjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmxpbmVDYXAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubGluZUNhcCA9IG9wdGlvbnMubGluZUNhcDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZpbGwgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZmlsbCA9IG9wdGlvbnMuZmlsbDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnpvb20gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuem9vbSA9IG9wdGlvbnMuem9vbTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZvbnRGYW1pbHkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZm9udEZhbWlseSA9IG9wdGlvbnMuZm9udEZhbWlseTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZvbnRTaXplICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmZvbnRTaXplID0gb3B0aW9ucy5mb250U2l6ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmRhc2hhcnJheSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5kYXNoYXJyYXkgPSBvcHRpb25zLmRhc2hhcnJheTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmRhc2hvZmZzZXQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZGFzaG9mZnNldCA9IG9wdGlvbnMuZGFzaG9mZnNldDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnggIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueCA9IG9wdGlvbnMueDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueSA9IG9wdGlvbnMueTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmVuYWJsZUdyaWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZW5hYmxlR3JpZCA9IG9wdGlvbnMuZW5hYmxlR3JpZDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmdyaWRTaXplICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmdyaWRTaXplID0gb3B0aW9ucy5ncmlkU2l6ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnNuYXBUb0dyaWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuc25hcFRvR3JpZCA9IG9wdGlvbnMuc25hcFRvR3JpZDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnBlcnNpc3RlbmNlSWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMucGVyc2lzdGVuY2VJZCA9IG9wdGlvbnMucGVyc2lzdGVuY2VJZDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9pbml0T2JzZXJ2YWJsZXMoKTogdm9pZCB7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKFxuICAgICAgdGhpcy53aGl0ZWJvYXJkU2VydmljZS5zYXZlU3ZnTWV0aG9kQ2FsbGVkJC5zdWJzY3JpYmUoKHsgbmFtZSwgZm9ybWF0IH0pID0+IHRoaXMuc2F2ZVN2ZyhuYW1lLCBmb3JtYXQpKVxuICAgICk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKFxuICAgICAgdGhpcy53aGl0ZWJvYXJkU2VydmljZS5hZGRJbWFnZU1ldGhvZENhbGxlZCQuc3Vic2NyaWJlKChpbWFnZSkgPT4gdGhpcy5oYW5kbGVEcmF3SW1hZ2UoaW1hZ2UpKVxuICAgICk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHRoaXMud2hpdGVib2FyZFNlcnZpY2UuZXJhc2VTdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLl9jbGVhclN2ZygpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHRoaXMud2hpdGVib2FyZFNlcnZpY2UucmVzZXRTdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLl9yZXNldCgpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHRoaXMud2hpdGVib2FyZFNlcnZpY2UudW5kb1N2Z01ldGhvZENhbGxlZCQuc3Vic2NyaWJlKCgpID0+IHRoaXMudW5kb0RyYXcoKSkpO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaCh0aGlzLndoaXRlYm9hcmRTZXJ2aWNlLnJlZG9TdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLnJlZG9EcmF3KCkpKTtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25MaXN0LnB1c2goZnJvbUV2ZW50KHdpbmRvdywgJ3Jlc2l6ZScpLnN1YnNjcmliZSgoKSA9PiB0aGlzLnJlc2l6ZVNjcmVlbigpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKFxuICAgICAgdGhpcy5fZGF0YS5waXBlKHNraXAoMSkpLnN1YnNjcmliZSgoZGF0YSkgPT4ge1xuICAgICAgICBsZXQgc3RvcmVkID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShgd2hpdGViYW9yZF8ke3RoaXMucGVyc2lzdGVuY2VJZH1gKXx8JycpO1xuICAgICAgICBzdG9yZWQuZGF0YSA9IGRhdGE7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGB3aGl0ZWJhb3JkXyR7dGhpcy5wZXJzaXN0ZW5jZUlkfWAsIEpTT04uc3RyaW5naWZ5KHN0b3JlZCkpO1xuICAgICAgICB0aGlzLmRhdGFDaGFuZ2UuZW1pdChkYXRhKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfVxuXG4gIGluaXRhbGl6ZUV2ZW50cyhzZWxlY3Rpb246IFNlbGVjdGlvbjxFbGVtZW50LCB1bmtub3duLCBudWxsLCB1bmRlZmluZWQ+KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmRyYXdpbmdFbmFibGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxldCBkcmFnZ2luZyA9IGZhbHNlO1xuXG4gICAgc2VsZWN0aW9uLmNhbGwoXG4gICAgICBkcmFnKClcbiAgICAgICAgLm9uKCdzdGFydCcsICgpID0+IHtcbiAgICAgICAgICBkcmFnZ2luZyA9IHRydWU7XG4gICAgICAgICAgdGhpcy5yZWRvU3RhY2sgPSBbXTtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUxvY2FsU3RvcmFnZSgpO1xuICAgICAgICAgIHRoaXMuaGFuZGxlU3RhcnRFdmVudCgpO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ2RyYWcnLCAoKSA9PiB7XG4gICAgICAgICAgaWYgKCFkcmFnZ2luZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmhhbmRsZURyYWdFdmVudCgpO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICBkcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMuaGFuZGxlRW5kRXZlbnQoKTtcbiAgICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgaGFuZGxlU3RhcnRFdmVudCgpIHtcbiAgICBzd2l0Y2ggKHRoaXMuc2VsZWN0ZWRUb29sKSB7XG4gICAgICBjYXNlIFRvb2xzRW51bS5CUlVTSDpcbiAgICAgICAgdGhpcy5oYW5kbGVTdGFydEJydXNoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uSU1BR0U6XG4gICAgICAgIHRoaXMuaGFuZGxlSW1hZ2VUb29sKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uTElORTpcbiAgICAgICAgdGhpcy5oYW5kbGVTdGFydExpbmUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5SRUNUOlxuICAgICAgICB0aGlzLmhhbmRsZVN0YXJ0UmVjdCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkVMTElQU0U6XG4gICAgICAgIHRoaXMuaGFuZGxlU3RhcnRFbGxpcHNlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uVEVYVDpcbiAgICAgICAgdGhpcy5oYW5kbGVUZXh0VG9vbCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlNFTEVDVDpcbiAgICAgICAgdGhpcy5oYW5kbGVTZWxlY3RUb29sKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uRVJBU0VSOlxuICAgICAgICB0aGlzLmhhbmRsZUVyYXNlclRvb2woKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgaGFuZGxlRHJhZ0V2ZW50KCkge1xuICAgIHN3aXRjaCAodGhpcy5zZWxlY3RlZFRvb2wpIHtcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkJSVVNIOlxuICAgICAgICB0aGlzLmhhbmRsZURyYWdCcnVzaCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkxJTkU6XG4gICAgICAgIHRoaXMuaGFuZGxlRHJhZ0xpbmUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5SRUNUOlxuICAgICAgICB0aGlzLmhhbmRsZURyYWdSZWN0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uRUxMSVBTRTpcbiAgICAgICAgdGhpcy5oYW5kbGVEcmFnRWxsaXBzZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlRFWFQ6XG4gICAgICAgIHRoaXMuaGFuZGxlVGV4dERyYWcoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgaGFuZGxlRW5kRXZlbnQoKSB7XG4gICAgc3dpdGNoICh0aGlzLnNlbGVjdGVkVG9vbCkge1xuICAgICAgY2FzZSBUb29sc0VudW0uQlJVU0g6XG4gICAgICAgIHRoaXMuaGFuZGxlRW5kQnJ1c2goKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5MSU5FOlxuICAgICAgICB0aGlzLmhhbmRsZUVuZExpbmUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5SRUNUOlxuICAgICAgICB0aGlzLmhhbmRsZUVuZFJlY3QoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5FTExJUFNFOlxuICAgICAgICB0aGlzLmhhbmRsZUVuZEVsbGlwc2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5URVhUOlxuICAgICAgICB0aGlzLmhhbmRsZVRleHRFbmQoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgLy8gSGFuZGxlIEJydXNoIHRvb2xcbiAgaGFuZGxlU3RhcnRCcnVzaCgpIHtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5CUlVTSCk7XG4gICAgdGhpcy50ZW1wRHJhdyA9IFt0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpXTtcbiAgICBlbGVtZW50LnZhbHVlID0gZDNMaW5lKHRoaXMudGVtcERyYXcpIGFzIHN0cmluZztcbiAgICBlbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggPSB0aGlzLnN0cm9rZVdpZHRoO1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBlbGVtZW50O1xuICB9XG4gIGhhbmRsZURyYWdCcnVzaCgpIHtcbiAgICB0aGlzLnRlbXBEcmF3LnB1c2godGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKSk7XG4gICAgdGhpcy50ZW1wRWxlbWVudC52YWx1ZSA9IGQzTGluZSh0aGlzLnRlbXBEcmF3KSBhcyBzdHJpbmc7XG4gIH1cbiAgaGFuZGxlRW5kQnJ1c2goKSB7XG4gICAgdGhpcy50ZW1wRHJhdy5wdXNoKHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSkpO1xuICAgIHRoaXMudGVtcEVsZW1lbnQudmFsdWUgPSBkM0xpbmUodGhpcy50ZW1wRHJhdykgYXMgc3RyaW5nO1xuICAgIHRoaXMuX3B1c2hUb0RhdGEodGhpcy50ZW1wRWxlbWVudCk7XG4gICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgIHRoaXMudGVtcERyYXcgPSBudWxsIGFzIG5ldmVyO1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICB9XG4gIC8vIEhhbmRsZSBJbWFnZSB0b29sXG4gIGhhbmRsZUltYWdlVG9vbCgpIHtcbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xuICAgIGlucHV0LmFjY2VwdCA9ICdpbWFnZS8qJztcbiAgICBpbnB1dC5vbmNoYW5nZSA9IChlKSA9PiB7XG4gICAgICBjb25zdCBmaWxlcyA9IChlLnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS5maWxlcztcbiAgICAgIGlmIChmaWxlcykge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICByZWFkZXIub25sb2FkID0gKGU6IFByb2dyZXNzRXZlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBpbWFnZSA9IChlLnRhcmdldCBhcyBGaWxlUmVhZGVyKS5yZXN1bHQgYXMgc3RyaW5nO1xuICAgICAgICAgIHRoaXMuaGFuZGxlRHJhd0ltYWdlKHsgaW1hZ2UsIHgsIHkgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGVzWzBdKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGlucHV0LmNsaWNrKCk7XG4gIH1cbiAgLy8gSGFuZGxlIERyYXcgSW1hZ2VcbiAgaGFuZGxlRHJhd0ltYWdlKGltYWdlU3JjOiBJQWRkSW1hZ2UpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdGVtcEltZyA9IG5ldyBJbWFnZSgpO1xuICAgICAgdGVtcEltZy5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHN2Z0hlaWdodCA9IHRoaXMuY2FudmFzSGVpZ2h0O1xuICAgICAgICBjb25zdCBpbWFnZVdpZHRoID0gdGVtcEltZy53aWR0aDtcbiAgICAgICAgY29uc3QgaW1hZ2VIZWlnaHQgPSB0ZW1wSW1nLmhlaWdodDtcbiAgICAgICAgY29uc3QgYXNwZWN0UmF0aW8gPSB0ZW1wSW1nLndpZHRoIC8gdGVtcEltZy5oZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IGltYWdlSGVpZ2h0ID4gc3ZnSGVpZ2h0ID8gc3ZnSGVpZ2h0IC0gNDAgOiBpbWFnZUhlaWdodDtcbiAgICAgICAgY29uc3Qgd2lkdGggPSBoZWlnaHQgPT09IHN2Z0hlaWdodCAtIDQwID8gKHN2Z0hlaWdodCAtIDQwKSAqIGFzcGVjdFJhdGlvIDogaW1hZ2VXaWR0aDtcblxuICAgICAgICBsZXQgeCA9IGltYWdlU3JjLnggfHwgKGltYWdlV2lkdGggLSB3aWR0aCkgKiAoaW1hZ2VTcmMueCB8fCAwKTtcbiAgICAgICAgbGV0IHkgPSBpbWFnZVNyYy55IHx8IChpbWFnZUhlaWdodCAtIGhlaWdodCkgKiAoaW1hZ2VTcmMueSB8fCAwKTtcblxuICAgICAgICBpZiAoeCA8IDApIHtcbiAgICAgICAgICB4ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoeSA8IDApIHtcbiAgICAgICAgICB5ID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLklNQUdFKTtcbiAgICAgICAgZWxlbWVudC52YWx1ZSA9IGltYWdlU3JjLmltYWdlIGFzIHN0cmluZztcbiAgICAgICAgZWxlbWVudC5vcHRpb25zLndpZHRoID0gd2lkdGg7XG4gICAgICAgIGVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIGVsZW1lbnQueCA9IHg7XG4gICAgICAgIGVsZW1lbnQueSA9IHk7XG4gICAgICAgIHRoaXMuX3B1c2hUb0RhdGEoZWxlbWVudCk7XG4gICAgICAgIHRoaXMuaW1hZ2VBZGRlZC5lbWl0KCk7XG4gICAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICAgIH07XG4gICAgICB0ZW1wSW1nLnNyYyA9IGltYWdlU3JjLmltYWdlIGFzIHN0cmluZztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBMaW5lIHRvb2xcbiAgaGFuZGxlU3RhcnRMaW5lKCkge1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLkxJTkUpO1xuICAgIGxldCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuXG4gICAgaWYgKHRoaXMuc25hcFRvR3JpZCkge1xuICAgICAgeCA9IHRoaXMuX3NuYXBUb0dyaWQoeCk7XG4gICAgICB5ID0gdGhpcy5fc25hcFRvR3JpZCh5KTtcbiAgICB9XG5cbiAgICBlbGVtZW50Lm9wdGlvbnMueDEgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy55MSA9IHk7XG4gICAgZWxlbWVudC5vcHRpb25zLngyID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMueTIgPSB5O1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBlbGVtZW50O1xuICB9XG4gIGhhbmRsZURyYWdMaW5lKCkge1xuICAgIGxldCBbeDIsIHkyXSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG5cbiAgICBpZiAodGhpcy5zbmFwVG9HcmlkKSB7XG4gICAgICB4MiA9IHRoaXMuX3NuYXBUb0dyaWQoeDIpO1xuICAgICAgeTIgPSB0aGlzLl9zbmFwVG9HcmlkKHkyKTtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQuc291cmNlRXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgIGNvbnN0IHgxID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngxIGFzIG51bWJlcjtcbiAgICAgIGNvbnN0IHkxID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkxIGFzIG51bWJlcjtcbiAgICAgIGNvbnN0IHsgeCwgeSB9ID0gdGhpcy5fc25hcFRvQW5nbGUoeDEsIHkxLCB4MiwgeTIpO1xuICAgICAgW3gyLCB5Ml0gPSBbeCwgeV07XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngyID0geDI7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkyID0geTI7XG4gIH1cbiAgaGFuZGxlRW5kTGluZSgpIHtcbiAgICBpZiAoXG4gICAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDEgIT0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngyIHx8XG4gICAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTEgIT0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkyXG4gICAgKSB7XG4gICAgICB0aGlzLl9wdXNoVG9EYXRhKHRoaXMudGVtcEVsZW1lbnQpO1xuICAgICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgICAgdGhpcy50ZW1wRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBSZWN0IHRvb2xcbiAgaGFuZGxlU3RhcnRSZWN0KCkge1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLlJFQ1QpO1xuICAgIGxldCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIGlmICh0aGlzLnNuYXBUb0dyaWQpIHtcbiAgICAgIHggPSB0aGlzLl9zbmFwVG9HcmlkKHgpO1xuICAgICAgeSA9IHRoaXMuX3NuYXBUb0dyaWQoeSk7XG4gICAgfVxuICAgIGVsZW1lbnQub3B0aW9ucy54MSA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLnkxID0geTtcbiAgICBlbGVtZW50Lm9wdGlvbnMueDIgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy55MiA9IHk7XG4gICAgZWxlbWVudC5vcHRpb25zLndpZHRoID0gMTtcbiAgICBlbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gMTtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gZWxlbWVudDtcbiAgfVxuICBoYW5kbGVEcmFnUmVjdCgpIHtcbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIGNvbnN0IHN0YXJ0X3ggPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDEgfHwgMDtcbiAgICBjb25zdCBzdGFydF95ID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkxIHx8IDA7XG4gICAgbGV0IHcgPSBNYXRoLmFicyh4IC0gc3RhcnRfeCk7XG4gICAgbGV0IGggPSBNYXRoLmFicyh5IC0gc3RhcnRfeSk7XG4gICAgbGV0IG5ld194ID0gbnVsbDtcbiAgICBsZXQgbmV3X3kgPSBudWxsO1xuXG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICB3ID0gaCA9IE1hdGgubWF4KHcsIGgpO1xuICAgICAgbmV3X3ggPSBzdGFydF94IDwgeCA/IHN0YXJ0X3ggOiBzdGFydF94IC0gdztcbiAgICAgIG5ld195ID0gc3RhcnRfeSA8IHkgPyBzdGFydF95IDogc3RhcnRfeSAtIGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ld194ID0gTWF0aC5taW4oc3RhcnRfeCwgeCk7XG4gICAgICBuZXdfeSA9IE1hdGgubWluKHN0YXJ0X3ksIHkpO1xuICAgIH1cbiAgICBpZiAoZXZlbnQuc291cmNlRXZlbnQuYWx0S2V5KSB7XG4gICAgICB3ICo9IDI7XG4gICAgICBoICo9IDI7XG4gICAgICBuZXdfeCA9IHN0YXJ0X3ggLSB3IC8gMjtcbiAgICAgIG5ld195ID0gc3RhcnRfeSAtIGggLyAyO1xuICAgIH1cbiAgICBpZiAodGhpcy5zbmFwVG9HcmlkKSB7XG4gICAgICB3ID0gdGhpcy5fc25hcFRvR3JpZCh3KTtcbiAgICAgIGggPSB0aGlzLl9zbmFwVG9HcmlkKGgpO1xuICAgICAgbmV3X3ggPSB0aGlzLl9zbmFwVG9HcmlkKG5ld194KTtcbiAgICAgIG5ld195ID0gdGhpcy5fc25hcFRvR3JpZChuZXdfeSk7XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoID0gdztcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gaDtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDIgPSBuZXdfeDtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTIgPSBuZXdfeTtcbiAgfVxuICBoYW5kbGVFbmRSZWN0KCkge1xuICAgIGlmICh0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMud2lkdGggIT0gMCB8fCB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ICE9IDApIHtcbiAgICAgIHRoaXMuX3B1c2hUb0RhdGEodGhpcy50ZW1wRWxlbWVudCk7XG4gICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgICB0aGlzLnRlbXBFbGVtZW50ID0gbnVsbCBhcyBuZXZlcjtcbiAgICB9XG4gIH1cbiAgLy8gSGFuZGxlIEVsbGlwc2UgdG9vbFxuICBoYW5kbGVTdGFydEVsbGlwc2UoKSB7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX2dlbmVyYXRlTmV3RWxlbWVudChFbGVtZW50VHlwZUVudW0uRUxMSVBTRSk7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcblxuICAgIC8vIHdvcmthcm91bmRcbiAgICBlbGVtZW50Lm9wdGlvbnMueDEgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy55MSA9IHk7XG5cbiAgICBlbGVtZW50Lm9wdGlvbnMuY3ggPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy5jeSA9IHk7XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IGVsZW1lbnQ7XG4gIH1cbiAgaGFuZGxlRHJhZ0VsbGlwc2UoKSB7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBjb25zdCBzdGFydF94ID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngxIHx8IDA7XG4gICAgY29uc3Qgc3RhcnRfeSA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MSB8fCAwO1xuICAgIGxldCBjeCA9IE1hdGguYWJzKHN0YXJ0X3ggKyAoeCAtIHN0YXJ0X3gpIC8gMik7XG4gICAgbGV0IGN5ID0gTWF0aC5hYnMoc3RhcnRfeSArICh5IC0gc3RhcnRfeSkgLyAyKTtcbiAgICBsZXQgcnggPSBNYXRoLmFicyhzdGFydF94IC0gY3gpO1xuICAgIGxldCByeSA9IE1hdGguYWJzKHN0YXJ0X3kgLSBjeSk7XG5cbiAgICBpZiAoZXZlbnQuc291cmNlRXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgIHJ5ID0gcng7XG4gICAgICBjeSA9IHkgPiBzdGFydF95ID8gc3RhcnRfeSArIHJ4IDogc3RhcnRfeSAtIHJ4O1xuICAgIH1cbiAgICBpZiAoZXZlbnQuc291cmNlRXZlbnQuYWx0S2V5KSB7XG4gICAgICBjeCA9IHN0YXJ0X3g7XG4gICAgICBjeSA9IHN0YXJ0X3k7XG4gICAgICByeCA9IE1hdGguYWJzKHggLSBjeCk7XG4gICAgICByeSA9IGV2ZW50LnNvdXJjZUV2ZW50LnNoaWZ0S2V5ID8gcnggOiBNYXRoLmFicyh5IC0gY3kpO1xuICAgIH1cblxuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5yeCA9IHJ4O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5yeSA9IHJ5O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5jeCA9IGN4O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5jeSA9IGN5O1xuICB9XG4gIGhhbmRsZUVuZEVsbGlwc2UoKSB7XG4gICAgaWYgKHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5yeCAhPSAwIHx8IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5yeSAhPSAwKSB7XG4gICAgICB0aGlzLl9wdXNoVG9EYXRhKHRoaXMudGVtcEVsZW1lbnQpO1xuICAgICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgICAgdGhpcy50ZW1wRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBUZXh0IHRvb2xcbiAgaGFuZGxlVGV4dFRvb2woKSB7XG4gICAgaWYgKHRoaXMudGVtcEVsZW1lbnQpIHtcbiAgICAgIC8vIGZpbmlzaCB0aGUgY3VycmVudCBvbmUgaWYgbmVlZGVkXG4gICAgICB0aGlzLmZpbmlzaFRleHRJbnB1dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5URVhUKTtcbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIGVsZW1lbnQub3B0aW9ucy50b3AgPSB5O1xuICAgIGVsZW1lbnQub3B0aW9ucy5sZWZ0ID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggPSAwO1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy50ZXh0SW5wdXQubmF0aXZlRWxlbWVudC5mb2N1cygpO1xuICAgIH0sIDApO1xuICB9XG4gIGhhbmRsZVRleHREcmFnKCkge1xuICAgIGlmICghdGhpcy50ZW1wRWxlbWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy50b3AgPSB5O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5sZWZ0ID0geDtcbiAgfVxuICBoYW5kbGVUZXh0RW5kKCkge1xuICAgIGlmICghdGhpcy50ZW1wRWxlbWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gIH1cbiAgLy8gSGFuZGxlIFNlbGVjdCB0b29sXG4gIGhhbmRsZVNlbGVjdFRvb2woKSB7XG4gICAgY29uc3QgbW91c2VfdGFyZ2V0ID0gdGhpcy5fZ2V0TW91c2VUYXJnZXQoKTtcbiAgICBpZiAobW91c2VfdGFyZ2V0KSB7XG4gICAgICBpZiAobW91c2VfdGFyZ2V0LmlkID09PSAnc2VsZWN0b3JHcm91cCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgaWQgPSBtb3VzZV90YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLXdiLWlkJyk7XG4gICAgICBjb25zdCBzZWxlY3RlZEVsZW1lbnQgPSB0aGlzLmRhdGEuZmluZCgoZWwpID0+IGVsLmlkID09PSBpZCkgYXMgV2hpdGVib2FyZEVsZW1lbnQ7XG4gICAgICB0aGlzLnNldFNlbGVjdGVkRWxlbWVudChzZWxlY3RlZEVsZW1lbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNsZWFyU2VsZWN0ZWRFbGVtZW50KCk7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBFcmFzZXIgdG9vbFxuICBoYW5kbGVFcmFzZXJUb29sKCkge1xuICAgIGNvbnN0IG1vdXNlX3RhcmdldCA9IHRoaXMuX2dldE1vdXNlVGFyZ2V0KCk7XG4gICAgaWYgKG1vdXNlX3RhcmdldCkge1xuICAgICAgY29uc3QgaWQgPSBtb3VzZV90YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLXdiLWlkJyk7XG4gICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5kYXRhLmZpbmQoKGVsKSA9PiBlbC5pZCA9PT0gaWQpIGFzIFdoaXRlYm9hcmRFbGVtZW50O1xuICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5kYXRhID0gdGhpcy5kYXRhLmZpbHRlcigoZWwpID0+IGVsLmlkICE9PSBpZCk7XG4gICAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICAgICAgdGhpcy5kZWxldGVFbGVtZW50LmVtaXQoZWxlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIGNvbnZlcnQgdGhlIHZhbHVlIG9mIHRoaXMudGV4dElucHV0Lm5hdGl2ZUVsZW1lbnQgdG8gYW4gU1ZHIHRleHQgbm9kZSwgdW5sZXNzIGl0J3MgZW1wdHksXG4gIC8vIGFuZCB0aGVuIGRpc21pc3MgdGhpcy50ZXh0SW5wdXQubmF0aXZlRWxlbWVudFxuICBmaW5pc2hUZXh0SW5wdXQoKSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnRleHRJbnB1dC5uYXRpdmVFbGVtZW50LnZhbHVlO1xuICAgIHRoaXMudGVtcEVsZW1lbnQudmFsdWUgPSB2YWx1ZTtcbiAgICBpZiAodGhpcy50ZW1wRWxlbWVudC52YWx1ZSkge1xuICAgICAgdGhpcy5fcHVzaFRvRGF0YSh0aGlzLnRlbXBFbGVtZW50KTtcbiAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICB9XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gIH1cbiAgLy8gSGFuZGxlIFRleHQgSW5wdXRcbiAgdXBkYXRlVGV4dEl0ZW0odmFsdWU6IHN0cmluZykge1xuICAgIGlmICh0aGlzLnRlbXBFbGVtZW50ICYmIHRoaXMuc2VsZWN0ZWRUb29sID09IFRvb2xzRW51bS5URVhUKSB7XG4gICAgICB0aGlzLnRlbXBFbGVtZW50LnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICB9XG4gIHNldFNlbGVjdGVkRWxlbWVudChlbGVtZW50OiBXaGl0ZWJvYXJkRWxlbWVudCkge1xuICAgIHRoaXMuc2VsZWN0ZWRUb29sID0gVG9vbHNFbnVtLlNFTEVDVDtcbiAgICBjb25zdCBjdXJyZW50QkJveCA9IHRoaXMuX2dldEVsZW1lbnRCYm94KGVsZW1lbnQpO1xuICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLnNlbGVjdEVsZW1lbnQuZW1pdChlbGVtZW50KTtcbiAgICB0aGlzLl9zaG93R3JpcHMoY3VycmVudEJCb3gpO1xuICB9XG4gIGNsZWFyU2VsZWN0ZWRFbGVtZW50KCkge1xuICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50ID0gbnVsbCBhcyBuZXZlcjtcbiAgICB0aGlzLnJ1YmJlckJveC5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIHRoaXMuc2VsZWN0RWxlbWVudC5lbWl0KG51bGwpO1xuICB9XG4gIHByaXZhdGUgc2F2ZVN2ZyhuYW1lOiBzdHJpbmcsIGZvcm1hdDogZm9ybWF0VHlwZXMpIHtcbiAgICBjb25zdCBzdmdDYW52YXMgPSB0aGlzLnNlbGVjdGlvbi5zZWxlY3QoJyNzdmdjb250ZW50JykuY2xvbmUodHJ1ZSk7XG4gICAgc3ZnQ2FudmFzLnNlbGVjdCgnI3NlbGVjdG9yUGFyZW50R3JvdXAnKS5yZW1vdmUoKTtcbiAgICAoc3ZnQ2FudmFzLnNlbGVjdCgnI2NvbnRlbnRCYWNrZ3JvdW5kJykubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZSgnb3BhY2l0eScpO1xuICAgIGNvbnN0IHN2ZyA9IHN2Z0NhbnZhcy5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudDtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd4JywgJzAnKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd5JywgJzAnKTtcblxuICAgIGNvbnN0IHN2Z1N0cmluZyA9IHRoaXMuc2F2ZUFzU3ZnKHN2ZyBhcyBFbGVtZW50KTtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSBGb3JtYXRUeXBlLkJhc2U2NDpcbiAgICAgICAgdGhpcy5zdmdTdHJpbmcySW1hZ2Uoc3ZnU3RyaW5nLCB0aGlzLmNhbnZhc1dpZHRoLCB0aGlzLmNhbnZhc0hlaWdodCwgZm9ybWF0LCAoaW1nKSA9PiB7XG4gICAgICAgICAgdGhpcy5zYXZlLmVtaXQoaW1nKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBGb3JtYXRUeXBlLlN2Zzoge1xuICAgICAgICBjb25zdCBpbWdTcmMgPSAnZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCwnICsgYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3ZnU3RyaW5nKSkpO1xuICAgICAgICB0aGlzLmRvd25sb2FkKGltZ1NyYywgbmFtZSk7XG4gICAgICAgIHRoaXMuc2F2ZS5lbWl0KGltZ1NyYyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5zdmdTdHJpbmcySW1hZ2Uoc3ZnU3RyaW5nLCB0aGlzLmNhbnZhc1dpZHRoLCB0aGlzLmNhbnZhc0hlaWdodCwgZm9ybWF0LCAoaW1nKSA9PiB7XG4gICAgICAgICAgdGhpcy5kb3dubG9hZChpbWcsIG5hbWUpO1xuICAgICAgICAgIHRoaXMuc2F2ZS5lbWl0KGltZyk7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgc3ZnQ2FudmFzLnJlbW92ZSgpO1xuICB9XG4gIHByaXZhdGUgc3ZnU3RyaW5nMkltYWdlKFxuICAgIHN2Z1N0cmluZzogc3RyaW5nLFxuICAgIHdpZHRoOiBudW1iZXIsXG4gICAgaGVpZ2h0OiBudW1iZXIsXG4gICAgZm9ybWF0OiBzdHJpbmcsXG4gICAgY2FsbGJhY2s6IChpbWc6IHN0cmluZykgPT4gdm9pZFxuICApIHtcbiAgICAvLyBzZXQgZGVmYXVsdCBmb3IgZm9ybWF0IHBhcmFtZXRlclxuICAgIGZvcm1hdCA9IGZvcm1hdCB8fCAncG5nJztcbiAgICAvLyBTVkcgZGF0YSBVUkwgZnJvbSBTVkcgc3RyaW5nXG4gICAgY29uc3Qgc3ZnRGF0YSA9ICdkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LCcgKyBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzdmdTdHJpbmcpKSk7XG4gICAgLy8gY3JlYXRlIGNhbnZhcyBpbiBtZW1vcnkobm90IGluIERPTSlcbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAvLyBnZXQgY2FudmFzIGNvbnRleHQgZm9yIGRyYXdpbmcgb24gY2FudmFzXG4gICAgY29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpIGFzIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDtcbiAgICAvLyBzZXQgY2FudmFzIHNpemVcbiAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIC8vIGNyZWF0ZSBpbWFnZSBpbiBtZW1vcnkobm90IGluIERPTSlcbiAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuICAgIC8vIGxhdGVyIHdoZW4gaW1hZ2UgbG9hZHMgcnVuIHRoaXNcbiAgICBpbWFnZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAvLyBhc3luYyAoaGFwcGVucyBsYXRlcilcbiAgICAgIC8vIGNsZWFyIGNhbnZhc1xuICAgICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAvLyBkcmF3IGltYWdlIHdpdGggU1ZHIGRhdGEgdG8gY2FudmFzXG4gICAgICBjb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAvLyBzbmFwc2hvdCBjYW52YXMgYXMgcG5nXG4gICAgICBjb25zdCBwbmdEYXRhID0gY2FudmFzLnRvRGF0YVVSTCgnaW1hZ2UvJyArIGZvcm1hdCk7XG4gICAgICAvLyBwYXNzIHBuZyBkYXRhIFVSTCB0byBjYWxsYmFja1xuICAgICAgY2FsbGJhY2socG5nRGF0YSk7XG4gICAgfTsgLy8gZW5kIGFzeW5jXG4gICAgLy8gc3RhcnQgbG9hZGluZyBTVkcgZGF0YSBpbnRvIGluIG1lbW9yeSBpbWFnZVxuICAgIGltYWdlLnNyYyA9IHN2Z0RhdGE7XG4gIH1cbiAgcHJpdmF0ZSBzYXZlQXNTdmcoc3ZnTm9kZTogRWxlbWVudCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc2VyaWFsaXplciA9IG5ldyBYTUxTZXJpYWxpemVyKCk7XG4gICAgbGV0IHN2Z1N0cmluZyA9IHNlcmlhbGl6ZXIuc2VyaWFsaXplVG9TdHJpbmcoc3ZnTm9kZSk7XG4gICAgc3ZnU3RyaW5nID0gc3ZnU3RyaW5nLnJlcGxhY2UoLyhcXHcrKT86P3hsaW5rPS9nLCAneG1sbnM6eGxpbms9Jyk7IC8vIEZpeCByb290IHhsaW5rIHdpdGhvdXQgbmFtZXNwYWNlXG4gICAgc3ZnU3RyaW5nID0gc3ZnU3RyaW5nLnJlcGxhY2UoL05TXFxkKzpocmVmL2csICd4bGluazpocmVmJyk7XG4gICAgcmV0dXJuIHN2Z1N0cmluZztcbiAgfVxuICBwcml2YXRlIGRvd25sb2FkKHVybDogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgIGxpbmsuaHJlZiA9IHVybDtcbiAgICBsaW5rLnNldEF0dHJpYnV0ZSgndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICBsaW5rLmRvd25sb2FkID0gbmFtZSB8fCAnbmV3IHdoaXRlLWJvYXJkJztcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgIGxpbmsuY2xpY2soKTtcbiAgfVxuICBwcml2YXRlIF9wdXNoVG9EYXRhKGVsZW1lbnQ6IFdoaXRlYm9hcmRFbGVtZW50KSB7XG4gICAgdGhpcy5kYXRhLnB1c2goZWxlbWVudCk7XG4gICAgdGhpcy5fZGF0YS5uZXh0KHRoaXMuZGF0YSk7XG4gIH1cbiAgcHJpdmF0ZSBfY2xlYXJTdmcoKSB7XG4gICAgdGhpcy5kYXRhID0gW107XG4gICAgdGhpcy5fZGF0YS5uZXh0KHRoaXMuZGF0YSk7XG4gICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgIHRoaXMuY2xlYXIuZW1pdCgpO1xuICB9XG4gIHByaXZhdGUgdW5kb0RyYXcoKSB7XG4gICAgaWYgKCF0aGlzLnVuZG9TdGFjay5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY3VycmVudFN0YXRlID0gdGhpcy51bmRvU3RhY2sucG9wKCk7XG4gICAgdGhpcy5yZWRvU3RhY2sucHVzaChjdXJyZW50U3RhdGUgYXMgV2hpdGVib2FyZEVsZW1lbnRbXSk7XG4gICAgaWYodGhpcy51bmRvU3RhY2subGVuZ3RoKXtcbiAgICAgIHRoaXMuZGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy51bmRvU3RhY2tbdGhpcy51bmRvU3RhY2subGVuZ3RoLTFdKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5faW5pdGlhbERhdGEpKSB8fCBbXTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGVMb2NhbFN0b3JhZ2UoKTtcbiAgICB0aGlzLnVuZG8uZW1pdCgpO1xuICB9XG4gIHByaXZhdGUgcmVkb0RyYXcoKSB7XG4gICAgaWYgKCF0aGlzLnJlZG9TdGFjay5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY3VycmVudFN0YXRlID0gdGhpcy5yZWRvU3RhY2sucG9wKCk7XG4gICAgdGhpcy51bmRvU3RhY2sucHVzaChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN1cnJlbnRTdGF0ZSkpIGFzIFdoaXRlYm9hcmRFbGVtZW50W10pO1xuICAgIHRoaXMuZGF0YSA9IGN1cnJlbnRTdGF0ZSB8fCBbXTtcbiAgICB0aGlzLnVwZGF0ZUxvY2FsU3RvcmFnZSgpO1xuICAgIHRoaXMucmVkby5lbWl0KCk7XG4gIH1cbiAgcHJpdmF0ZSBfcHVzaFRvVW5kbygpIHtcbiAgICB0aGlzLnVuZG9TdGFjay5wdXNoKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5kYXRhKSkpO1xuICAgIHRoaXMudXBkYXRlTG9jYWxTdG9yYWdlKCk7XG4gIH1cbiAgcHJpdmF0ZSBfcmVzZXQoKTogdm9pZCB7XG4gICAgdGhpcy51bmRvU3RhY2sgPSBbXTtcbiAgICB0aGlzLnJlZG9TdGFjayA9IFtdO1xuICAgIHRoaXMuZGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5faW5pdGlhbERhdGEpKTtcbiAgICB0aGlzLnVwZGF0ZUxvY2FsU3RvcmFnZSgpO1xuICB9XG4gIHByaXZhdGUgdXBkYXRlTG9jYWxTdG9yYWdlKCk6IHZvaWQge1xuICAgIGNvbnN0IHN0b3JhZ2VPYmplY3QgPSB7ZGF0YTogdGhpcy5kYXRhLCB1bmRvU3RhY2s6IHRoaXMudW5kb1N0YWNrLCByZWRvU3RhY2s6IHRoaXMucmVkb1N0YWNrfTtcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShgd2hpdGViYW9yZF8ke3RoaXMucGVyc2lzdGVuY2VJZH1gLCBKU09OLnN0cmluZ2lmeShzdG9yYWdlT2JqZWN0KSk7XG4gIH1cbiAgcHJpdmF0ZSBfZ2VuZXJhdGVOZXdFbGVtZW50KG5hbWU6IEVsZW1lbnRUeXBlRW51bSk6IFdoaXRlYm9hcmRFbGVtZW50IHtcbiAgICBjb25zdCBlbGVtZW50ID0gbmV3IFdoaXRlYm9hcmRFbGVtZW50KG5hbWUsIHtcbiAgICAgIHN0cm9rZVdpZHRoOiB0aGlzLnN0cm9rZVdpZHRoLFxuICAgICAgc3Ryb2tlQ29sb3I6IHRoaXMuc3Ryb2tlQ29sb3IsXG4gICAgICBmaWxsOiB0aGlzLmZpbGwsXG4gICAgICBsaW5lSm9pbjogdGhpcy5saW5lSm9pbixcbiAgICAgIGxpbmVDYXA6IHRoaXMubGluZUNhcCxcbiAgICAgIGZvbnRTaXplOiB0aGlzLmZvbnRTaXplLFxuICAgICAgZm9udEZhbWlseTogdGhpcy5mb250RmFtaWx5LFxuICAgICAgZGFzaGFycmF5OiB0aGlzLmRhc2hhcnJheSxcbiAgICAgIGRhc2hvZmZzZXQ6IHRoaXMuZGFzaG9mZnNldCxcbiAgICB9KTtcbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuICBwcml2YXRlIF9jYWxjdWxhdGVYQW5kWShbeCwgeV06IFtudW1iZXIsIG51bWJlcl0pOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgICByZXR1cm4gWyh4IC0gdGhpcy54KSAvIHRoaXMuem9vbSwgKHkgLSB0aGlzLnkpIC8gdGhpcy56b29tXTtcbiAgfVxuICBwcml2YXRlIHJlc2l6ZVNjcmVlbigpIHtcbiAgICBjb25zdCBzdmdDb250YWluZXIgPSB0aGlzLnN2Z0NvbnRhaW5lci5uYXRpdmVFbGVtZW50O1xuICAgIGlmICh0aGlzLmZ1bGxTY3JlZW4pIHtcbiAgICAgIHRoaXMuY2FudmFzV2lkdGggPSBzdmdDb250YWluZXIuY2xpZW50V2lkdGg7XG4gICAgICB0aGlzLmNhbnZhc0hlaWdodCA9IHN2Z0NvbnRhaW5lci5jbGllbnRIZWlnaHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLmNlbnRlcikge1xuICAgICAgdGhpcy54ID0gc3ZnQ29udGFpbmVyLmNsaWVudFdpZHRoIC8gMiAtIHRoaXMuY2FudmFzV2lkdGggLyAyO1xuICAgICAgdGhpcy55ID0gc3ZnQ29udGFpbmVyLmNsaWVudEhlaWdodCAvIDIgLSB0aGlzLmNhbnZhc0hlaWdodCAvIDI7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3NuYXBUb0FuZ2xlKHgxOiBudW1iZXIsIHkxOiBudW1iZXIsIHgyOiBudW1iZXIsIHkyOiBudW1iZXIpIHtcbiAgICBjb25zdCBzbmFwID0gTWF0aC5QSSAvIDQ7IC8vIDQ1IGRlZ3JlZXNcbiAgICBjb25zdCBkeCA9IHgyIC0geDE7XG4gICAgY29uc3QgZHkgPSB5MiAtIHkxO1xuICAgIGNvbnN0IGFuZ2xlID0gTWF0aC5hdGFuMihkeSwgZHgpO1xuICAgIGNvbnN0IGRpc3QgPSBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xuICAgIGNvbnN0IHNuYXBhbmdsZSA9IE1hdGgucm91bmQoYW5nbGUgLyBzbmFwKSAqIHNuYXA7XG4gICAgY29uc3QgeCA9IHgxICsgZGlzdCAqIE1hdGguY29zKHNuYXBhbmdsZSk7XG4gICAgY29uc3QgeSA9IHkxICsgZGlzdCAqIE1hdGguc2luKHNuYXBhbmdsZSk7XG4gICAgcmV0dXJuIHsgeDogeCwgeTogeSwgYTogc25hcGFuZ2xlIH07XG4gIH1cbiAgcHJpdmF0ZSBfc25hcFRvR3JpZChuOiBudW1iZXIpIHtcbiAgICBjb25zdCBzbmFwID0gdGhpcy5ncmlkU2l6ZTtcbiAgICBjb25zdCBuMSA9IE1hdGgucm91bmQobiAvIHNuYXApICogc25hcDtcbiAgICByZXR1cm4gbjE7XG4gIH1cbiAgcHJpdmF0ZSBfZ2V0RWxlbWVudEJib3goZWxlbWVudDogV2hpdGVib2FyZEVsZW1lbnQpOiBET01SZWN0IHtcbiAgICBjb25zdCBlbCA9IHRoaXMuc2VsZWN0aW9uLnNlbGVjdChgI2l0ZW1fJHtlbGVtZW50LmlkfWApLm5vZGUoKSBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgY29uc3QgYmJveCA9IGVsLmdldEJCb3goKTtcbiAgICByZXR1cm4gYmJveDtcbiAgfVxuICBwcml2YXRlIF9nZXRNb3VzZVRhcmdldCgpOiBTVkdHcmFwaGljc0VsZW1lbnQgfCBudWxsIHtcbiAgICBjb25zdCBldnQ6IEV2ZW50ID0gZXZlbnQuc291cmNlRXZlbnQ7XG4gICAgaWYgKGV2dCA9PSBudWxsIHx8IGV2dC50YXJnZXQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGxldCBtb3VzZV90YXJnZXQgPSBldnQudGFyZ2V0IGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICBpZiAobW91c2VfdGFyZ2V0LmlkID09PSAnc3Zncm9vdCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAobW91c2VfdGFyZ2V0LnBhcmVudE5vZGUpIHtcbiAgICAgIG1vdXNlX3RhcmdldCA9IG1vdXNlX3RhcmdldC5wYXJlbnROb2RlLnBhcmVudE5vZGUgYXMgU1ZHR3JhcGhpY3NFbGVtZW50O1xuICAgICAgaWYgKG1vdXNlX3RhcmdldC5pZCA9PT0gJ3NlbGVjdG9yR3JvdXAnKSB7XG4gICAgICAgIHJldHVybiBtb3VzZV90YXJnZXQ7XG4gICAgICB9XG4gICAgICB3aGlsZSAoIW1vdXNlX3RhcmdldC5pZC5pbmNsdWRlcygnaXRlbV8nKSkge1xuICAgICAgICBpZiAobW91c2VfdGFyZ2V0LmlkID09PSAnc3Zncm9vdCcpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBtb3VzZV90YXJnZXQgPSBtb3VzZV90YXJnZXQucGFyZW50Tm9kZSBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtb3VzZV90YXJnZXQ7XG4gIH1cbiAgcHJpdmF0ZSBfc2hvd0dyaXBzKGJib3g6IERPTVJlY3QpIHtcbiAgICB0aGlzLnJ1YmJlckJveCA9IHtcbiAgICAgIHg6IGJib3gueCAtICgodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aCBhcyBudW1iZXIpIHx8IDApICogMC41LFxuICAgICAgeTogYmJveC55IC0gKCh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoIGFzIG51bWJlcikgfHwgMCkgKiAwLjUsXG4gICAgICB3aWR0aDogYmJveC53aWR0aCArICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoIGFzIG51bWJlcikgfHwgMCxcbiAgICAgIGhlaWdodDogYmJveC5oZWlnaHQgKyAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aCBhcyBudW1iZXIpIHx8IDAsXG4gICAgICBkaXNwbGF5OiAnYmxvY2snLFxuICAgIH07XG4gIH1cbiAgbW92ZVNlbGVjdChkb3duRXZlbnQ6IFBvaW50ZXJFdmVudCkge1xuICAgIGxldCBpc1BvaW50ZXJEb3duID0gdHJ1ZTtcbiAgICBjb25zdCBlbGVtZW50ID0gZG93bkV2ZW50LnRhcmdldCBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIChtb3ZlRXZlbnQpID0+IHtcbiAgICAgIGlmICghaXNQb2ludGVyRG93bikgcmV0dXJuO1xuICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRFbGVtZW50KSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gKG1vdmVFdmVudCBhcyBQb2ludGVyRXZlbnQpLm1vdmVtZW50WDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSAobW92ZUV2ZW50IGFzIFBvaW50ZXJFdmVudCkubW92ZW1lbnRZO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgKCkgPT4ge1xuICAgICAgaXNQb2ludGVyRG93biA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG4gIHJlc2l6ZVNlbGVjdChkb3duRXZlbnQ6IFBvaW50ZXJFdmVudCkge1xuICAgIGxldCBpc1BvaW50ZXJEb3duID0gdHJ1ZTtcbiAgICBjb25zdCBlbGVtZW50ID0gZG93bkV2ZW50LnRhcmdldCBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCAobW92ZUV2ZW50KSA9PiB7XG4gICAgICBpZiAoIWlzUG9pbnRlckRvd24pIHJldHVybjtcbiAgICAgIGNvbnN0IGdyaXAgPSBlbGVtZW50LmlkLnNwbGl0KCdfJylbMl07XG4gICAgICBjb25zdCB4ID0gKG1vdmVFdmVudCBhcyBQb2ludGVyRXZlbnQpLm1vdmVtZW50WDtcbiAgICAgIGNvbnN0IHkgPSAobW92ZUV2ZW50IGFzIFBvaW50ZXJFdmVudCkubW92ZW1lbnRZO1xuICAgICAgY29uc3QgYmJveCA9IHRoaXMuX2dldEVsZW1lbnRCYm94KHRoaXMuc2VsZWN0ZWRFbGVtZW50KTtcbiAgICAgIGNvbnN0IHdpZHRoID0gYmJveC53aWR0aDtcbiAgICAgIGNvbnN0IGhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgc3dpdGNoICh0aGlzLnNlbGVjdGVkRWxlbWVudC50eXBlKSB7XG4gICAgICAgIGNhc2UgRWxlbWVudFR5cGVFbnVtLkVMTElQU0U6XG4gICAgICAgICAgdGhpcy5fcmVzaXplRWxpcHNlKGdyaXAsIHsgeCwgeSwgd2lkdGgsIGhlaWdodCB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBFbGVtZW50VHlwZUVudW0uTElORTpcbiAgICAgICAgICB0aGlzLl9yZXNpemVMaW5lKGdyaXAsIHsgeCwgeSwgd2lkdGgsIGhlaWdodCB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aGlzLl9yZXNpemVEZWZhdWx0KGdyaXAsIHsgeCwgeSwgd2lkdGgsIGhlaWdodCB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRoaXMuX3Nob3dHcmlwcyh0aGlzLl9nZXRFbGVtZW50QmJveCh0aGlzLnNlbGVjdGVkRWxlbWVudCkpO1xuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsICgpID0+IHtcbiAgICAgIGlzUG9pbnRlckRvd24gPSBmYWxzZTtcbiAgICB9KTtcbiAgfVxuICBwcml2YXRlIF9yZXNpemVMaW5lKGRpcjogc3RyaW5nLCBiYm94OiBCQm94KSB7XG4gICAgc3dpdGNoIChkaXIpIHtcbiAgICAgIGNhc2UgJ253JzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDEgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkxIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ24nOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy55MSBhcyBudW1iZXIpICs9IGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduZSc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLngyIGFzIG51bWJlcikgKz0gYmJveC54O1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy55MSBhcyBudW1iZXIpICs9IGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdlJzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDIgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc2UnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MiBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTIgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncyc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkyIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3N3JzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDEgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkyIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MSBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3Jlc2l6ZUVsaXBzZShkaXI6IHN0cmluZywgYmJveDogQkJveCkge1xuICAgIHN3aXRjaCAoZGlyKSB7XG4gICAgICBjYXNlICdudyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpIC09IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgLT0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeSBhcyBudW1iZXIpIC09IGJib3gueSAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbmUnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueCAvIDI7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnggYXMgbnVtYmVyKSArPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeSBhcyBudW1iZXIpIC09IGJib3gueSAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnggYXMgbnVtYmVyKSArPSBiYm94LnggLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3NlJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgKz0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSArPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3MnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgKz0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpIC09IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgKz0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd3JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpIC09IGJib3gueCAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBwcml2YXRlIF9yZXNpemVEZWZhdWx0KGRpcjogc3RyaW5nLCBiYm94OiBCQm94KSB7XG4gICAgc3dpdGNoIChkaXIpIHtcbiAgICAgIGNhc2UgJ253JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCAtIGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCAtIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94Lnk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgLSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbmUnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggKyBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgLSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMud2lkdGggPSBiYm94LndpZHRoICsgYmJveC54O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3NlJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggKyBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgKyBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgKyBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3cnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggLSBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgKyBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCAtIGJib3gueDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfdW5zdWJzY3JpYmUoc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb24pOiB2b2lkIHtcbiAgICBpZiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cbn1cbiIsIjxzdmcgW2NsYXNzXT1cIidzdmdyb290ICcgKyBzZWxlY3RlZFRvb2xcIiAjc3ZnQ29udGFpbmVyIGlkPVwic3Zncm9vdFwiIHhsaW5rbnM9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI+XG4gIDxzdmcgaWQ9XCJjYW52YXNCYWNrZ3JvdW5kXCIgW2F0dHIud2lkdGhdPVwiY2FudmFzV2lkdGggKiB6b29tXCIgW2F0dHIuaGVpZ2h0XT1cImNhbnZhc0hlaWdodCAqIHpvb21cIiBbYXR0ci54XT1cInhcIlxuICAgIFthdHRyLnldPVwieVwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IG5vbmU7XCI+XG4gICAgPGRlZnMgaWQ9XCJncmlkLXBhdHRlcm5cIj5cbiAgICAgIDxwYXR0ZXJuIGlkPVwic21hbGxHcmlkXCIgW2F0dHIud2lkdGhdPVwiZ3JpZFNpemVcIiBbYXR0ci5oZWlnaHRdPVwiZ3JpZFNpemVcIiBwYXR0ZXJuVW5pdHM9XCJ1c2VyU3BhY2VPblVzZVwiPlxuICAgICAgICA8cGF0aCBbYXR0ci5kXT1cIidNICcrZ3JpZFNpemUrJyAwIEggMCBWICcrZ3JpZFNpemUrJydcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImdyYXlcIiBzdHJva2Utd2lkdGg9XCIwLjVcIiAvPlxuICAgICAgPC9wYXR0ZXJuPlxuICAgICAgPHBhdHRlcm4gaWQ9XCJncmlkXCIgd2lkdGg9XCIxMDBcIiBoZWlnaHQ9XCIxMDBcIiBwYXR0ZXJuVW5pdHM9XCJ1c2VyU3BhY2VPblVzZVwiPlxuICAgICAgICA8cmVjdCB3aWR0aD1cIjEwMFwiIGhlaWdodD1cIjEwMFwiIGZpbGw9XCJ1cmwoI3NtYWxsR3JpZClcIiAvPlxuICAgICAgICA8cGF0aCBkPVwiTSAxMDAgMCBIIDAgViAxMDBcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImdyYXlcIiBzdHJva2Utd2lkdGg9XCIyXCIgLz5cbiAgICAgIDwvcGF0dGVybj5cbiAgICA8L2RlZnM+XG4gICAgPGRlZnMgaWQ9XCJwbGFjZWhvbGRlcl9kZWZzXCI+PC9kZWZzPlxuICAgIDxyZWN0IHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB4PVwiMFwiIHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiIHN0cm9rZT1cInRyYW5zcGFyZW50XCIgW2F0dHIuZmlsbF09XCJiYWNrZ3JvdW5kQ29sb3JcIlxuICAgICAgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogbm9uZTtcIj48L3JlY3Q+XG4gICAgPGcgKm5nSWY9XCJlbmFibGVHcmlkXCI+XG4gICAgICA8cmVjdCB4PVwiLTEwMFwiIHk9XCItMTAwXCIgW2F0dHIud2lkdGhdPVwiKGNhbnZhc1dpZHRoICogem9vbSkgKyAxMDAqMlwiIFthdHRyLmhlaWdodF09XCIoY2FudmFzSGVpZ2h0ICogem9vbSkgKyAxMDAqMlwiXG4gICAgICAgIGZpbGw9XCJ1cmwoI2dyaWQpXCIgLz5cbiAgICA8L2c+XG4gIDwvc3ZnPlxuICA8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBbYXR0ci53aWR0aF09XCJjYW52YXNXaWR0aCAqIHpvb21cIiBbYXR0ci5oZWlnaHRdPVwiY2FudmFzSGVpZ2h0ICogem9vbVwiXG4gICAgW2F0dHIudmlld0JveF09XCJbMCwgMCwgY2FudmFzV2lkdGgsIGNhbnZhc0hlaWdodF1cIiBpZD1cInN2Z2NvbnRlbnRcIiBbYXR0ci54XT1cInhcIiBbYXR0ci55XT1cInlcIj5cbiAgICA8cmVjdCBpZD1cImNvbnRlbnRCYWNrZ3JvdW5kXCIgb3BhY2l0eT1cIjBcIiB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIxMDAlXCIgeD1cIjBcIiB5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIlxuICAgICAgc3Ryb2tlPVwidHJhbnNwYXJlbnRcIiBbYXR0ci5maWxsXT1cImJhY2tncm91bmRDb2xvclwiPjwvcmVjdD5cbiAgICA8ZyBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBhbGw7XCI+XG4gICAgICA8dGl0bGUgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIj5XaGl0ZWJvYXJkPC90aXRsZT5cbiAgICAgIDxuZy1jb250YWluZXIgKm5nRm9yPVwibGV0IGl0ZW0gb2YgZGF0YVwiPlxuICAgICAgICA8ZyBjbGFzcz1cIndiX2VsZW1lbnRcIiBbaWRdPVwiJ2l0ZW1fJyArIGl0ZW0uaWRcIiBbYXR0ci5kYXRhLXdiLWlkXT1cIml0ZW0uaWRcIiBbbmdTd2l0Y2hdPVwiaXRlbS50eXBlXCJcbiAgICAgICAgICBbYXR0ci50cmFuc2Zvcm1dPVwiJ3RyYW5zbGF0ZSgnICsgaXRlbS54ICsgJywnICsgaXRlbS55ICsgJyknICsgJ3JvdGF0ZSgnICsgaXRlbS5yb3RhdGlvbiArICcpJ1wiXG4gICAgICAgICAgW2F0dHIub3BhY2l0eV09XCJpdGVtLm9wYWNpdHkgLyAxMDBcIj5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuQlJVU0hcIj5cbiAgICAgICAgICAgIDxwYXRoIGNsYXNzPVwiYnJ1c2hcIiBmaWxsPVwibm9uZVwiIFthdHRyLmRdPVwiaXRlbS52YWx1ZVwiIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwiaXRlbS5vcHRpb25zLmRhc2hhcnJheVwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwiaXRlbS5vcHRpb25zLnN0cm9rZVdpZHRoXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwiaXRlbS5vcHRpb25zLmxpbmVDYXBcIiBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwiaXRlbS5vcHRpb25zLmxpbmVKb2luXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiPjwvcGF0aD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLklNQUdFXCI+XG4gICAgICAgICAgICA8aW1hZ2UgW2F0dHIuaGVpZ2h0XT1cIml0ZW0ub3B0aW9ucy5oZWlnaHRcIiBbYXR0ci53aWR0aF09XCJpdGVtLm9wdGlvbnMud2lkdGhcIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPVwibm9uZVwiXG4gICAgICAgICAgICAgIFthdHRyLnhsaW5rOmhyZWZdPVwiaXRlbS52YWx1ZVwiIFthdHRyLmhyZWZdPVwiaXRlbS52YWx1ZVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5maWxsXT1cIml0ZW0ub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCI+PC9pbWFnZT5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLkxJTkVcIj5cbiAgICAgICAgICAgIDxsaW5lIGNsYXNzPVwibGluZVwiIFthdHRyLngxXT1cIml0ZW0ub3B0aW9ucy54MVwiIFthdHRyLnkxXT1cIml0ZW0ub3B0aW9ucy55MVwiIFthdHRyLngyXT1cIml0ZW0ub3B0aW9ucy54MlwiXG4gICAgICAgICAgICAgIFthdHRyLnkyXT1cIml0ZW0ub3B0aW9ucy55MlwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJpdGVtLm9wdGlvbnMubGluZUNhcFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJpdGVtLm9wdGlvbnMubGluZUpvaW5cIiBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9saW5lPlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuUkVDVFwiPlxuICAgICAgICAgICAgPHJlY3QgY2xhc3M9XCJyZWN0XCIgW2F0dHIueF09XCJpdGVtLm9wdGlvbnMueDJcIiBbYXR0ci55XT1cIml0ZW0ub3B0aW9ucy55MlwiIFthdHRyLnJ4XT1cIml0ZW0ub3B0aW9ucy5yeFwiXG4gICAgICAgICAgICAgIFthdHRyLndpZHRoXT1cIml0ZW0ub3B0aW9ucy53aWR0aFwiIFthdHRyLmhlaWdodF09XCJpdGVtLm9wdGlvbnMuaGVpZ2h0XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiaXRlbS5vcHRpb25zLmRhc2hvZmZzZXRcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwiaXRlbS5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuZmlsbF09XCJpdGVtLm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L3JlY3Q+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5FTExJUFNFXCI+XG4gICAgICAgICAgICA8ZWxsaXBzZSBbYXR0ci5jeF09XCJpdGVtLm9wdGlvbnMuY3hcIiBbYXR0ci5jeV09XCJpdGVtLm9wdGlvbnMuY3lcIiBbYXR0ci5yeF09XCJpdGVtLm9wdGlvbnMucnhcIlxuICAgICAgICAgICAgICBbYXR0ci5yeV09XCJpdGVtLm9wdGlvbnMucnlcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwiaXRlbS5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwiaXRlbS5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwiaXRlbS5vcHRpb25zLmxpbmVDYXBcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwiaXRlbS5vcHRpb25zLmxpbmVKb2luXCIgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiXG4gICAgICAgICAgICAgIFthdHRyLmZpbGxdPVwiaXRlbS5vcHRpb25zLmZpbGxcIj48L2VsbGlwc2U+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5URVhUXCI+XG4gICAgICAgICAgICA8dGV4dCBjbGFzcz1cInRleHRfZWxlbWVudFwiIHRleHQtYW5jaG9yPVwic3RhcnRcIiB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiIFthdHRyLnhdPVwiaXRlbS5vcHRpb25zLmxlZnRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cIml0ZW0ub3B0aW9ucy50b3BcIiBbYXR0ci53aWR0aF09XCJpdGVtLm9wdGlvbnMud2lkdGhcIiBbYXR0ci5oZWlnaHRdPVwiaXRlbS5vcHRpb25zLmhlaWdodFwiXG4gICAgICAgICAgICAgIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCIgW2F0dHIuZm9udC1zaXplXT1cIml0ZW0ub3B0aW9ucy5mb250U2l6ZVwiXG4gICAgICAgICAgICAgIFthdHRyLmZvbnQtZmFtaWx5XT1cIml0ZW0ub3B0aW9ucy5mb250RmFtaWx5XCIgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJpdGVtLm9wdGlvbnMubGluZUNhcFwiIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJpdGVtLm9wdGlvbnMubGluZUpvaW5cIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCIgW2F0dHIuZmlsbF09XCJpdGVtLm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgICAgIFthdHRyLmZvbnQtc3R5bGVdPVwiaXRlbS5vcHRpb25zLmZvbnRTdHlsZVwiIFthdHRyLmZvbnQtd2VpZ2h0XT1cIml0ZW0ub3B0aW9ucy5mb250V2VpZ2h0XCI+XG4gICAgICAgICAgICAgIHt7IGl0ZW0udmFsdWUgfX1cbiAgICAgICAgICAgIDwvdGV4dD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoRGVmYXVsdD5cbiAgICAgICAgICAgIDx0ZXh0Pk5vdCBkZWZpbmVkIHR5cGU8L3RleHQ+XG4gICAgICAgICAgPC9nPlxuICAgICAgICA8L2c+XG4gICAgICA8L25nLWNvbnRhaW5lcj5cbiAgICAgIDxnIGNsYXNzPVwidGVtcC1lbGVtZW50XCIgKm5nSWY9XCJ0ZW1wRWxlbWVudFwiICBbbmdTd2l0Y2hdPVwic2VsZWN0ZWRUb29sXCI+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidG9vbHMuQlJVU0hcIj5cbiAgICAgICAgPHBhdGggY2xhc3M9XCJicnVzaFwiIGZpbGw9XCJub25lXCIgW2F0dHIuZF09XCJ0ZW1wRWxlbWVudC52YWx1ZVwiIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNoYXJyYXlcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lQ2FwXCIgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUpvaW5cIlxuICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9wYXRoPlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLklNQUdFXCI+XG4gICAgICAgIDxpbWFnZSBbYXR0ci5oZWlnaHRdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5oZWlnaHRcIiBbYXR0ci53aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoXCIgcHJlc2VydmVBc3BlY3RSYXRpbz1cIm5vbmVcIlxuICAgICAgICAgIFthdHRyLnhsaW5rOmhyZWZdPVwidGVtcEVsZW1lbnQudmFsdWVcIiBbYXR0ci5ocmVmXT1cInRlbXBFbGVtZW50LnZhbHVlXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5maWxsXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiPjwvaW1hZ2U+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuTElORVwiPlxuICAgICAgICA8bGluZSBjbGFzcz1cImxpbmVcIiBbYXR0ci54MV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLngxXCIgW2F0dHIueTFdPVwidGVtcEVsZW1lbnQub3B0aW9ucy55MVwiIFthdHRyLngyXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueDJcIlxuICAgICAgICAgIFthdHRyLnkyXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueTJcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lQ2FwXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lSm9pblwiIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9saW5lPlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLlJFQ1RcIj5cbiAgICAgICAgPHJlY3QgY2xhc3M9XCJyZWN0XCIgW2F0dHIueF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLngyXCIgW2F0dHIueV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnkyXCIgW2F0dHIucnhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5yeFwiXG4gICAgICAgICAgW2F0dHIud2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy53aWR0aFwiIFthdHRyLmhlaWdodF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmhlaWdodFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaG9mZnNldFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5maWxsXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L3JlY3Q+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuRUxMSVBTRVwiPlxuICAgICAgICA8ZWxsaXBzZSBbYXR0ci5jeF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmN4XCIgW2F0dHIuY3ldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5jeVwiIFthdHRyLnJ4XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMucnhcIlxuICAgICAgICAgIFthdHRyLnJ5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMucnlcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lQ2FwXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lSm9pblwiIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCJcbiAgICAgICAgICBbYXR0ci5maWxsXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZmlsbFwiPjwvZWxsaXBzZT5cbiAgICAgIDwvZz5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5URVhUXCI+XG4gICAgICAgIDx0ZXh0IGNsYXNzPVwidGV4dF9lbGVtZW50XCIgdGV4dC1hbmNob3I9XCJzdGFydFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCIgW2F0dHIueF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxlZnRcIlxuICAgICAgICAgIFthdHRyLnldPVwidGVtcEVsZW1lbnQub3B0aW9ucy50b3BcIiBbYXR0ci53aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoXCIgW2F0dHIuaGVpZ2h0XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0XCJcbiAgICAgICAgICBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiIFthdHRyLmZvbnQtc2l6ZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZvbnRTaXplXCJcbiAgICAgICAgICBbYXR0ci5mb250LWZhbWlseV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZvbnRGYW1pbHlcIiBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUNhcFwiIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVKb2luXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2VdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VDb2xvclwiIFthdHRyLmZpbGxdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICBbYXR0ci5mb250LXN0eWxlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZm9udFN0eWxlXCIgW2F0dHIuZm9udC13ZWlnaHRdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5mb250V2VpZ2h0XCI+XG4gICAgICAgICAge3sgdGVtcEVsZW1lbnQudmFsdWUgfX1cbiAgICAgICAgPC90ZXh0PlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoRGVmYXVsdD5cbiAgICAgICAgPHRleHQ+Tm90IGRlZmluZWQgdHlwZTwvdGV4dD5cbiAgICAgIDwvZz5cbiAgICA8L2c+XG4gICAgICA8ZyBpZD1cInNlbGVjdG9yUGFyZW50R3JvdXBcIiAqbmdJZj1cInNlbGVjdGVkRWxlbWVudFwiPlxuICAgICAgICA8ZyBjbGFzcz1cInNlbGVjdG9yR3JvdXBcIiBpZD1cInNlbGVjdG9yR3JvdXBcIiB0cmFuc2Zvcm09XCJcIiBbc3R5bGUuZGlzcGxheV09XCJydWJiZXJCb3guZGlzcGxheVwiXG4gICAgICAgICAgW2F0dHIudHJhbnNmb3JtXT1cIid0cmFuc2xhdGUoJyArIHNlbGVjdGVkRWxlbWVudC54ICsgJywnICsgc2VsZWN0ZWRFbGVtZW50LnkgKyAnKScgKyAncm90YXRlKCcgKyBzZWxlY3RlZEVsZW1lbnQucm90YXRpb24gKyAnKSdcIj5cbiAgICAgICAgICA8ZyBkaXNwbGF5PVwiaW5saW5lXCI+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdGVkQm94XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCIjNEY4MEZGXCIgc2hhcGUtcmVuZGVyaW5nPVwiY3Jpc3BFZGdlc1wiXG4gICAgICAgICAgICAgIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IG5vbmU7XCIgW2F0dHIueF09XCJydWJiZXJCb3gueFwiIFthdHRyLnldPVwicnViYmVyQm94LnlcIiBbYXR0ci53aWR0aF09XCJydWJiZXJCb3gud2lkdGhcIlxuICAgICAgICAgICAgICBbYXR0ci5oZWlnaHRdPVwicnViYmVyQm94LmhlaWdodFwiIHN0eWxlPVwiY3Vyc29yOiBtb3ZlO1wiIChwb2ludGVyZG93bik9XCJtb3ZlU2VsZWN0KCRldmVudClcIj5cbiAgICAgICAgICAgIDwvcmVjdD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgZGlzcGxheT1cImlubGluZVwiPlxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cInNlbGVjdG9yX3JvdGF0ZVwiIGlkPVwic2VsZWN0b3JHcmlwX3JvdGF0ZV9ud1wiIGZpbGw9XCIjMDAwXCIgcj1cIjhcIiBzdHJva2U9XCIjMDAwXCIgZmlsbC1vcGFjaXR5PVwiMFwiXG4gICAgICAgICAgICAgIHN0cm9rZS1vcGFjaXR5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIiBbYXR0ci5jeF09XCJydWJiZXJCb3gueCAtIDRcIiBbYXR0ci5jeV09XCJydWJiZXJCb3gueSAtIDRcIj48L2NpcmNsZT5cbiAgICAgICAgICAgIDxjaXJjbGUgY2xhc3M9XCJzZWxlY3Rvcl9yb3RhdGVcIiBpZD1cInNlbGVjdG9yR3JpcF9yb3RhdGVfbmVcIiBmaWxsPVwiIzAwMFwiIHI9XCI4XCIgc3Ryb2tlPVwiIzAwMFwiIGZpbGwtb3BhY2l0eT1cIjBcIlxuICAgICAgICAgICAgICBzdHJva2Utb3BhY2l0eT1cIjBcIiBzdHJva2Utd2lkdGg9XCIwXCIgW2F0dHIuY3hdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggKyA0XCJcbiAgICAgICAgICAgICAgW2F0dHIuY3ldPVwicnViYmVyQm94LnkgLSA0XCI+XG4gICAgICAgICAgICA8L2NpcmNsZT5cbiAgICAgICAgICAgIDxjaXJjbGUgY2xhc3M9XCJzZWxlY3Rvcl9yb3RhdGVcIiBpZD1cInNlbGVjdG9yR3JpcF9yb3RhdGVfc2VcIiBmaWxsPVwiIzAwMFwiIHI9XCI4XCIgc3Ryb2tlPVwiIzAwMFwiIGZpbGwtb3BhY2l0eT1cIjBcIlxuICAgICAgICAgICAgICBzdHJva2Utb3BhY2l0eT1cIjBcIiBzdHJva2Utd2lkdGg9XCIwXCIgW2F0dHIuY3hdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggKyA0XCJcbiAgICAgICAgICAgICAgW2F0dHIuY3ldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0ICsgNFwiPjwvY2lyY2xlPlxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cInNlbGVjdG9yX3JvdGF0ZVwiIGlkPVwic2VsZWN0b3JHcmlwX3JvdGF0ZV9zd1wiIGZpbGw9XCIjMDAwXCIgcj1cIjhcIiBzdHJva2U9XCIjMDAwXCIgZmlsbC1vcGFjaXR5PVwiMFwiXG4gICAgICAgICAgICAgIHN0cm9rZS1vcGFjaXR5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIiBbYXR0ci5jeF09XCJydWJiZXJCb3gueCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci5jeV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgKyA0XCI+XG4gICAgICAgICAgICA8L2NpcmNsZT5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9ud1wiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogbnctcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCAtIDRcIiBbYXR0ci55XT1cInJ1YmJlckJveC55IC0gNFwiXG4gICAgICAgICAgICAgIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPlxuICAgICAgICAgICAgPC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX25cIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IG4tcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCAvIDIgLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfbmVcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IG5lLXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfZVwiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogZS1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoIC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0IC8gMiAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfc2VcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IHNlLXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX3NcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IHMtcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCAvIDIgLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX3N3XCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBzdy1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54IC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0IC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV93XCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiB3LXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLyAyIC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgIDwvZz5cbiAgICAgIDwvZz5cbiAgICA8L2c+XG4gIDwvc3ZnPlxuPC9zdmc+XG5cbjxkaXYgW3N0eWxlXT1cIidmb250LWZhbWlseTonICsgZm9udEZhbWlseSArICc7JyArICdmb250LXNpemU6JyArIGZvbnRTaXplICsgJ3B4OycrXG4ncG9pbnRlci1ldmVudHM6IG5vbmU7IHdpZHRoOiAnICsgY2FudmFzV2lkdGggKiB6b29tICsgJ3B4OyAnK1xuICAnaGVpZ2h0OiAnICsgY2FudmFzSGVpZ2h0ICogem9vbSArICdweDsnICtcbiAgJ3Bvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAnICsgeSArICdweDsgbGVmdDogJyArIHggKyAncHg7J1wiICpuZ0lmPVwidGVtcEVsZW1lbnQgJiYgc2VsZWN0ZWRUb29sID09PSB0b29scy5URVhUXCI+XG4gIDxpbnB1dCAjdGV4dElucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJ0ZXh0LWlucHV0XCIgW3N0eWxlXT1cIid3aWR0aDogJyArIHRleHRJbnB1dC52YWx1ZS5sZW5ndGggKyAnY2g7ICcrXG4gICAgJ2hlaWdodDogJyArICgyICogem9vbSkgKyAnY2g7JytcbiAgICAndG9wOiAnICsgKCh0ZW1wRWxlbWVudC5vcHRpb25zLnRvcCB8fCAwIC0gMTApICogem9vbSkgKyAncHg7JyArXG4gICAgJ2xlZnQ6ICcgKyAoKHRlbXBFbGVtZW50Lm9wdGlvbnMubGVmdCB8fCAwICsgMykqIHpvb20pICsgJ3B4OydcbiAgICBcIiAoaW5wdXQpPVwidXBkYXRlVGV4dEl0ZW0odGV4dElucHV0LnZhbHVlKVwiIGF1dG9mb2N1cyAvPlxuPC9kaXY+Il19