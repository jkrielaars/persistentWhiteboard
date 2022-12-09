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
            let stored = JSON.parse(localStorage.getItem(`whitebaord_${this.persistenceId}`) || 'null');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctd2hpdGVib2FyZC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFpQixTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBYSxNQUFNLEVBQUUsWUFBWSxFQUFvQyxNQUFNLGVBQWUsQ0FBQztBQUMxSixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQWdCLFNBQVMsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUEwQixXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSxVQUFVLENBQUM7QUFDM0osT0FBTyxFQUFvQixVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFhLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQzs7OztBQUkvRixNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7QUFNeEMsTUFBTSxPQUFPLHFCQUFxQjtJQXNGaEMsWUFBb0IsaUJBQXNDO1FBQXRDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUI7UUFqRmxELFVBQUssR0FBeUMsSUFBSSxlQUFlLENBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBdUIxRixtQkFBYyxHQUFHLElBQUksQ0FBQztRQUN0QixnQkFBVyxHQUFHLEdBQUcsQ0FBQztRQUNsQixpQkFBWSxHQUFHLEdBQUcsQ0FB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eEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLFNBQVMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO2FBQ2xDO1lBQ0QsSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFJLFNBQVMsRUFBRTtnQkFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQ2hDO1lBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO2FBQzFCO1lBQ0QsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO2FBQzFCO1lBQ0QsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLFNBQVMsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQ3RDO1lBQ0QsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLFNBQVMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO2FBQ2xDO1lBQ0QsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLFNBQVMsRUFBRTtnQkFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO2FBQ3BDO1lBQ0QsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLFNBQVMsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQ3RDO1lBQ0QsSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLFNBQVMsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ3BCO1lBQ0QsSUFBSSxPQUFP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ZixLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxJQUFJO3NCQUFaLEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxDQUFDO3NCQUFULEtBQUs7Z0JBQ0csQ0FBQztzQkFBVCxLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBQ0csUUFBUTtzQkFBaEIsS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUNHLGFBQWE7c0JBQXJCLEtBQUs7Z0JBRUksS0FBSztzQkFBZCxNQUFNO2dCQUNHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csS0FBSztzQkFBZCxNQUFNO2dCQUNHLElBQUk7c0JBQWIsTUFBTTtnQkFDRyxJQUFJO3NCQUFiLE1BQU07Z0JBQ0csSUFBSTtzQkFBYixNQUFNO2dCQUNHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csYUFBYTtzQkFBdEIsTUFBTTtnQkFDRyxhQUFhO3NCQUF0QixNQUFNO2dCQUNHLFdBQVc7c0JBQXBCLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIEFmdGVyVmlld0luaXQsIFZpZXdDaGlsZCwgSW5wdXQsIEVsZW1lbnRSZWYsIE9uRGVzdHJveSwgT3V0cHV0LCBFdmVudEVtaXR0ZXIsIE9uQ2hhbmdlcywgT25Jbml0LCBTaW1wbGVDaGFuZ2VzIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBOZ1doaXRlYm9hcmRTZXJ2aWNlIH0gZnJvbSAnLi9uZy13aGl0ZWJvYXJkLnNlcnZpY2UnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBmcm9tRXZlbnQsIHNraXAsIEJlaGF2aW9yU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgRWxlbWVudFR5cGVFbnVtLCBGb3JtYXRUeXBlLCBmb3JtYXRUeXBlcywgSUFkZEltYWdlLCBMaW5lQ2FwRW51bSwgTGluZUpvaW5FbnVtLCBUb29sc0VudW0sIFdoaXRlYm9hcmRFbGVtZW50LCBXaGl0ZWJvYXJkT3B0aW9ucyB9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7IENvbnRhaW5lckVsZW1lbnQsIGN1cnZlQmFzaXMsIGRyYWcsIGxpbmUsIG1vdXNlLCBzZWxlY3QsIFNlbGVjdGlvbiwgZXZlbnQgfSBmcm9tICdkMyc7XG5cbnR5cGUgQkJveCA9IHsgeDogbnVtYmVyOyB5OiBudW1iZXI7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH07XG5cbmNvbnN0IGQzTGluZSA9IGxpbmUoKS5jdXJ2ZShjdXJ2ZUJhc2lzKTtcbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ25nLXdoaXRlYm9hcmQnLFxuICB0ZW1wbGF0ZVVybDogJy4vbmctd2hpdGVib2FyZC5jb21wb25lbnQuaHRtbCcsXG4gIHN0eWxlVXJsczogWycuL25nLXdoaXRlYm9hcmQuY29tcG9uZW50LnNjc3MnXSxcbn0pXG5leHBvcnQgY2xhc3MgTmdXaGl0ZWJvYXJkQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkNoYW5nZXMsIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSB7XG4gIEBWaWV3Q2hpbGQoJ3N2Z0NvbnRhaW5lcicsIHsgc3RhdGljOiBmYWxzZSB9KVxuICBzdmdDb250YWluZXIhOiBFbGVtZW50UmVmPENvbnRhaW5lckVsZW1lbnQ+O1xuICBAVmlld0NoaWxkKCd0ZXh0SW5wdXQnLCB7IHN0YXRpYzogZmFsc2UgfSkgcHJpdmF0ZSB0ZXh0SW5wdXQhOiBFbGVtZW50UmVmPEhUTUxJbnB1dEVsZW1lbnQ+O1xuXG4gIHByaXZhdGUgX2RhdGE6IEJlaGF2aW9yU3ViamVjdDxXaGl0ZWJvYXJkRWxlbWVudFtdPiA9IG5ldyBCZWhhdmlvclN1YmplY3Q8V2hpdGVib2FyZEVsZW1lbnRbXT4oW10pO1xuXG4gIEBJbnB1dCgpIHNldCBkYXRhKGRhdGE6IFdoaXRlYm9hcmRFbGVtZW50W10pIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgdGhpcy5fZGF0YS5uZXh0KGRhdGEpO1xuICAgIH1cbiAgfVxuICBnZXQgZGF0YSgpOiBXaGl0ZWJvYXJkRWxlbWVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgQElucHV0KCkgb3B0aW9ucyE6IFdoaXRlYm9hcmRPcHRpb25zO1xuXG4gIEBJbnB1dCgpIHNldCBzZWxlY3RlZFRvb2wodG9vbDogVG9vbHNFbnVtKSB7XG4gICAgaWYgKHRoaXMuX3NlbGVjdGVkVG9vbCAhPT0gdG9vbCkge1xuICAgICAgdGhpcy5fc2VsZWN0ZWRUb29sID0gdG9vbDtcbiAgICAgIHRoaXMudG9vbENoYW5nZWQuZW1pdCh0b29sKTtcbiAgICAgIHRoaXMuY2xlYXJTZWxlY3RlZEVsZW1lbnQoKTtcbiAgICB9XG4gIH1cbiAgZ2V0IHNlbGVjdGVkVG9vbCgpOiBUb29sc0VudW0ge1xuICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZFRvb2w7XG4gIH1cbiAgQElucHV0KCkgZHJhd2luZ0VuYWJsZWQgPSB0cnVlO1xuICBASW5wdXQoKSBjYW52YXNXaWR0aCA9IDgwMDtcbiAgQElucHV0KCkgY2FudmFzSGVpZ2h0ID0gNjAwO1xuICBASW5wdXQoKSBmdWxsU2NyZWVuID0gdHJ1ZTtcbiAgQElucHV0KCkgY2VudGVyID0gdHJ1ZTtcbiAgQElucHV0KCkgc3Ryb2tlQ29sb3IgPSAnIzAwMCc7XG4gIEBJbnB1dCgpIHN0cm9rZVdpZHRoID0gMjtcbiAgQElucHV0KCkgYmFja2dyb3VuZENvbG9yID0gJyNmZmYnO1xuICBASW5wdXQoKSBsaW5lSm9pbiA9IExpbmVKb2luRW51bS5ST1VORDtcbiAgQElucHV0KCkgbGluZUNhcCA9IExpbmVDYXBFbnVtLlJPVU5EO1xuICBASW5wdXQoKSBmaWxsID0gJyMzMzMnO1xuICBASW5wdXQoKSB6b29tID0gMTtcbiAgQElucHV0KCkgZm9udEZhbWlseSA9ICdzYW5zLXNlcmlmJztcbiAgQElucHV0KCkgZm9udFNpemUgPSAyNDtcbiAgQElucHV0KCkgZGFzaGFycmF5ID0gJyc7XG4gIEBJbnB1dCgpIGRhc2hvZmZzZXQgPSAwO1xuICBASW5wdXQoKSB4ID0gMDtcbiAgQElucHV0KCkgeSA9IDA7XG4gIEBJbnB1dCgpIGVuYWJsZUdyaWQgPSBmYWxzZTtcbiAgQElucHV0KCkgZ3JpZFNpemUgPSAxMDtcbiAgQElucHV0KCkgc25hcFRvR3JpZCA9IGZhbHNlO1xuICBASW5wdXQoKSBwZXJzaXN0ZW5jZUlkOiBzdHJpbmd8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIEBPdXRwdXQoKSByZWFkeSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGRhdGFDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPFdoaXRlYm9hcmRFbGVtZW50W10+KCk7XG4gIEBPdXRwdXQoKSBjbGVhciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIHVuZG8gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSByZWRvID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgc2F2ZSA9IG5ldyBFdmVudEVtaXR0ZXI8c3RyaW5nPigpO1xuICBAT3V0cHV0KCkgaW1hZ2VBZGRlZCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIHNlbGVjdEVsZW1lbnQgPSBuZXcgRXZlbnRFbWl0dGVyPFdoaXRlYm9hcmRFbGVtZW50IHwgbnVsbD4oKTtcbiAgQE91dHB1dCgpIGRlbGV0ZUVsZW1lbnQgPSBuZXcgRXZlbnRFbWl0dGVyPFdoaXRlYm9hcmRFbGVtZW50PigpO1xuICBAT3V0cHV0KCkgdG9vbENoYW5nZWQgPSBuZXcgRXZlbnRFbWl0dGVyPFRvb2xzRW51bT4oKTtcblxuICBwcml2YXRlIHNlbGVjdGlvbiE6IFNlbGVjdGlvbjxFbGVtZW50LCB1bmtub3duLCBudWxsLCB1bmRlZmluZWQ+O1xuXG4gIHByaXZhdGUgX3N1YnNjcmlwdGlvbkxpc3Q6IFN1YnNjcmlwdGlvbltdID0gW107XG5cbiAgcHJpdmF0ZSBfaW5pdGlhbERhdGE6IFdoaXRlYm9hcmRFbGVtZW50W10gPSBbXTtcbiAgcHJpdmF0ZSB1bmRvU3RhY2s6IFdoaXRlYm9hcmRFbGVtZW50W11bXSA9IFtdO1xuICBwcml2YXRlIHJlZG9TdGFjazogV2hpdGVib2FyZEVsZW1lbnRbXVtdID0gW107XG4gIHByaXZhdGUgX3NlbGVjdGVkVG9vbDogVG9vbHNFbnVtID0gVG9vbHNFbnVtLkJSVVNIO1xuICBzZWxlY3RlZEVsZW1lbnQhOiBXaGl0ZWJvYXJkRWxlbWVudDtcblxuICB0eXBlcyA9IEVsZW1lbnRUeXBlRW51bTtcbiAgdG9vbHMgPSBUb29sc0VudW07XG5cbiAgdGVtcEVsZW1lbnQhOiBXaGl0ZWJvYXJkRWxlbWVudDtcbiAgdGVtcERyYXchOiBbbnVtYmVyLCBudW1iZXJdW107XG5cbiAgcnViYmVyQm94ID0ge1xuICAgIHg6IDAsXG4gICAgeTogMCxcbiAgICB3aWR0aDogMCxcbiAgICBoZWlnaHQ6IDAsXG4gICAgZGlzcGxheTogJ25vbmUnLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgd2hpdGVib2FyZFNlcnZpY2U6IE5nV2hpdGVib2FyZFNlcnZpY2UpIHt9XG5cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgdGhpcy5faW5pdElucHV0c0Zyb21PcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdE9ic2VydmFibGVzKCk7XG4gICAgdGhpcy5faW5pdGlhbERhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZGF0YSkpO1xuICAgIGlmICh0aGlzLnBlcnNpc3RlbmNlSWQpIHtcbiAgICAgIGNvbnN0IHN0b3JlZCA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oYHdoaXRlYmFvcmRfJHt0aGlzLnBlcnNpc3RlbmNlSWR9YCl8fCdudWxsJyk7XG4gICAgICBpZiAoc3RvcmVkKSB7XG4gICAgICAgIHRoaXMuX2RhdGEubmV4dChzdG9yZWQuZGF0YSB8fCBbXSk7XG4gICAgICAgIHRoaXMudW5kb1N0YWNrID0gc3RvcmVkLnVuZG9TdGFjayB8fCBbXTtcbiAgICAgICAgdGhpcy5yZWRvU3RhY2sgPSBzdG9yZWQucmVkb1N0YWNrIHx8IFtdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiB2b2lkIHtcbiAgICBpZiAoY2hhbmdlc1snb3B0aW9ucyddKSB7XG4gICAgICAvLyYmICFpc0VxdWFsKGNoYW5nZXMub3B0aW9ucy5jdXJyZW50VmFsdWUsIGNoYW5nZXMub3B0aW9ucy5wcmV2aW91c1ZhbHVlKVxuICAgICAgdGhpcy5faW5pdElucHV0c0Zyb21PcHRpb25zKGNoYW5nZXNbJ29wdGlvbnMnXS5jdXJyZW50VmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICB0aGlzLnNlbGVjdGlvbiA9IHNlbGVjdDxFbGVtZW50LCB1bmtub3duPih0aGlzLnN2Z0NvbnRhaW5lci5uYXRpdmVFbGVtZW50KTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMucmVzaXplU2NyZWVuKCk7XG4gICAgfSwgMCk7XG4gICAgdGhpcy5pbml0YWxpemVFdmVudHModGhpcy5zZWxlY3Rpb24pO1xuICAgIHRoaXMucmVhZHkuZW1pdCgpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5mb3JFYWNoKChzdWJzY3JpcHRpb24pID0+IHRoaXMuX3Vuc3Vic2NyaWJlKHN1YnNjcmlwdGlvbikpO1xuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdElucHV0c0Zyb21PcHRpb25zKG9wdGlvbnM6IFdoaXRlYm9hcmRPcHRpb25zKTogdm9pZCB7XG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgIGlmIChvcHRpb25zLmRyYXdpbmdFbmFibGVkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmRyYXdpbmdFbmFibGVkID0gb3B0aW9ucy5kcmF3aW5nRW5hYmxlZDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnNlbGVjdGVkVG9vbCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFRvb2wgPSBvcHRpb25zLnNlbGVjdGVkVG9vbDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmNhbnZhc1dpZHRoICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmNhbnZhc1dpZHRoID0gb3B0aW9ucy5jYW52YXNXaWR0aDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmNhbnZhc0hlaWdodCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jYW52YXNIZWlnaHQgPSBvcHRpb25zLmNhbnZhc0hlaWdodDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZ1bGxTY3JlZW4gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZnVsbFNjcmVlbiA9IG9wdGlvbnMuZnVsbFNjcmVlbjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmNlbnRlciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jZW50ZXIgPSBvcHRpb25zLmNlbnRlcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnN0cm9rZUNvbG9yICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnN0cm9rZUNvbG9yID0gb3B0aW9ucy5zdHJva2VDb2xvcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnN0cm9rZVdpZHRoICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnN0cm9rZVdpZHRoID0gb3B0aW9ucy5zdHJva2VXaWR0aDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmJhY2tncm91bmRDb2xvciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSBvcHRpb25zLmJhY2tncm91bmRDb2xvcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmxpbmVKb2luICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmxpbmVKb2luID0gb3B0aW9ucy5saW5lSm9pbjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmxpbmVDYXAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubGluZUNhcCA9IG9wdGlvbnMubGluZUNhcDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZpbGwgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZmlsbCA9IG9wdGlvbnMuZmlsbDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnpvb20gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuem9vbSA9IG9wdGlvbnMuem9vbTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZvbnRGYW1pbHkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZm9udEZhbWlseSA9IG9wdGlvbnMuZm9udEZhbWlseTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmZvbnRTaXplICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmZvbnRTaXplID0gb3B0aW9ucy5mb250U2l6ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmRhc2hhcnJheSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5kYXNoYXJyYXkgPSBvcHRpb25zLmRhc2hhcnJheTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmRhc2hvZmZzZXQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZGFzaG9mZnNldCA9IG9wdGlvbnMuZGFzaG9mZnNldDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnggIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueCA9IG9wdGlvbnMueDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueSA9IG9wdGlvbnMueTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmVuYWJsZUdyaWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZW5hYmxlR3JpZCA9IG9wdGlvbnMuZW5hYmxlR3JpZDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmdyaWRTaXplICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmdyaWRTaXplID0gb3B0aW9ucy5ncmlkU2l6ZTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnNuYXBUb0dyaWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuc25hcFRvR3JpZCA9IG9wdGlvbnMuc25hcFRvR3JpZDtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnBlcnNpc3RlbmNlSWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMucGVyc2lzdGVuY2VJZCA9IG9wdGlvbnMucGVyc2lzdGVuY2VJZDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9pbml0T2JzZXJ2YWJsZXMoKTogdm9pZCB7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKFxuICAgICAgdGhpcy53aGl0ZWJvYXJkU2VydmljZS5zYXZlU3ZnTWV0aG9kQ2FsbGVkJC5zdWJzY3JpYmUoKHsgbmFtZSwgZm9ybWF0IH0pID0+IHRoaXMuc2F2ZVN2ZyhuYW1lLCBmb3JtYXQpKVxuICAgICk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKFxuICAgICAgdGhpcy53aGl0ZWJvYXJkU2VydmljZS5hZGRJbWFnZU1ldGhvZENhbGxlZCQuc3Vic2NyaWJlKChpbWFnZSkgPT4gdGhpcy5oYW5kbGVEcmF3SW1hZ2UoaW1hZ2UpKVxuICAgICk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHRoaXMud2hpdGVib2FyZFNlcnZpY2UuZXJhc2VTdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLl9jbGVhclN2ZygpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHRoaXMud2hpdGVib2FyZFNlcnZpY2UucmVzZXRTdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLl9yZXNldCgpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHRoaXMud2hpdGVib2FyZFNlcnZpY2UudW5kb1N2Z01ldGhvZENhbGxlZCQuc3Vic2NyaWJlKCgpID0+IHRoaXMudW5kb0RyYXcoKSkpO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaCh0aGlzLndoaXRlYm9hcmRTZXJ2aWNlLnJlZG9TdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLnJlZG9EcmF3KCkpKTtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25MaXN0LnB1c2goZnJvbUV2ZW50KHdpbmRvdywgJ3Jlc2l6ZScpLnN1YnNjcmliZSgoKSA9PiB0aGlzLnJlc2l6ZVNjcmVlbigpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKFxuICAgICAgdGhpcy5fZGF0YS5waXBlKHNraXAoMSkpLnN1YnNjcmliZSgoZGF0YSkgPT4ge1xuICAgICAgICBsZXQgc3RvcmVkID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShgd2hpdGViYW9yZF8ke3RoaXMucGVyc2lzdGVuY2VJZH1gKXx8J251bGwnKTtcbiAgICAgICAgc3RvcmVkLmRhdGEgPSBkYXRhO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShgd2hpdGViYW9yZF8ke3RoaXMucGVyc2lzdGVuY2VJZH1gLCBKU09OLnN0cmluZ2lmeShzdG9yZWQpKTtcbiAgICAgICAgdGhpcy5kYXRhQ2hhbmdlLmVtaXQoZGF0YSk7XG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICBpbml0YWxpemVFdmVudHMoc2VsZWN0aW9uOiBTZWxlY3Rpb248RWxlbWVudCwgdW5rbm93biwgbnVsbCwgdW5kZWZpbmVkPik6IHZvaWQge1xuICAgIGlmICghdGhpcy5kcmF3aW5nRW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgZHJhZ2dpbmcgPSBmYWxzZTtcblxuICAgIHNlbGVjdGlvbi5jYWxsKFxuICAgICAgZHJhZygpXG4gICAgICAgIC5vbignc3RhcnQnLCAoKSA9PiB7XG4gICAgICAgICAgZHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICAgIHRoaXMucmVkb1N0YWNrID0gW107XG4gICAgICAgICAgdGhpcy51cGRhdGVMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgICB0aGlzLmhhbmRsZVN0YXJ0RXZlbnQoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdkcmFnJywgKCkgPT4ge1xuICAgICAgICAgIGlmICghZHJhZ2dpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5oYW5kbGVEcmFnRXZlbnQoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLmhhbmRsZUVuZEV2ZW50KCk7XG4gICAgICAgIH0pXG4gICAgKTtcbiAgfVxuXG4gIGhhbmRsZVN0YXJ0RXZlbnQoKSB7XG4gICAgc3dpdGNoICh0aGlzLnNlbGVjdGVkVG9vbCkge1xuICAgICAgY2FzZSBUb29sc0VudW0uQlJVU0g6XG4gICAgICAgIHRoaXMuaGFuZGxlU3RhcnRCcnVzaCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLklNQUdFOlxuICAgICAgICB0aGlzLmhhbmRsZUltYWdlVG9vbCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkxJTkU6XG4gICAgICAgIHRoaXMuaGFuZGxlU3RhcnRMaW5lKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uUkVDVDpcbiAgICAgICAgdGhpcy5oYW5kbGVTdGFydFJlY3QoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5FTExJUFNFOlxuICAgICAgICB0aGlzLmhhbmRsZVN0YXJ0RWxsaXBzZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlRFWFQ6XG4gICAgICAgIHRoaXMuaGFuZGxlVGV4dFRvb2woKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5TRUxFQ1Q6XG4gICAgICAgIHRoaXMuaGFuZGxlU2VsZWN0VG9vbCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkVSQVNFUjpcbiAgICAgICAgdGhpcy5oYW5kbGVFcmFzZXJUb29sKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGhhbmRsZURyYWdFdmVudCgpIHtcbiAgICBzd2l0Y2ggKHRoaXMuc2VsZWN0ZWRUb29sKSB7XG4gICAgICBjYXNlIFRvb2xzRW51bS5CUlVTSDpcbiAgICAgICAgdGhpcy5oYW5kbGVEcmFnQnJ1c2goKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5MSU5FOlxuICAgICAgICB0aGlzLmhhbmRsZURyYWdMaW5lKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uUkVDVDpcbiAgICAgICAgdGhpcy5oYW5kbGVEcmFnUmVjdCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkVMTElQU0U6XG4gICAgICAgIHRoaXMuaGFuZGxlRHJhZ0VsbGlwc2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5URVhUOlxuICAgICAgICB0aGlzLmhhbmRsZVRleHREcmFnKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGhhbmRsZUVuZEV2ZW50KCkge1xuICAgIHN3aXRjaCAodGhpcy5zZWxlY3RlZFRvb2wpIHtcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkJSVVNIOlxuICAgICAgICB0aGlzLmhhbmRsZUVuZEJydXNoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uTElORTpcbiAgICAgICAgdGhpcy5oYW5kbGVFbmRMaW5lKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uUkVDVDpcbiAgICAgICAgdGhpcy5oYW5kbGVFbmRSZWN0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uRUxMSVBTRTpcbiAgICAgICAgdGhpcy5oYW5kbGVFbmRFbGxpcHNlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uVEVYVDpcbiAgICAgICAgdGhpcy5oYW5kbGVUZXh0RW5kKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBCcnVzaCB0b29sXG4gIGhhbmRsZVN0YXJ0QnJ1c2goKSB7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX2dlbmVyYXRlTmV3RWxlbWVudChFbGVtZW50VHlwZUVudW0uQlJVU0gpO1xuICAgIHRoaXMudGVtcERyYXcgPSBbdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKV07XG4gICAgZWxlbWVudC52YWx1ZSA9IGQzTGluZSh0aGlzLnRlbXBEcmF3KSBhcyBzdHJpbmc7XG4gICAgZWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoID0gdGhpcy5zdHJva2VXaWR0aDtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gZWxlbWVudDtcbiAgfVxuICBoYW5kbGVEcmFnQnJ1c2goKSB7XG4gICAgdGhpcy50ZW1wRHJhdy5wdXNoKHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSkpO1xuICAgIHRoaXMudGVtcEVsZW1lbnQudmFsdWUgPSBkM0xpbmUodGhpcy50ZW1wRHJhdykgYXMgc3RyaW5nO1xuICB9XG4gIGhhbmRsZUVuZEJydXNoKCkge1xuICAgIHRoaXMudGVtcERyYXcucHVzaCh0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpKTtcbiAgICB0aGlzLnRlbXBFbGVtZW50LnZhbHVlID0gZDNMaW5lKHRoaXMudGVtcERyYXcpIGFzIHN0cmluZztcbiAgICB0aGlzLl9wdXNoVG9EYXRhKHRoaXMudGVtcEVsZW1lbnQpO1xuICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICB0aGlzLnRlbXBEcmF3ID0gbnVsbCBhcyBuZXZlcjtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gbnVsbCBhcyBuZXZlcjtcbiAgfVxuICAvLyBIYW5kbGUgSW1hZ2UgdG9vbFxuICBoYW5kbGVJbWFnZVRvb2woKSB7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgaW5wdXQudHlwZSA9ICdmaWxlJztcbiAgICBpbnB1dC5hY2NlcHQgPSAnaW1hZ2UvKic7XG4gICAgaW5wdXQub25jaGFuZ2UgPSAoZSkgPT4ge1xuICAgICAgY29uc3QgZmlsZXMgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkuZmlsZXM7XG4gICAgICBpZiAoZmlsZXMpIHtcbiAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9IChlOiBQcm9ncmVzc0V2ZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgaW1hZ2UgPSAoZS50YXJnZXQgYXMgRmlsZVJlYWRlcikucmVzdWx0IGFzIHN0cmluZztcbiAgICAgICAgICB0aGlzLmhhbmRsZURyYXdJbWFnZSh7IGltYWdlLCB4LCB5IH0pO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIucmVhZEFzRGF0YVVSTChmaWxlc1swXSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBpbnB1dC5jbGljaygpO1xuICB9XG4gIC8vIEhhbmRsZSBEcmF3IEltYWdlXG4gIGhhbmRsZURyYXdJbWFnZShpbWFnZVNyYzogSUFkZEltYWdlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRlbXBJbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICAgIHRlbXBJbWcub25sb2FkID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBzdmdIZWlnaHQgPSB0aGlzLmNhbnZhc0hlaWdodDtcbiAgICAgICAgY29uc3QgaW1hZ2VXaWR0aCA9IHRlbXBJbWcud2lkdGg7XG4gICAgICAgIGNvbnN0IGltYWdlSGVpZ2h0ID0gdGVtcEltZy5oZWlnaHQ7XG4gICAgICAgIGNvbnN0IGFzcGVjdFJhdGlvID0gdGVtcEltZy53aWR0aCAvIHRlbXBJbWcuaGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWlnaHQgPSBpbWFnZUhlaWdodCA+IHN2Z0hlaWdodCA/IHN2Z0hlaWdodCAtIDQwIDogaW1hZ2VIZWlnaHQ7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gaGVpZ2h0ID09PSBzdmdIZWlnaHQgLSA0MCA/IChzdmdIZWlnaHQgLSA0MCkgKiBhc3BlY3RSYXRpbyA6IGltYWdlV2lkdGg7XG5cbiAgICAgICAgbGV0IHggPSBpbWFnZVNyYy54IHx8IChpbWFnZVdpZHRoIC0gd2lkdGgpICogKGltYWdlU3JjLnggfHwgMCk7XG4gICAgICAgIGxldCB5ID0gaW1hZ2VTcmMueSB8fCAoaW1hZ2VIZWlnaHQgLSBoZWlnaHQpICogKGltYWdlU3JjLnkgfHwgMCk7XG5cbiAgICAgICAgaWYgKHggPCAwKSB7XG4gICAgICAgICAgeCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHkgPCAwKSB7XG4gICAgICAgICAgeSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5JTUFHRSk7XG4gICAgICAgIGVsZW1lbnQudmFsdWUgPSBpbWFnZVNyYy5pbWFnZSBhcyBzdHJpbmc7XG4gICAgICAgIGVsZW1lbnQub3B0aW9ucy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBlbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICBlbGVtZW50LnggPSB4O1xuICAgICAgICBlbGVtZW50LnkgPSB5O1xuICAgICAgICB0aGlzLl9wdXNoVG9EYXRhKGVsZW1lbnQpO1xuICAgICAgICB0aGlzLmltYWdlQWRkZWQuZW1pdCgpO1xuICAgICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgICB9O1xuICAgICAgdGVtcEltZy5zcmMgPSBpbWFnZVNyYy5pbWFnZSBhcyBzdHJpbmc7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgTGluZSB0b29sXG4gIGhhbmRsZVN0YXJ0TGluZSgpIHtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5MSU5FKTtcbiAgICBsZXQgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcblxuICAgIGlmICh0aGlzLnNuYXBUb0dyaWQpIHtcbiAgICAgIHggPSB0aGlzLl9zbmFwVG9HcmlkKHgpO1xuICAgICAgeSA9IHRoaXMuX3NuYXBUb0dyaWQoeSk7XG4gICAgfVxuXG4gICAgZWxlbWVudC5vcHRpb25zLngxID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMueTEgPSB5O1xuICAgIGVsZW1lbnQub3B0aW9ucy54MiA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLnkyID0geTtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gZWxlbWVudDtcbiAgfVxuICBoYW5kbGVEcmFnTGluZSgpIHtcbiAgICBsZXQgW3gyLCB5Ml0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuXG4gICAgaWYgKHRoaXMuc25hcFRvR3JpZCkge1xuICAgICAgeDIgPSB0aGlzLl9zbmFwVG9HcmlkKHgyKTtcbiAgICAgIHkyID0gdGhpcy5fc25hcFRvR3JpZCh5Mik7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICBjb25zdCB4MSA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MSBhcyBudW1iZXI7XG4gICAgICBjb25zdCB5MSA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MSBhcyBudW1iZXI7XG4gICAgICBjb25zdCB7IHgsIHkgfSA9IHRoaXMuX3NuYXBUb0FuZ2xlKHgxLCB5MSwgeDIsIHkyKTtcbiAgICAgIFt4MiwgeTJdID0gW3gsIHldO1xuICAgIH1cblxuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MiA9IHgyO1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MiA9IHkyO1xuICB9XG4gIGhhbmRsZUVuZExpbmUoKSB7XG4gICAgaWYgKFxuICAgICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngxICE9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MiB8fFxuICAgICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkxICE9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MlxuICAgICkge1xuICAgICAgdGhpcy5fcHVzaFRvRGF0YSh0aGlzLnRlbXBFbGVtZW50KTtcbiAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICAgIHRoaXMudGVtcEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgUmVjdCB0b29sXG4gIGhhbmRsZVN0YXJ0UmVjdCgpIHtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5SRUNUKTtcbiAgICBsZXQgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBpZiAodGhpcy5zbmFwVG9HcmlkKSB7XG4gICAgICB4ID0gdGhpcy5fc25hcFRvR3JpZCh4KTtcbiAgICAgIHkgPSB0aGlzLl9zbmFwVG9HcmlkKHkpO1xuICAgIH1cbiAgICBlbGVtZW50Lm9wdGlvbnMueDEgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy55MSA9IHk7XG4gICAgZWxlbWVudC5vcHRpb25zLngyID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMueTIgPSB5O1xuICAgIGVsZW1lbnQub3B0aW9ucy53aWR0aCA9IDE7XG4gICAgZWxlbWVudC5vcHRpb25zLmhlaWdodCA9IDE7XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IGVsZW1lbnQ7XG4gIH1cbiAgaGFuZGxlRHJhZ1JlY3QoKSB7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBjb25zdCBzdGFydF94ID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngxIHx8IDA7XG4gICAgY29uc3Qgc3RhcnRfeSA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MSB8fCAwO1xuICAgIGxldCB3ID0gTWF0aC5hYnMoeCAtIHN0YXJ0X3gpO1xuICAgIGxldCBoID0gTWF0aC5hYnMoeSAtIHN0YXJ0X3kpO1xuICAgIGxldCBuZXdfeCA9IG51bGw7XG4gICAgbGV0IG5ld195ID0gbnVsbDtcblxuICAgIGlmIChldmVudC5zb3VyY2VFdmVudC5zaGlmdEtleSkge1xuICAgICAgdyA9IGggPSBNYXRoLm1heCh3LCBoKTtcbiAgICAgIG5ld194ID0gc3RhcnRfeCA8IHggPyBzdGFydF94IDogc3RhcnRfeCAtIHc7XG4gICAgICBuZXdfeSA9IHN0YXJ0X3kgPCB5ID8gc3RhcnRfeSA6IHN0YXJ0X3kgLSBoO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXdfeCA9IE1hdGgubWluKHN0YXJ0X3gsIHgpO1xuICAgICAgbmV3X3kgPSBNYXRoLm1pbihzdGFydF95LCB5KTtcbiAgICB9XG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LmFsdEtleSkge1xuICAgICAgdyAqPSAyO1xuICAgICAgaCAqPSAyO1xuICAgICAgbmV3X3ggPSBzdGFydF94IC0gdyAvIDI7XG4gICAgICBuZXdfeSA9IHN0YXJ0X3kgLSBoIC8gMjtcbiAgICB9XG4gICAgaWYgKHRoaXMuc25hcFRvR3JpZCkge1xuICAgICAgdyA9IHRoaXMuX3NuYXBUb0dyaWQodyk7XG4gICAgICBoID0gdGhpcy5fc25hcFRvR3JpZChoKTtcbiAgICAgIG5ld194ID0gdGhpcy5fc25hcFRvR3JpZChuZXdfeCk7XG4gICAgICBuZXdfeSA9IHRoaXMuX3NuYXBUb0dyaWQobmV3X3kpO1xuICAgIH1cblxuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IHc7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGg7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLngyID0gbmV3X3g7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkyID0gbmV3X3k7XG4gIH1cbiAgaGFuZGxlRW5kUmVjdCgpIHtcbiAgICBpZiAodGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoICE9IDAgfHwgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLmhlaWdodCAhPSAwKSB7XG4gICAgICB0aGlzLl9wdXNoVG9EYXRhKHRoaXMudGVtcEVsZW1lbnQpO1xuICAgICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgICAgdGhpcy50ZW1wRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gICAgfVxuICB9XG4gIC8vIEhhbmRsZSBFbGxpcHNlIHRvb2xcbiAgaGFuZGxlU3RhcnRFbGxpcHNlKCkge1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLkVMTElQU0UpO1xuICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG5cbiAgICAvLyB3b3JrYXJvdW5kXG4gICAgZWxlbWVudC5vcHRpb25zLngxID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMueTEgPSB5O1xuXG4gICAgZWxlbWVudC5vcHRpb25zLmN4ID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMuY3kgPSB5O1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBlbGVtZW50O1xuICB9XG4gIGhhbmRsZURyYWdFbGxpcHNlKCkge1xuICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG4gICAgY29uc3Qgc3RhcnRfeCA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MSB8fCAwO1xuICAgIGNvbnN0IHN0YXJ0X3kgPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTEgfHwgMDtcbiAgICBsZXQgY3ggPSBNYXRoLmFicyhzdGFydF94ICsgKHggLSBzdGFydF94KSAvIDIpO1xuICAgIGxldCBjeSA9IE1hdGguYWJzKHN0YXJ0X3kgKyAoeSAtIHN0YXJ0X3kpIC8gMik7XG4gICAgbGV0IHJ4ID0gTWF0aC5hYnMoc3RhcnRfeCAtIGN4KTtcbiAgICBsZXQgcnkgPSBNYXRoLmFicyhzdGFydF95IC0gY3kpO1xuXG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICByeSA9IHJ4O1xuICAgICAgY3kgPSB5ID4gc3RhcnRfeSA/IHN0YXJ0X3kgKyByeCA6IHN0YXJ0X3kgLSByeDtcbiAgICB9XG4gICAgaWYgKGV2ZW50LnNvdXJjZUV2ZW50LmFsdEtleSkge1xuICAgICAgY3ggPSBzdGFydF94O1xuICAgICAgY3kgPSBzdGFydF95O1xuICAgICAgcnggPSBNYXRoLmFicyh4IC0gY3gpO1xuICAgICAgcnkgPSBldmVudC5zb3VyY2VFdmVudC5zaGlmdEtleSA/IHJ4IDogTWF0aC5hYnMoeSAtIGN5KTtcbiAgICB9XG5cbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMucnggPSByeDtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMucnkgPSByeTtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMuY3ggPSBjeDtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMuY3kgPSBjeTtcbiAgfVxuICBoYW5kbGVFbmRFbGxpcHNlKCkge1xuICAgIGlmICh0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMucnggIT0gMCB8fCB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMucnkgIT0gMCkge1xuICAgICAgdGhpcy5fcHVzaFRvRGF0YSh0aGlzLnRlbXBFbGVtZW50KTtcbiAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICAgIHRoaXMudGVtcEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgVGV4dCB0b29sXG4gIGhhbmRsZVRleHRUb29sKCkge1xuICAgIGlmICh0aGlzLnRlbXBFbGVtZW50KSB7XG4gICAgICAvLyBmaW5pc2ggdGhlIGN1cnJlbnQgb25lIGlmIG5lZWRlZFxuICAgICAgdGhpcy5maW5pc2hUZXh0SW5wdXQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX2dlbmVyYXRlTmV3RWxlbWVudChFbGVtZW50VHlwZUVudW0uVEVYVCk7XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICBlbGVtZW50Lm9wdGlvbnMudG9wID0geTtcbiAgICBlbGVtZW50Lm9wdGlvbnMubGVmdCA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoID0gMDtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gZWxlbWVudDtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMudGV4dElucHV0Lm5hdGl2ZUVsZW1lbnQuZm9jdXMoKTtcbiAgICB9LCAwKTtcbiAgfVxuICBoYW5kbGVUZXh0RHJhZygpIHtcbiAgICBpZiAoIXRoaXMudGVtcEVsZW1lbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgW3gsIHldID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMudG9wID0geTtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMubGVmdCA9IHg7XG4gIH1cbiAgaGFuZGxlVGV4dEVuZCgpIHtcbiAgICBpZiAoIXRoaXMudGVtcEVsZW1lbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICB9XG4gIC8vIEhhbmRsZSBTZWxlY3QgdG9vbFxuICBoYW5kbGVTZWxlY3RUb29sKCkge1xuICAgIGNvbnN0IG1vdXNlX3RhcmdldCA9IHRoaXMuX2dldE1vdXNlVGFyZ2V0KCk7XG4gICAgaWYgKG1vdXNlX3RhcmdldCkge1xuICAgICAgaWYgKG1vdXNlX3RhcmdldC5pZCA9PT0gJ3NlbGVjdG9yR3JvdXAnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGlkID0gbW91c2VfdGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS13Yi1pZCcpO1xuICAgICAgY29uc3Qgc2VsZWN0ZWRFbGVtZW50ID0gdGhpcy5kYXRhLmZpbmQoKGVsKSA9PiBlbC5pZCA9PT0gaWQpIGFzIFdoaXRlYm9hcmRFbGVtZW50O1xuICAgICAgdGhpcy5zZXRTZWxlY3RlZEVsZW1lbnQoc2VsZWN0ZWRFbGVtZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jbGVhclNlbGVjdGVkRWxlbWVudCgpO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgRXJhc2VyIHRvb2xcbiAgaGFuZGxlRXJhc2VyVG9vbCgpIHtcbiAgICBjb25zdCBtb3VzZV90YXJnZXQgPSB0aGlzLl9nZXRNb3VzZVRhcmdldCgpO1xuICAgIGlmIChtb3VzZV90YXJnZXQpIHtcbiAgICAgIGNvbnN0IGlkID0gbW91c2VfdGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS13Yi1pZCcpO1xuICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMuZGF0YS5maW5kKChlbCkgPT4gZWwuaWQgPT09IGlkKSBhcyBXaGl0ZWJvYXJkRWxlbWVudDtcbiAgICAgIGlmIChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoKGVsKSA9PiBlbC5pZCAhPT0gaWQpO1xuICAgICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgICAgIHRoaXMuZGVsZXRlRWxlbWVudC5lbWl0KGVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBjb252ZXJ0IHRoZSB2YWx1ZSBvZiB0aGlzLnRleHRJbnB1dC5uYXRpdmVFbGVtZW50IHRvIGFuIFNWRyB0ZXh0IG5vZGUsIHVubGVzcyBpdCdzIGVtcHR5LFxuICAvLyBhbmQgdGhlbiBkaXNtaXNzIHRoaXMudGV4dElucHV0Lm5hdGl2ZUVsZW1lbnRcbiAgZmluaXNoVGV4dElucHV0KCkge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy50ZXh0SW5wdXQubmF0aXZlRWxlbWVudC52YWx1ZTtcbiAgICB0aGlzLnRlbXBFbGVtZW50LnZhbHVlID0gdmFsdWU7XG4gICAgaWYgKHRoaXMudGVtcEVsZW1lbnQudmFsdWUpIHtcbiAgICAgIHRoaXMuX3B1c2hUb0RhdGEodGhpcy50ZW1wRWxlbWVudCk7XG4gICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgfVxuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICB9XG4gIC8vIEhhbmRsZSBUZXh0IElucHV0XG4gIHVwZGF0ZVRleHRJdGVtKHZhbHVlOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy50ZW1wRWxlbWVudCAmJiB0aGlzLnNlbGVjdGVkVG9vbCA9PSBUb29sc0VudW0uVEVYVCkge1xuICAgICAgdGhpcy50ZW1wRWxlbWVudC52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgfVxuICBzZXRTZWxlY3RlZEVsZW1lbnQoZWxlbWVudDogV2hpdGVib2FyZEVsZW1lbnQpIHtcbiAgICB0aGlzLnNlbGVjdGVkVG9vbCA9IFRvb2xzRW51bS5TRUxFQ1Q7XG4gICAgY29uc3QgY3VycmVudEJCb3ggPSB0aGlzLl9nZXRFbGVtZW50QmJveChlbGVtZW50KTtcbiAgICB0aGlzLnNlbGVjdGVkRWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5zZWxlY3RFbGVtZW50LmVtaXQoZWxlbWVudCk7XG4gICAgdGhpcy5fc2hvd0dyaXBzKGN1cnJlbnRCQm94KTtcbiAgfVxuICBjbGVhclNlbGVjdGVkRWxlbWVudCgpIHtcbiAgICB0aGlzLnNlbGVjdGVkRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gICAgdGhpcy5ydWJiZXJCb3guZGlzcGxheSA9ICdub25lJztcbiAgICB0aGlzLnNlbGVjdEVsZW1lbnQuZW1pdChudWxsKTtcbiAgfVxuICBwcml2YXRlIHNhdmVTdmcobmFtZTogc3RyaW5nLCBmb3JtYXQ6IGZvcm1hdFR5cGVzKSB7XG4gICAgY29uc3Qgc3ZnQ2FudmFzID0gdGhpcy5zZWxlY3Rpb24uc2VsZWN0KCcjc3ZnY29udGVudCcpLmNsb25lKHRydWUpO1xuICAgIHN2Z0NhbnZhcy5zZWxlY3QoJyNzZWxlY3RvclBhcmVudEdyb3VwJykucmVtb3ZlKCk7XG4gICAgKHN2Z0NhbnZhcy5zZWxlY3QoJyNjb250ZW50QmFja2dyb3VuZCcpLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUoJ29wYWNpdHknKTtcbiAgICBjb25zdCBzdmcgPSBzdmdDYW52YXMubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQ7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgneCcsICcwJyk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgneScsICcwJyk7XG5cbiAgICBjb25zdCBzdmdTdHJpbmcgPSB0aGlzLnNhdmVBc1N2ZyhzdmcgYXMgRWxlbWVudCk7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgRm9ybWF0VHlwZS5CYXNlNjQ6XG4gICAgICAgIHRoaXMuc3ZnU3RyaW5nMkltYWdlKHN2Z1N0cmluZywgdGhpcy5jYW52YXNXaWR0aCwgdGhpcy5jYW52YXNIZWlnaHQsIGZvcm1hdCwgKGltZykgPT4ge1xuICAgICAgICAgIHRoaXMuc2F2ZS5lbWl0KGltZyk7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgRm9ybWF0VHlwZS5Tdmc6IHtcbiAgICAgICAgY29uc3QgaW1nU3JjID0gJ2RhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsJyArIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHN2Z1N0cmluZykpKTtcbiAgICAgICAgdGhpcy5kb3dubG9hZChpbWdTcmMsIG5hbWUpO1xuICAgICAgICB0aGlzLnNhdmUuZW1pdChpbWdTcmMpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMuc3ZnU3RyaW5nMkltYWdlKHN2Z1N0cmluZywgdGhpcy5jYW52YXNXaWR0aCwgdGhpcy5jYW52YXNIZWlnaHQsIGZvcm1hdCwgKGltZykgPT4ge1xuICAgICAgICAgIHRoaXMuZG93bmxvYWQoaW1nLCBuYW1lKTtcbiAgICAgICAgICB0aGlzLnNhdmUuZW1pdChpbWcpO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHN2Z0NhbnZhcy5yZW1vdmUoKTtcbiAgfVxuICBwcml2YXRlIHN2Z1N0cmluZzJJbWFnZShcbiAgICBzdmdTdHJpbmc6IHN0cmluZyxcbiAgICB3aWR0aDogbnVtYmVyLFxuICAgIGhlaWdodDogbnVtYmVyLFxuICAgIGZvcm1hdDogc3RyaW5nLFxuICAgIGNhbGxiYWNrOiAoaW1nOiBzdHJpbmcpID0+IHZvaWRcbiAgKSB7XG4gICAgLy8gc2V0IGRlZmF1bHQgZm9yIGZvcm1hdCBwYXJhbWV0ZXJcbiAgICBmb3JtYXQgPSBmb3JtYXQgfHwgJ3BuZyc7XG4gICAgLy8gU1ZHIGRhdGEgVVJMIGZyb20gU1ZHIHN0cmluZ1xuICAgIGNvbnN0IHN2Z0RhdGEgPSAnZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCwnICsgYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3ZnU3RyaW5nKSkpO1xuICAgIC8vIGNyZWF0ZSBjYW52YXMgaW4gbWVtb3J5KG5vdCBpbiBET00pXG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgLy8gZ2V0IGNhbnZhcyBjb250ZXh0IGZvciBkcmF3aW5nIG9uIGNhbnZhc1xuICAgIGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSBhcyBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XG4gICAgLy8gc2V0IGNhbnZhcyBzaXplXG4gICAgY2FudmFzLndpZHRoID0gd2lkdGg7XG4gICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICAvLyBjcmVhdGUgaW1hZ2UgaW4gbWVtb3J5KG5vdCBpbiBET00pXG4gICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICAvLyBsYXRlciB3aGVuIGltYWdlIGxvYWRzIHJ1biB0aGlzXG4gICAgaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xuICAgICAgLy8gYXN5bmMgKGhhcHBlbnMgbGF0ZXIpXG4gICAgICAvLyBjbGVhciBjYW52YXNcbiAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgLy8gZHJhdyBpbWFnZSB3aXRoIFNWRyBkYXRhIHRvIGNhbnZhc1xuICAgICAgY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgLy8gc25hcHNob3QgY2FudmFzIGFzIHBuZ1xuICAgICAgY29uc3QgcG5nRGF0YSA9IGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlLycgKyBmb3JtYXQpO1xuICAgICAgLy8gcGFzcyBwbmcgZGF0YSBVUkwgdG8gY2FsbGJhY2tcbiAgICAgIGNhbGxiYWNrKHBuZ0RhdGEpO1xuICAgIH07IC8vIGVuZCBhc3luY1xuICAgIC8vIHN0YXJ0IGxvYWRpbmcgU1ZHIGRhdGEgaW50byBpbiBtZW1vcnkgaW1hZ2VcbiAgICBpbWFnZS5zcmMgPSBzdmdEYXRhO1xuICB9XG4gIHByaXZhdGUgc2F2ZUFzU3ZnKHN2Z05vZGU6IEVsZW1lbnQpOiBzdHJpbmcge1xuICAgIGNvbnN0IHNlcmlhbGl6ZXIgPSBuZXcgWE1MU2VyaWFsaXplcigpO1xuICAgIGxldCBzdmdTdHJpbmcgPSBzZXJpYWxpemVyLnNlcmlhbGl6ZVRvU3RyaW5nKHN2Z05vZGUpO1xuICAgIHN2Z1N0cmluZyA9IHN2Z1N0cmluZy5yZXBsYWNlKC8oXFx3Kyk/Oj94bGluaz0vZywgJ3htbG5zOnhsaW5rPScpOyAvLyBGaXggcm9vdCB4bGluayB3aXRob3V0IG5hbWVzcGFjZVxuICAgIHN2Z1N0cmluZyA9IHN2Z1N0cmluZy5yZXBsYWNlKC9OU1xcZCs6aHJlZi9nLCAneGxpbms6aHJlZicpO1xuICAgIHJldHVybiBzdmdTdHJpbmc7XG4gIH1cbiAgcHJpdmF0ZSBkb3dubG9hZCh1cmw6IHN0cmluZywgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICBsaW5rLmhyZWYgPSB1cmw7XG4gICAgbGluay5zZXRBdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgbGluay5kb3dubG9hZCA9IG5hbWUgfHwgJ25ldyB3aGl0ZS1ib2FyZCc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICBsaW5rLmNsaWNrKCk7XG4gIH1cbiAgcHJpdmF0ZSBfcHVzaFRvRGF0YShlbGVtZW50OiBXaGl0ZWJvYXJkRWxlbWVudCkge1xuICAgIHRoaXMuZGF0YS5wdXNoKGVsZW1lbnQpO1xuICAgIHRoaXMuX2RhdGEubmV4dCh0aGlzLmRhdGEpO1xuICB9XG4gIHByaXZhdGUgX2NsZWFyU3ZnKCkge1xuICAgIHRoaXMuZGF0YSA9IFtdO1xuICAgIHRoaXMuX2RhdGEubmV4dCh0aGlzLmRhdGEpO1xuICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICB0aGlzLmNsZWFyLmVtaXQoKTtcbiAgfVxuICBwcml2YXRlIHVuZG9EcmF3KCkge1xuICAgIGlmICghdGhpcy51bmRvU3RhY2subGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IHRoaXMudW5kb1N0YWNrLnBvcCgpO1xuICAgIHRoaXMucmVkb1N0YWNrLnB1c2goY3VycmVudFN0YXRlIGFzIFdoaXRlYm9hcmRFbGVtZW50W10pO1xuICAgIGlmKHRoaXMudW5kb1N0YWNrLmxlbmd0aCl7XG4gICAgICB0aGlzLmRhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMudW5kb1N0YWNrW3RoaXMudW5kb1N0YWNrLmxlbmd0aC0xXSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuX2luaXRpYWxEYXRhKSkgfHwgW107XG4gICAgfVxuICAgIHRoaXMudXBkYXRlTG9jYWxTdG9yYWdlKCk7XG4gICAgdGhpcy51bmRvLmVtaXQoKTtcbiAgfVxuICBwcml2YXRlIHJlZG9EcmF3KCkge1xuICAgIGlmICghdGhpcy5yZWRvU3RhY2subGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IHRoaXMucmVkb1N0YWNrLnBvcCgpO1xuICAgIHRoaXMudW5kb1N0YWNrLnB1c2goSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdXJyZW50U3RhdGUpKSBhcyBXaGl0ZWJvYXJkRWxlbWVudFtdKTtcbiAgICB0aGlzLmRhdGEgPSBjdXJyZW50U3RhdGUgfHwgW107XG4gICAgdGhpcy51cGRhdGVMb2NhbFN0b3JhZ2UoKTtcbiAgICB0aGlzLnJlZG8uZW1pdCgpO1xuICB9XG4gIHByaXZhdGUgX3B1c2hUb1VuZG8oKSB7XG4gICAgdGhpcy51bmRvU3RhY2sucHVzaChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZGF0YSkpKTtcbiAgICB0aGlzLnVwZGF0ZUxvY2FsU3RvcmFnZSgpO1xuICB9XG4gIHByaXZhdGUgX3Jlc2V0KCk6IHZvaWQge1xuICAgIHRoaXMudW5kb1N0YWNrID0gW107XG4gICAgdGhpcy5yZWRvU3RhY2sgPSBbXTtcbiAgICB0aGlzLmRhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuX2luaXRpYWxEYXRhKSk7XG4gICAgdGhpcy51cGRhdGVMb2NhbFN0b3JhZ2UoKTtcbiAgfVxuICBwcml2YXRlIHVwZGF0ZUxvY2FsU3RvcmFnZSgpOiB2b2lkIHtcbiAgICBjb25zdCBzdG9yYWdlT2JqZWN0ID0ge2RhdGE6IHRoaXMuZGF0YSwgdW5kb1N0YWNrOiB0aGlzLnVuZG9TdGFjaywgcmVkb1N0YWNrOiB0aGlzLnJlZG9TdGFja307XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oYHdoaXRlYmFvcmRfJHt0aGlzLnBlcnNpc3RlbmNlSWR9YCwgSlNPTi5zdHJpbmdpZnkoc3RvcmFnZU9iamVjdCkpO1xuICB9XG4gIHByaXZhdGUgX2dlbmVyYXRlTmV3RWxlbWVudChuYW1lOiBFbGVtZW50VHlwZUVudW0pOiBXaGl0ZWJvYXJkRWxlbWVudCB7XG4gICAgY29uc3QgZWxlbWVudCA9IG5ldyBXaGl0ZWJvYXJkRWxlbWVudChuYW1lLCB7XG4gICAgICBzdHJva2VXaWR0aDogdGhpcy5zdHJva2VXaWR0aCxcbiAgICAgIHN0cm9rZUNvbG9yOiB0aGlzLnN0cm9rZUNvbG9yLFxuICAgICAgZmlsbDogdGhpcy5maWxsLFxuICAgICAgbGluZUpvaW46IHRoaXMubGluZUpvaW4sXG4gICAgICBsaW5lQ2FwOiB0aGlzLmxpbmVDYXAsXG4gICAgICBmb250U2l6ZTogdGhpcy5mb250U2l6ZSxcbiAgICAgIGZvbnRGYW1pbHk6IHRoaXMuZm9udEZhbWlseSxcbiAgICAgIGRhc2hhcnJheTogdGhpcy5kYXNoYXJyYXksXG4gICAgICBkYXNob2Zmc2V0OiB0aGlzLmRhc2hvZmZzZXQsXG4gICAgfSk7XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cbiAgcHJpdmF0ZSBfY2FsY3VsYXRlWEFuZFkoW3gsIHldOiBbbnVtYmVyLCBudW1iZXJdKTogW251bWJlciwgbnVtYmVyXSB7XG4gICAgcmV0dXJuIFsoeCAtIHRoaXMueCkgLyB0aGlzLnpvb20sICh5IC0gdGhpcy55KSAvIHRoaXMuem9vbV07XG4gIH1cbiAgcHJpdmF0ZSByZXNpemVTY3JlZW4oKSB7XG4gICAgY29uc3Qgc3ZnQ29udGFpbmVyID0gdGhpcy5zdmdDb250YWluZXIubmF0aXZlRWxlbWVudDtcbiAgICBpZiAodGhpcy5mdWxsU2NyZWVuKSB7XG4gICAgICB0aGlzLmNhbnZhc1dpZHRoID0gc3ZnQ29udGFpbmVyLmNsaWVudFdpZHRoO1xuICAgICAgdGhpcy5jYW52YXNIZWlnaHQgPSBzdmdDb250YWluZXIuY2xpZW50SGVpZ2h0O1xuICAgIH1cbiAgICBpZiAodGhpcy5jZW50ZXIpIHtcbiAgICAgIHRoaXMueCA9IHN2Z0NvbnRhaW5lci5jbGllbnRXaWR0aCAvIDIgLSB0aGlzLmNhbnZhc1dpZHRoIC8gMjtcbiAgICAgIHRoaXMueSA9IHN2Z0NvbnRhaW5lci5jbGllbnRIZWlnaHQgLyAyIC0gdGhpcy5jYW52YXNIZWlnaHQgLyAyO1xuICAgIH1cbiAgfVxuICBwcml2YXRlIF9zbmFwVG9BbmdsZSh4MTogbnVtYmVyLCB5MTogbnVtYmVyLCB4MjogbnVtYmVyLCB5MjogbnVtYmVyKSB7XG4gICAgY29uc3Qgc25hcCA9IE1hdGguUEkgLyA0OyAvLyA0NSBkZWdyZWVzXG4gICAgY29uc3QgZHggPSB4MiAtIHgxO1xuICAgIGNvbnN0IGR5ID0geTIgLSB5MTtcbiAgICBjb25zdCBhbmdsZSA9IE1hdGguYXRhbjIoZHksIGR4KTtcbiAgICBjb25zdCBkaXN0ID0gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KTtcbiAgICBjb25zdCBzbmFwYW5nbGUgPSBNYXRoLnJvdW5kKGFuZ2xlIC8gc25hcCkgKiBzbmFwO1xuICAgIGNvbnN0IHggPSB4MSArIGRpc3QgKiBNYXRoLmNvcyhzbmFwYW5nbGUpO1xuICAgIGNvbnN0IHkgPSB5MSArIGRpc3QgKiBNYXRoLnNpbihzbmFwYW5nbGUpO1xuICAgIHJldHVybiB7IHg6IHgsIHk6IHksIGE6IHNuYXBhbmdsZSB9O1xuICB9XG4gIHByaXZhdGUgX3NuYXBUb0dyaWQobjogbnVtYmVyKSB7XG4gICAgY29uc3Qgc25hcCA9IHRoaXMuZ3JpZFNpemU7XG4gICAgY29uc3QgbjEgPSBNYXRoLnJvdW5kKG4gLyBzbmFwKSAqIHNuYXA7XG4gICAgcmV0dXJuIG4xO1xuICB9XG4gIHByaXZhdGUgX2dldEVsZW1lbnRCYm94KGVsZW1lbnQ6IFdoaXRlYm9hcmRFbGVtZW50KTogRE9NUmVjdCB7XG4gICAgY29uc3QgZWwgPSB0aGlzLnNlbGVjdGlvbi5zZWxlY3QoYCNpdGVtXyR7ZWxlbWVudC5pZH1gKS5ub2RlKCkgYXMgU1ZHR3JhcGhpY3NFbGVtZW50O1xuICAgIGNvbnN0IGJib3ggPSBlbC5nZXRCQm94KCk7XG4gICAgcmV0dXJuIGJib3g7XG4gIH1cbiAgcHJpdmF0ZSBfZ2V0TW91c2VUYXJnZXQoKTogU1ZHR3JhcGhpY3NFbGVtZW50IHwgbnVsbCB7XG4gICAgY29uc3QgZXZ0OiBFdmVudCA9IGV2ZW50LnNvdXJjZUV2ZW50O1xuICAgIGlmIChldnQgPT0gbnVsbCB8fCBldnQudGFyZ2V0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBsZXQgbW91c2VfdGFyZ2V0ID0gZXZ0LnRhcmdldCBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgaWYgKG1vdXNlX3RhcmdldC5pZCA9PT0gJ3N2Z3Jvb3QnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKG1vdXNlX3RhcmdldC5wYXJlbnROb2RlKSB7XG4gICAgICBtb3VzZV90YXJnZXQgPSBtb3VzZV90YXJnZXQucGFyZW50Tm9kZS5wYXJlbnROb2RlIGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICAgIGlmIChtb3VzZV90YXJnZXQuaWQgPT09ICdzZWxlY3Rvckdyb3VwJykge1xuICAgICAgICByZXR1cm4gbW91c2VfdGFyZ2V0O1xuICAgICAgfVxuICAgICAgd2hpbGUgKCFtb3VzZV90YXJnZXQuaWQuaW5jbHVkZXMoJ2l0ZW1fJykpIHtcbiAgICAgICAgaWYgKG1vdXNlX3RhcmdldC5pZCA9PT0gJ3N2Z3Jvb3QnKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgbW91c2VfdGFyZ2V0ID0gbW91c2VfdGFyZ2V0LnBhcmVudE5vZGUgYXMgU1ZHR3JhcGhpY3NFbGVtZW50O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbW91c2VfdGFyZ2V0O1xuICB9XG4gIHByaXZhdGUgX3Nob3dHcmlwcyhiYm94OiBET01SZWN0KSB7XG4gICAgdGhpcy5ydWJiZXJCb3ggPSB7XG4gICAgICB4OiBiYm94LnggLSAoKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggYXMgbnVtYmVyKSB8fCAwKSAqIDAuNSxcbiAgICAgIHk6IGJib3gueSAtICgodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aCBhcyBudW1iZXIpIHx8IDApICogMC41LFxuICAgICAgd2lkdGg6IGJib3gud2lkdGggKyAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aCBhcyBudW1iZXIpIHx8IDAsXG4gICAgICBoZWlnaHQ6IGJib3guaGVpZ2h0ICsgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggYXMgbnVtYmVyKSB8fCAwLFxuICAgICAgZGlzcGxheTogJ2Jsb2NrJyxcbiAgICB9O1xuICB9XG4gIG1vdmVTZWxlY3QoZG93bkV2ZW50OiBQb2ludGVyRXZlbnQpIHtcbiAgICBsZXQgaXNQb2ludGVyRG93biA9IHRydWU7XG4gICAgY29uc3QgZWxlbWVudCA9IGRvd25FdmVudC50YXJnZXQgYXMgU1ZHR3JhcGhpY3NFbGVtZW50O1xuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCAobW92ZUV2ZW50KSA9PiB7XG4gICAgICBpZiAoIWlzUG9pbnRlckRvd24pIHJldHVybjtcbiAgICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudCkge1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IChtb3ZlRXZlbnQgYXMgUG9pbnRlckV2ZW50KS5tb3ZlbWVudFg7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gKG1vdmVFdmVudCBhcyBQb2ludGVyRXZlbnQpLm1vdmVtZW50WTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsICgpID0+IHtcbiAgICAgIGlzUG9pbnRlckRvd24gPSBmYWxzZTtcbiAgICB9KTtcbiAgfVxuICByZXNpemVTZWxlY3QoZG93bkV2ZW50OiBQb2ludGVyRXZlbnQpIHtcbiAgICBsZXQgaXNQb2ludGVyRG93biA9IHRydWU7XG4gICAgY29uc3QgZWxlbWVudCA9IGRvd25FdmVudC50YXJnZXQgYXMgU1ZHR3JhcGhpY3NFbGVtZW50O1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgKG1vdmVFdmVudCkgPT4ge1xuICAgICAgaWYgKCFpc1BvaW50ZXJEb3duKSByZXR1cm47XG4gICAgICBjb25zdCBncmlwID0gZWxlbWVudC5pZC5zcGxpdCgnXycpWzJdO1xuICAgICAgY29uc3QgeCA9IChtb3ZlRXZlbnQgYXMgUG9pbnRlckV2ZW50KS5tb3ZlbWVudFg7XG4gICAgICBjb25zdCB5ID0gKG1vdmVFdmVudCBhcyBQb2ludGVyRXZlbnQpLm1vdmVtZW50WTtcbiAgICAgIGNvbnN0IGJib3ggPSB0aGlzLl9nZXRFbGVtZW50QmJveCh0aGlzLnNlbGVjdGVkRWxlbWVudCk7XG4gICAgICBjb25zdCB3aWR0aCA9IGJib3gud2lkdGg7XG4gICAgICBjb25zdCBoZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgIHN3aXRjaCAodGhpcy5zZWxlY3RlZEVsZW1lbnQudHlwZSkge1xuICAgICAgICBjYXNlIEVsZW1lbnRUeXBlRW51bS5FTExJUFNFOlxuICAgICAgICAgIHRoaXMuX3Jlc2l6ZUVsaXBzZShncmlwLCB7IHgsIHksIHdpZHRoLCBoZWlnaHQgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgRWxlbWVudFR5cGVFbnVtLkxJTkU6XG4gICAgICAgICAgdGhpcy5fcmVzaXplTGluZShncmlwLCB7IHgsIHksIHdpZHRoLCBoZWlnaHQgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhpcy5fcmVzaXplRGVmYXVsdChncmlwLCB7IHgsIHksIHdpZHRoLCBoZWlnaHQgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aGlzLl9zaG93R3JpcHModGhpcy5fZ2V0RWxlbWVudEJib3godGhpcy5zZWxlY3RlZEVsZW1lbnQpKTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCAoKSA9PiB7XG4gICAgICBpc1BvaW50ZXJEb3duID0gZmFsc2U7XG4gICAgfSk7XG4gIH1cbiAgcHJpdmF0ZSBfcmVzaXplTGluZShkaXI6IHN0cmluZywgYmJveDogQkJveCkge1xuICAgIHN3aXRjaCAoZGlyKSB7XG4gICAgICBjYXNlICdudyc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLngxIGFzIG51bWJlcikgKz0gYmJveC54O1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy55MSBhcyBudW1iZXIpICs9IGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduJzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTEgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbmUnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MiBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTEgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZSc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLngyIGFzIG51bWJlcikgKz0gYmJveC54O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3NlJzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDIgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkyIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3MnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy55MiBhcyBudW1iZXIpICs9IGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdyc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLngxIGFzIG51bWJlcikgKz0gYmJveC54O1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy55MiBhcyBudW1iZXIpICs9IGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd3JzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDEgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBwcml2YXRlIF9yZXNpemVFbGlwc2UoZGlyOiBzdHJpbmcsIGJib3g6IEJCb3gpIHtcbiAgICBzd2l0Y2ggKGRpcikge1xuICAgICAgY2FzZSAnbncnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueCAvIDI7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnggYXMgbnVtYmVyKSAtPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeSBhcyBudW1iZXIpIC09IGJib3gueSAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbic6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSAtPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ25lJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgKz0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSAtPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2UnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgKz0gYmJveC54IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpICs9IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgKz0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeSBhcyBudW1iZXIpICs9IGJib3gueSAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3cnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueCAvIDI7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnggYXMgbnVtYmVyKSAtPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeSBhcyBudW1iZXIpICs9IGJib3gueSAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnggYXMgbnVtYmVyKSAtPSBiYm94LnggLyAyO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcHJpdmF0ZSBfcmVzaXplRGVmYXVsdChkaXI6IHN0cmluZywgYmJveDogQkJveCkge1xuICAgIHN3aXRjaCAoZGlyKSB7XG4gICAgICBjYXNlICdudyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggLSBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0ID0gYmJveC5oZWlnaHQgLSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbic6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGJib3guaGVpZ2h0IC0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ25lJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94Lnk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMud2lkdGggPSBiYm94LndpZHRoICsgYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGJib3guaGVpZ2h0IC0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2UnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCArIGJib3gueDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMud2lkdGggPSBiYm94LndpZHRoICsgYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGJib3guaGVpZ2h0ICsgYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3MnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGJib3guaGVpZ2h0ICsgYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3N3JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMud2lkdGggPSBiYm94LndpZHRoIC0gYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGJib3guaGVpZ2h0ICsgYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3cnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggLSBiYm94Lng7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3Vuc3Vic2NyaWJlKHN1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uKTogdm9pZCB7XG4gICAgaWYgKHN1YnNjcmlwdGlvbikge1xuICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9XG59XG4iLCI8c3ZnIFtjbGFzc109XCInc3Zncm9vdCAnICsgc2VsZWN0ZWRUb29sXCIgI3N2Z0NvbnRhaW5lciBpZD1cInN2Z3Jvb3RcIiB4bGlua25zPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiPlxuICA8c3ZnIGlkPVwiY2FudmFzQmFja2dyb3VuZFwiIFthdHRyLndpZHRoXT1cImNhbnZhc1dpZHRoICogem9vbVwiIFthdHRyLmhlaWdodF09XCJjYW52YXNIZWlnaHQgKiB6b29tXCIgW2F0dHIueF09XCJ4XCJcbiAgICBbYXR0ci55XT1cInlcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBub25lO1wiPlxuICAgIDxkZWZzIGlkPVwiZ3JpZC1wYXR0ZXJuXCI+XG4gICAgICA8cGF0dGVybiBpZD1cInNtYWxsR3JpZFwiIFthdHRyLndpZHRoXT1cImdyaWRTaXplXCIgW2F0dHIuaGVpZ2h0XT1cImdyaWRTaXplXCIgcGF0dGVyblVuaXRzPVwidXNlclNwYWNlT25Vc2VcIj5cbiAgICAgICAgPHBhdGggW2F0dHIuZF09XCInTSAnK2dyaWRTaXplKycgMCBIIDAgViAnK2dyaWRTaXplKycnXCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJncmF5XCIgc3Ryb2tlLXdpZHRoPVwiMC41XCIgLz5cbiAgICAgIDwvcGF0dGVybj5cbiAgICAgIDxwYXR0ZXJuIGlkPVwiZ3JpZFwiIHdpZHRoPVwiMTAwXCIgaGVpZ2h0PVwiMTAwXCIgcGF0dGVyblVuaXRzPVwidXNlclNwYWNlT25Vc2VcIj5cbiAgICAgICAgPHJlY3Qgd2lkdGg9XCIxMDBcIiBoZWlnaHQ9XCIxMDBcIiBmaWxsPVwidXJsKCNzbWFsbEdyaWQpXCIgLz5cbiAgICAgICAgPHBhdGggZD1cIk0gMTAwIDAgSCAwIFYgMTAwXCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJncmF5XCIgc3Ryb2tlLXdpZHRoPVwiMlwiIC8+XG4gICAgICA8L3BhdHRlcm4+XG4gICAgPC9kZWZzPlxuICAgIDxkZWZzIGlkPVwicGxhY2Vob2xkZXJfZGVmc1wiPjwvZGVmcz5cbiAgICA8cmVjdCB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIxMDAlXCIgeD1cIjBcIiB5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIiBzdHJva2U9XCJ0cmFuc3BhcmVudFwiIFthdHRyLmZpbGxdPVwiYmFja2dyb3VuZENvbG9yXCJcbiAgICAgIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IG5vbmU7XCI+PC9yZWN0PlxuICAgIDxnICpuZ0lmPVwiZW5hYmxlR3JpZFwiPlxuICAgICAgPHJlY3QgeD1cIi0xMDBcIiB5PVwiLTEwMFwiIFthdHRyLndpZHRoXT1cIihjYW52YXNXaWR0aCAqIHpvb20pICsgMTAwKjJcIiBbYXR0ci5oZWlnaHRdPVwiKGNhbnZhc0hlaWdodCAqIHpvb20pICsgMTAwKjJcIlxuICAgICAgICBmaWxsPVwidXJsKCNncmlkKVwiIC8+XG4gICAgPC9nPlxuICA8L3N2Zz5cbiAgPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgW2F0dHIud2lkdGhdPVwiY2FudmFzV2lkdGggKiB6b29tXCIgW2F0dHIuaGVpZ2h0XT1cImNhbnZhc0hlaWdodCAqIHpvb21cIlxuICAgIFthdHRyLnZpZXdCb3hdPVwiWzAsIDAsIGNhbnZhc1dpZHRoLCBjYW52YXNIZWlnaHRdXCIgaWQ9XCJzdmdjb250ZW50XCIgW2F0dHIueF09XCJ4XCIgW2F0dHIueV09XCJ5XCI+XG4gICAgPHJlY3QgaWQ9XCJjb250ZW50QmFja2dyb3VuZFwiIG9wYWNpdHk9XCIwXCIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiIHg9XCIwXCIgeT1cIjBcIiBzdHJva2Utd2lkdGg9XCIwXCJcbiAgICAgIHN0cm9rZT1cInRyYW5zcGFyZW50XCIgW2F0dHIuZmlsbF09XCJiYWNrZ3JvdW5kQ29sb3JcIj48L3JlY3Q+XG4gICAgPGcgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogYWxsO1wiPlxuICAgICAgPHRpdGxlIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCI+V2hpdGVib2FyZDwvdGl0bGU+XG4gICAgICA8bmctY29udGFpbmVyICpuZ0Zvcj1cImxldCBpdGVtIG9mIGRhdGFcIj5cbiAgICAgICAgPGcgY2xhc3M9XCJ3Yl9lbGVtZW50XCIgW2lkXT1cIidpdGVtXycgKyBpdGVtLmlkXCIgW2F0dHIuZGF0YS13Yi1pZF09XCJpdGVtLmlkXCIgW25nU3dpdGNoXT1cIml0ZW0udHlwZVwiXG4gICAgICAgICAgW2F0dHIudHJhbnNmb3JtXT1cIid0cmFuc2xhdGUoJyArIGl0ZW0ueCArICcsJyArIGl0ZW0ueSArICcpJyArICdyb3RhdGUoJyArIGl0ZW0ucm90YXRpb24gKyAnKSdcIlxuICAgICAgICAgIFthdHRyLm9wYWNpdHldPVwiaXRlbS5vcGFjaXR5IC8gMTAwXCI+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLkJSVVNIXCI+XG4gICAgICAgICAgICA8cGF0aCBjbGFzcz1cImJydXNoXCIgZmlsbD1cIm5vbmVcIiBbYXR0ci5kXT1cIml0ZW0udmFsdWVcIiBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cIml0ZW0ub3B0aW9ucy5saW5lQ2FwXCIgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cIml0ZW0ub3B0aW9ucy5saW5lSm9pblwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L3BhdGg+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5JTUFHRVwiPlxuICAgICAgICAgICAgPGltYWdlIFthdHRyLmhlaWdodF09XCJpdGVtLm9wdGlvbnMuaGVpZ2h0XCIgW2F0dHIud2lkdGhdPVwiaXRlbS5vcHRpb25zLndpZHRoXCIgcHJlc2VydmVBc3BlY3RSYXRpbz1cIm5vbmVcIlxuICAgICAgICAgICAgICBbYXR0ci54bGluazpocmVmXT1cIml0ZW0udmFsdWVcIiBbYXR0ci5ocmVmXT1cIml0ZW0udmFsdWVcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwiaXRlbS5vcHRpb25zLnN0cm9rZVdpZHRoXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuZmlsbF09XCJpdGVtLm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlQ29sb3JcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiPjwvaW1hZ2U+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5MSU5FXCI+XG4gICAgICAgICAgICA8bGluZSBjbGFzcz1cImxpbmVcIiBbYXR0ci54MV09XCJpdGVtLm9wdGlvbnMueDFcIiBbYXR0ci55MV09XCJpdGVtLm9wdGlvbnMueTFcIiBbYXR0ci54Ml09XCJpdGVtLm9wdGlvbnMueDJcIlxuICAgICAgICAgICAgICBbYXR0ci55Ml09XCJpdGVtLm9wdGlvbnMueTJcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwiaXRlbS5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwiaXRlbS5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwiaXRlbS5vcHRpb25zLmxpbmVDYXBcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwiaXRlbS5vcHRpb25zLmxpbmVKb2luXCIgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiPjwvbGluZT5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLlJFQ1RcIj5cbiAgICAgICAgICAgIDxyZWN0IGNsYXNzPVwicmVjdFwiIFthdHRyLnhdPVwiaXRlbS5vcHRpb25zLngyXCIgW2F0dHIueV09XCJpdGVtLm9wdGlvbnMueTJcIiBbYXR0ci5yeF09XCJpdGVtLm9wdGlvbnMucnhcIlxuICAgICAgICAgICAgICBbYXR0ci53aWR0aF09XCJpdGVtLm9wdGlvbnMud2lkdGhcIiBbYXR0ci5oZWlnaHRdPVwiaXRlbS5vcHRpb25zLmhlaWdodFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwiaXRlbS5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIml0ZW0ub3B0aW9ucy5kYXNob2Zmc2V0XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VXaWR0aFwiIFthdHRyLmZpbGxdPVwiaXRlbS5vcHRpb25zLmZpbGxcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9yZWN0PlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuRUxMSVBTRVwiPlxuICAgICAgICAgICAgPGVsbGlwc2UgW2F0dHIuY3hdPVwiaXRlbS5vcHRpb25zLmN4XCIgW2F0dHIuY3ldPVwiaXRlbS5vcHRpb25zLmN5XCIgW2F0dHIucnhdPVwiaXRlbS5vcHRpb25zLnJ4XCJcbiAgICAgICAgICAgICAgW2F0dHIucnldPVwiaXRlbS5vcHRpb25zLnJ5XCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VXaWR0aFwiIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cIml0ZW0ub3B0aW9ucy5saW5lQ2FwXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cIml0ZW0ub3B0aW9ucy5saW5lSm9pblwiIFthdHRyLnN0cm9rZV09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlQ29sb3JcIlxuICAgICAgICAgICAgICBbYXR0ci5maWxsXT1cIml0ZW0ub3B0aW9ucy5maWxsXCI+PC9lbGxpcHNlPlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuVEVYVFwiPlxuICAgICAgICAgICAgPHRleHQgY2xhc3M9XCJ0ZXh0X2VsZW1lbnRcIiB0ZXh0LWFuY2hvcj1cInN0YXJ0XCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIiBbYXR0ci54XT1cIml0ZW0ub3B0aW9ucy5sZWZ0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJpdGVtLm9wdGlvbnMudG9wXCIgW2F0dHIud2lkdGhdPVwiaXRlbS5vcHRpb25zLndpZHRoXCIgW2F0dHIuaGVpZ2h0XT1cIml0ZW0ub3B0aW9ucy5oZWlnaHRcIlxuICAgICAgICAgICAgICBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiIFthdHRyLmZvbnQtc2l6ZV09XCJpdGVtLm9wdGlvbnMuZm9udFNpemVcIlxuICAgICAgICAgICAgICBbYXR0ci5mb250LWZhbWlseV09XCJpdGVtLm9wdGlvbnMuZm9udEZhbWlseVwiIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwiaXRlbS5vcHRpb25zLmRhc2hhcnJheVwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwiaXRlbS5vcHRpb25zLnN0cm9rZVdpZHRoXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwiaXRlbS5vcHRpb25zLmxpbmVDYXBcIiBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwiaXRlbS5vcHRpb25zLmxpbmVKb2luXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiIFthdHRyLmZpbGxdPVwiaXRlbS5vcHRpb25zLmZpbGxcIlxuICAgICAgICAgICAgICBbYXR0ci5mb250LXN0eWxlXT1cIml0ZW0ub3B0aW9ucy5mb250U3R5bGVcIiBbYXR0ci5mb250LXdlaWdodF09XCJpdGVtLm9wdGlvbnMuZm9udFdlaWdodFwiPlxuICAgICAgICAgICAgICB7eyBpdGVtLnZhbHVlIH19XG4gICAgICAgICAgICA8L3RleHQ+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaERlZmF1bHQ+XG4gICAgICAgICAgICA8dGV4dD5Ob3QgZGVmaW5lZCB0eXBlPC90ZXh0PlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgPC9nPlxuICAgICAgPC9uZy1jb250YWluZXI+XG4gICAgICA8ZyBjbGFzcz1cInRlbXAtZWxlbWVudFwiICpuZ0lmPVwidGVtcEVsZW1lbnRcIiAgW25nU3dpdGNoXT1cInNlbGVjdGVkVG9vbFwiPlxuICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInRvb2xzLkJSVVNIXCI+XG4gICAgICAgIDxwYXRoIGNsYXNzPVwiYnJ1c2hcIiBmaWxsPVwibm9uZVwiIFthdHRyLmRdPVwidGVtcEVsZW1lbnQudmFsdWVcIiBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUNhcFwiIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVKb2luXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2VdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VDb2xvclwiPjwvcGF0aD5cbiAgICAgIDwvZz5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5JTUFHRVwiPlxuICAgICAgICA8aW1hZ2UgW2F0dHIuaGVpZ2h0XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0XCIgW2F0dHIud2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy53aWR0aFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJub25lXCJcbiAgICAgICAgICBbYXR0ci54bGluazpocmVmXT1cInRlbXBFbGVtZW50LnZhbHVlXCIgW2F0dHIuaHJlZl09XCJ0ZW1wRWxlbWVudC52YWx1ZVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuZmlsbF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZpbGxcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIj48L2ltYWdlPlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLkxJTkVcIj5cbiAgICAgICAgPGxpbmUgY2xhc3M9XCJsaW5lXCIgW2F0dHIueDFdPVwidGVtcEVsZW1lbnQub3B0aW9ucy54MVwiIFthdHRyLnkxXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueTFcIiBbYXR0ci54Ml09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLngyXCJcbiAgICAgICAgICBbYXR0ci55Ml09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnkyXCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUNhcFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUpvaW5cIiBbYXR0ci5zdHJva2VdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VDb2xvclwiPjwvbGluZT5cbiAgICAgIDwvZz5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5SRUNUXCI+XG4gICAgICAgIDxyZWN0IGNsYXNzPVwicmVjdFwiIFthdHRyLnhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy54MlwiIFthdHRyLnldPVwidGVtcEVsZW1lbnQub3B0aW9ucy55MlwiIFthdHRyLnJ4XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMucnhcIlxuICAgICAgICAgIFthdHRyLndpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMud2lkdGhcIiBbYXR0ci5oZWlnaHRdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5oZWlnaHRcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hvZmZzZXRcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoXCIgW2F0dHIuZmlsbF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZpbGxcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9yZWN0PlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLkVMTElQU0VcIj5cbiAgICAgICAgPGVsbGlwc2UgW2F0dHIuY3hdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5jeFwiIFthdHRyLmN5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuY3lcIiBbYXR0ci5yeF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnJ4XCJcbiAgICAgICAgICBbYXR0ci5yeV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnJ5XCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUNhcFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUpvaW5cIiBbYXR0ci5zdHJva2VdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VDb2xvclwiXG4gICAgICAgICAgW2F0dHIuZmlsbF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZpbGxcIj48L2VsbGlwc2U+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuVEVYVFwiPlxuICAgICAgICA8dGV4dCBjbGFzcz1cInRleHRfZWxlbWVudFwiIHRleHQtYW5jaG9yPVwic3RhcnRcIiB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiIFthdHRyLnhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5sZWZ0XCJcbiAgICAgICAgICBbYXR0ci55XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMudG9wXCIgW2F0dHIud2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy53aWR0aFwiIFthdHRyLmhlaWdodF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmhlaWdodFwiXG4gICAgICAgICAgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIiBbYXR0ci5mb250LXNpemVdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5mb250U2l6ZVwiXG4gICAgICAgICAgW2F0dHIuZm9udC1mYW1pbHldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5mb250RmFtaWx5XCIgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVDYXBcIiBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lSm9pblwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIiBbYXR0ci5maWxsXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZmlsbFwiXG4gICAgICAgICAgW2F0dHIuZm9udC1zdHlsZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZvbnRTdHlsZVwiIFthdHRyLmZvbnQtd2VpZ2h0XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZm9udFdlaWdodFwiPlxuICAgICAgICAgIHt7IHRlbXBFbGVtZW50LnZhbHVlIH19XG4gICAgICAgIDwvdGV4dD5cbiAgICAgIDwvZz5cbiAgICAgIDxnICpuZ1N3aXRjaERlZmF1bHQ+XG4gICAgICAgIDx0ZXh0Pk5vdCBkZWZpbmVkIHR5cGU8L3RleHQ+XG4gICAgICA8L2c+XG4gICAgPC9nPlxuICAgICAgPGcgaWQ9XCJzZWxlY3RvclBhcmVudEdyb3VwXCIgKm5nSWY9XCJzZWxlY3RlZEVsZW1lbnRcIj5cbiAgICAgICAgPGcgY2xhc3M9XCJzZWxlY3Rvckdyb3VwXCIgaWQ9XCJzZWxlY3Rvckdyb3VwXCIgdHJhbnNmb3JtPVwiXCIgW3N0eWxlLmRpc3BsYXldPVwicnViYmVyQm94LmRpc3BsYXlcIlxuICAgICAgICAgIFthdHRyLnRyYW5zZm9ybV09XCIndHJhbnNsYXRlKCcgKyBzZWxlY3RlZEVsZW1lbnQueCArICcsJyArIHNlbGVjdGVkRWxlbWVudC55ICsgJyknICsgJ3JvdGF0ZSgnICsgc2VsZWN0ZWRFbGVtZW50LnJvdGF0aW9uICsgJyknXCI+XG4gICAgICAgICAgPGcgZGlzcGxheT1cImlubGluZVwiPlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RlZEJveFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiIzRGODBGRlwiIHNoYXBlLXJlbmRlcmluZz1cImNyaXNwRWRnZXNcIlxuICAgICAgICAgICAgICBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBub25lO1wiIFthdHRyLnhdPVwicnViYmVyQm94LnhcIiBbYXR0ci55XT1cInJ1YmJlckJveC55XCIgW2F0dHIud2lkdGhdPVwicnViYmVyQm94LndpZHRoXCJcbiAgICAgICAgICAgICAgW2F0dHIuaGVpZ2h0XT1cInJ1YmJlckJveC5oZWlnaHRcIiBzdHlsZT1cImN1cnNvcjogbW92ZTtcIiAocG9pbnRlcmRvd24pPVwibW92ZVNlbGVjdCgkZXZlbnQpXCI+XG4gICAgICAgICAgICA8L3JlY3Q+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnIGRpc3BsYXk9XCJpbmxpbmVcIj5cbiAgICAgICAgICAgIDxjaXJjbGUgY2xhc3M9XCJzZWxlY3Rvcl9yb3RhdGVcIiBpZD1cInNlbGVjdG9yR3JpcF9yb3RhdGVfbndcIiBmaWxsPVwiIzAwMFwiIHI9XCI4XCIgc3Ryb2tlPVwiIzAwMFwiIGZpbGwtb3BhY2l0eT1cIjBcIlxuICAgICAgICAgICAgICBzdHJva2Utb3BhY2l0eT1cIjBcIiBzdHJva2Utd2lkdGg9XCIwXCIgW2F0dHIuY3hdPVwicnViYmVyQm94LnggLSA0XCIgW2F0dHIuY3ldPVwicnViYmVyQm94LnkgLSA0XCI+PC9jaXJjbGU+XG4gICAgICAgICAgICA8Y2lyY2xlIGNsYXNzPVwic2VsZWN0b3Jfcm90YXRlXCIgaWQ9XCJzZWxlY3RvckdyaXBfcm90YXRlX25lXCIgZmlsbD1cIiMwMDBcIiByPVwiOFwiIHN0cm9rZT1cIiMwMDBcIiBmaWxsLW9wYWNpdHk9XCIwXCJcbiAgICAgICAgICAgICAgc3Ryb2tlLW9wYWNpdHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiIFthdHRyLmN4XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoICsgNFwiXG4gICAgICAgICAgICAgIFthdHRyLmN5XT1cInJ1YmJlckJveC55IC0gNFwiPlxuICAgICAgICAgICAgPC9jaXJjbGU+XG4gICAgICAgICAgICA8Y2lyY2xlIGNsYXNzPVwic2VsZWN0b3Jfcm90YXRlXCIgaWQ9XCJzZWxlY3RvckdyaXBfcm90YXRlX3NlXCIgZmlsbD1cIiMwMDBcIiByPVwiOFwiIHN0cm9rZT1cIiMwMDBcIiBmaWxsLW9wYWNpdHk9XCIwXCJcbiAgICAgICAgICAgICAgc3Ryb2tlLW9wYWNpdHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiIFthdHRyLmN4XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoICsgNFwiXG4gICAgICAgICAgICAgIFthdHRyLmN5XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCArIDRcIj48L2NpcmNsZT5cbiAgICAgICAgICAgIDxjaXJjbGUgY2xhc3M9XCJzZWxlY3Rvcl9yb3RhdGVcIiBpZD1cInNlbGVjdG9yR3JpcF9yb3RhdGVfc3dcIiBmaWxsPVwiIzAwMFwiIHI9XCI4XCIgc3Ryb2tlPVwiIzAwMFwiIGZpbGwtb3BhY2l0eT1cIjBcIlxuICAgICAgICAgICAgICBzdHJva2Utb3BhY2l0eT1cIjBcIiBzdHJva2Utd2lkdGg9XCIwXCIgW2F0dHIuY3hdPVwicnViYmVyQm94LnggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIuY3ldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0ICsgNFwiPlxuICAgICAgICAgICAgPC9jaXJjbGU+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfbndcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IG53LXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggLSA0XCIgW2F0dHIueV09XCJydWJiZXJCb3gueSAtIDRcIlxuICAgICAgICAgICAgICAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj5cbiAgICAgICAgICAgIDwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9uXCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBuLXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggLyAyIC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwicnViYmVyQm94LnkgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX25lXCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBuZS1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoIC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwicnViYmVyQm94LnkgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX2VcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IGUtcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCAvIDIgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX3NlXCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBzZS1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoIC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0IC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9zXCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBzLXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggLyAyIC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0IC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9zd1wiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogc3ctcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfd1wiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogdy1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54IC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwicnViYmVyQm94LnkgKyBydWJiZXJCb3guaGVpZ2h0IC8gMiAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgPC9nPlxuICAgICAgICA8L2c+XG4gICAgICA8L2c+XG4gICAgPC9nPlxuICA8L3N2Zz5cbjwvc3ZnPlxuXG48ZGl2IFtzdHlsZV09XCInZm9udC1mYW1pbHk6JyArIGZvbnRGYW1pbHkgKyAnOycgKyAnZm9udC1zaXplOicgKyBmb250U2l6ZSArICdweDsnK1xuJ3BvaW50ZXItZXZlbnRzOiBub25lOyB3aWR0aDogJyArIGNhbnZhc1dpZHRoICogem9vbSArICdweDsgJytcbiAgJ2hlaWdodDogJyArIGNhbnZhc0hlaWdodCAqIHpvb20gKyAncHg7JyArXG4gICdwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogJyArIHkgKyAncHg7IGxlZnQ6ICcgKyB4ICsgJ3B4OydcIiAqbmdJZj1cInRlbXBFbGVtZW50ICYmIHNlbGVjdGVkVG9vbCA9PT0gdG9vbHMuVEVYVFwiPlxuICA8aW5wdXQgI3RleHRJbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwidGV4dC1pbnB1dFwiIFtzdHlsZV09XCInd2lkdGg6ICcgKyB0ZXh0SW5wdXQudmFsdWUubGVuZ3RoICsgJ2NoOyAnK1xuICAgICdoZWlnaHQ6ICcgKyAoMiAqIHpvb20pICsgJ2NoOycrXG4gICAgJ3RvcDogJyArICgodGVtcEVsZW1lbnQub3B0aW9ucy50b3AgfHwgMCAtIDEwKSAqIHpvb20pICsgJ3B4OycgK1xuICAgICdsZWZ0OiAnICsgKCh0ZW1wRWxlbWVudC5vcHRpb25zLmxlZnQgfHwgMCArIDMpKiB6b29tKSArICdweDsnXG4gICAgXCIgKGlucHV0KT1cInVwZGF0ZVRleHRJdGVtKHRleHRJbnB1dC52YWx1ZSlcIiBhdXRvZm9jdXMgLz5cbjwvZGl2PiJdfQ==