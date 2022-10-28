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
        console.log('DO RESET NOW', this._initialData);
        this.undoStack = [];
        this.redoStack = [];
        // try {
        //   this.data = JSON.parse(JSON.stringify(this._initialData));
        // } catch(e) {
        this.data = [];
        // }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctd2hpdGVib2FyZC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZy13aGl0ZWJvYXJkL3NyYy9saWIvbmctd2hpdGVib2FyZC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFpQixTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBYSxNQUFNLEVBQUUsWUFBWSxFQUFvQyxNQUFNLGVBQWUsQ0FBQztBQUMxSixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQWdCLFNBQVMsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUEwQixXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSxVQUFVLENBQUM7QUFDM0osT0FBTyxFQUFvQixVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFhLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQzs7OztBQUkvRixNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7QUFNeEMsTUFBTSxPQUFPLHFCQUFxQjtJQXNGaEMsWUFBb0IsaUJBQXNDO1FBQXRDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUI7UUFqRmxELFVBQUssR0FBeUMsSUFBSSxlQUFlLENBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBdUIxRixtQkFBYyxHQUFHLElBQUksQ0FBQztRQUN0QixnQkFBVyxHQUFHLEdBQUcsQ0FBQztRQUNsQixpQkFBWSxHQUFHLEdBQUcsQ0FBQztRQUNuQixlQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLFdBQU0sR0FBRyxJQUFJLENBQUM7UUFDZCxnQkFBVyxHQUFHLE1BQU0sQ0FBQztRQUNyQixnQkFBVyxHQUFHLENBQUMsQ0FBQztRQUNoQixvQkFBZSxHQUFHLE1BQU0sQ0FBQztRQUN6QixhQUFRLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQztRQUM5QixZQUFPLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUM1QixTQUFJLEdBQUcsTUFBTSxDQUFDO1FBQ2QsU0FBSSxHQUFHLENBQUMsQ0FBQztRQUNULGVBQVUsR0FBRyxZQUFZLENBQUM7UUFDMUIsYUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNkLGNBQVMsR0FBRyxFQUFFLENBQUM7UUFDZixlQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsTUFBQyxHQUFHLENBQUMsQ0FBQztRQUNOLE1BQUMsR0FBRyxDQUFDLENBQUM7UUFDTixlQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ25CLGFBQVEsR0FBRyxFQUFFLENBQUM7UUFDZCxlQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ25CLGtCQUFhLEdBQXFCLFNBQVMsQ0FBQztRQUUzQyxVQUFLLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUMzQixlQUFVLEdBQUcsSUFBSSxZQUFZLEVBQXVCLENBQUM7UUFDckQsVUFBSyxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDM0IsU0FBSSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDMUIsU0FBSSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDMUIsU0FBSSxHQUFHLElBQUksWUFBWSxFQUFVLENBQUM7UUFDbEMsZUFBVSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDaEMsa0JBQWEsR0FBRyxJQUFJLFlBQVksRUFBNEIsQ0FBQztRQUM3RCxrQkFBYSxHQUFHLElBQUksWUFBWSxFQUFxQixDQUFDO1FBQ3RELGdCQUFXLEdBQUcsSUFBSSxZQUFZLEVBQWEsQ0FBQztRQUk5QyxzQkFBaUIsR0FBbUIsRUFBRSxDQUFDO1FBRXZDLGlCQUFZLEdBQXdCLEVBQUUsQ0FBQztRQUN2QyxjQUFTLEdBQTBCLEVBQUUsQ0FBQztRQUN0QyxjQUFTLEdBQTBCLEVBQUUsQ0FBQztRQUN0QyxrQkFBYSxHQUFjLFNBQVMsQ0FBQyxLQUFLLENBQUM7UUFHbkQsVUFBSyxHQUFHLGVBQWUsQ0FBQztRQUN4QixVQUFLLEdBQUcsU0FBUyxDQUFDO1FBS2xCLGNBQVMsR0FBRztZQUNWLENBQUMsRUFBRSxDQUFDO1lBQ0osQ0FBQyxFQUFFLENBQUM7WUFDSixLQUFLLEVBQUUsQ0FBQztZQUNSLE1BQU0sRUFBRSxDQUFDO1lBQ1QsT0FBTyxFQUFFLE1BQU07U0FDaEIsQ0FBQztJQUUyRCxDQUFDO0lBL0U5RCxJQUFhLElBQUksQ0FBQyxJQUF5QjtRQUN6QyxJQUFJLElBQUksRUFBRTtZQUNSLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3ZCO0lBQ0gsQ0FBQztJQUNELElBQUksSUFBSTtRQUNOLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBSUQsSUFBYSxZQUFZLENBQUMsSUFBZTtRQUN2QyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxFQUFFO1lBQy9CLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1lBQzFCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1NBQzdCO0lBQ0gsQ0FBQztJQUNELElBQUksWUFBWTtRQUNkLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUM1QixDQUFDO0lBNkRELFFBQVE7UUFDTixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFELElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUN0QixJQUFHO2dCQUNELE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtnQkFDdkUsSUFBSSxNQUFNLEVBQUU7b0JBQ1YsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztvQkFDeEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztpQkFDekM7YUFDRjtZQUFDLE9BQU0sQ0FBQyxFQUFFO2dCQUNULE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQTthQUN4QztTQUNGO0lBQ0gsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFzQjtRQUNoQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUN0QiwwRUFBMEU7WUFDMUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUM5RDtJQUNILENBQUM7SUFFRCxlQUFlO1FBQ2IsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQW1CLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDM0UsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNkLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDTixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxPQUEwQjtRQUN2RCxJQUFJLE9BQU8sRUFBRTtZQUNYLElBQUksT0FBTyxDQUFDLGNBQWMsSUFBSSxTQUFTLEVBQUU7Z0JBQ3ZDLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQzthQUM5QztZQUNELElBQUksT0FBTyxDQUFDLFlBQVksSUFBSSxTQUFTLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQzthQUMxQztZQUNELElBQUksT0FBTyxDQUFDLFdBQVcsSUFBSSxTQUFTLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQzthQUN4QztZQUNELElBQUksT0FBTyxDQUFDLFlBQVksSUFBSSxTQUFTLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQzthQUMxQztZQUNELElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxTQUFTLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUN0QztZQUNELElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxTQUFTLEVBQUU7Z0JBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQzthQUM5QjtZQUNELElBQUksT0FBTyxDQUFDLFdBQVcsSUFBSSxTQUFTLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQzthQUN4QztZQUNELElBQUksT0FBTyxDQUFDLFdBQVcsSUFBSSxTQUFTLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQzthQUN4QztZQUNELElBQUksT0FBTyxDQUFDLGVBQWUsSUFBSSxTQUFTLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQyxlQUFlLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQzthQUNoRDtZQUNELElBQUksT0FBTyxDQUFDLFFBQVEsSUFBSSxTQUFTLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQzthQUNsQztZQUNELElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxTQUFTLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUNoQztZQUNELElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxTQUFTLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQzthQUMxQjtZQUNELElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxTQUFTLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQzthQUMxQjtZQUNELElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxTQUFTLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUN0QztZQUNELElBQUksT0FBTyxDQUFDLFFBQVEsSUFBSSxTQUFTLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQzthQUNsQztZQUNELElBQUksT0FBTyxDQUFDLFNBQVMsSUFBSSxTQUFTLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQzthQUNwQztZQUNELElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxTQUFTLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUN0QztZQUNELElBQUksT0FBTyxDQUFDLENBQUMsSUFBSSxTQUFTLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNwQjtZQUNELElBQUksT0FBTyxDQUFDLENBQUMsSUFBSSxTQUFTLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNwQjtZQUNELElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxTQUFTLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUN0QztZQUNELElBQUksT0FBTyxDQUFDLFFBQVEsSUFBSSxTQUFTLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQzthQUNsQztZQUNELElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxTQUFTLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUN0QztZQUNELElBQUksT0FBTyxDQUFDLGFBQWEsSUFBSSxTQUFTLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQzthQUM1QztTQUNGO0lBQ0gsQ0FBQztJQUVPLGdCQUFnQjtRQUN0QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUN6QixJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQ3hHLENBQUM7UUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUN6QixJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQy9GLENBQUM7UUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6RyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLGNBQWMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUYsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFDbkIsWUFBWSxDQUFDLE9BQU8sQ0FBQyxjQUFjLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDakYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7SUFFRCxlQUFlLENBQUMsU0FBdUQ7UUFDckUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDeEIsT0FBTztTQUNSO1FBQ0QsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBRXJCLFNBQVMsQ0FBQyxJQUFJLENBQ1osSUFBSSxFQUFFO2FBQ0gsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDaEIsUUFBUSxHQUFHLElBQUksQ0FBQztZQUNoQixJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUMxQixDQUFDLENBQUM7YUFDRCxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUNmLElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQ2IsT0FBTzthQUNSO1lBQ0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3pCLENBQUMsQ0FBQzthQUNELEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO1lBQ2QsUUFBUSxHQUFHLEtBQUssQ0FBQztZQUNqQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQ0wsQ0FBQztJQUNKLENBQUM7SUFFRCxnQkFBZ0I7UUFDZCxRQUFRLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDekIsS0FBSyxTQUFTLENBQUMsS0FBSztnQkFDbEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hCLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQyxLQUFLO2dCQUNsQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQyxJQUFJO2dCQUNqQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQyxJQUFJO2dCQUNqQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQyxPQUFPO2dCQUNwQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDMUIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2pCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdEIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLE1BQU07Z0JBQ25CLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN4QixNQUFNO1lBQ1IsS0FBSyxTQUFTLENBQUMsTUFBTTtnQkFDbkIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hCLE1BQU07WUFDUjtnQkFDRSxNQUFNO1NBQ1Q7SUFDSCxDQUFDO0lBQ0QsZUFBZTtRQUNiLFFBQVEsSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN6QixLQUFLLFNBQVMsQ0FBQyxLQUFLO2dCQUNsQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQyxJQUFJO2dCQUNqQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQyxJQUFJO2dCQUNqQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQyxPQUFPO2dCQUNwQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDekIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2pCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdEIsTUFBTTtZQUNSO2dCQUNFLE1BQU07U0FDVDtJQUNILENBQUM7SUFDRCxjQUFjO1FBQ1osUUFBUSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ3pCLEtBQUssU0FBUyxDQUFDLEtBQUs7Z0JBQ2xCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdEIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2pCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDckIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLElBQUk7Z0JBQ2pCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDckIsTUFBTTtZQUNSLEtBQUssU0FBUyxDQUFDLE9BQU87Z0JBQ3BCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN4QixNQUFNO1lBQ1IsS0FBSyxTQUFTLENBQUMsSUFBSTtnQkFDakIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNyQixNQUFNO1lBQ1I7Z0JBQ0UsTUFBTTtTQUNUO0lBQ0gsQ0FBQztJQUNELG9CQUFvQjtJQUNwQixnQkFBZ0I7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFXLENBQUM7UUFDaEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUMvQyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQztJQUM3QixDQUFDO0lBQ0QsZUFBZTtRQUNiLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFXLENBQUM7SUFDM0QsQ0FBQztJQUNELGNBQWM7UUFDWixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBVyxDQUFDO1FBQ3pELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQWEsQ0FBQztRQUM5QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQWEsQ0FBQztJQUNuQyxDQUFDO0lBQ0Qsb0JBQW9CO0lBQ3BCLGVBQWU7UUFDYixNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLEtBQUssQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDO1FBQ3BCLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQ3pCLEtBQUssQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNyQixNQUFNLEtBQUssR0FBSSxDQUFDLENBQUMsTUFBMkIsQ0FBQyxLQUFLLENBQUM7WUFDbkQsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQWdCLEVBQUUsRUFBRTtvQkFDbkMsTUFBTSxLQUFLLEdBQUksQ0FBQyxDQUFDLE1BQXFCLENBQUMsTUFBZ0IsQ0FBQztvQkFDeEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsQ0FBQyxDQUFDO2dCQUNGLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDLENBQUM7UUFDRixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUNELG9CQUFvQjtJQUNwQixlQUFlLENBQUMsUUFBbUI7UUFDakMsSUFBSTtZQUNGLE1BQU0sT0FBTyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7WUFDNUIsT0FBTyxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQUU7Z0JBQ3BCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ3BDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7Z0JBQ2pDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7Z0JBQ25DLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDbkQsTUFBTSxNQUFNLEdBQUcsV0FBVyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO2dCQUN0RSxNQUFNLEtBQUssR0FBRyxNQUFNLEtBQUssU0FBUyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7Z0JBRXRGLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFFakUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUNULENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ1A7Z0JBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUNULENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ1A7Z0JBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDaEUsT0FBTyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBZSxDQUFDO2dCQUN6QyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQzlCLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztnQkFDaEMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JCLENBQUMsQ0FBQztZQUNGLE9BQU8sQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLEtBQWUsQ0FBQztTQUN4QztRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN0QjtJQUNILENBQUM7SUFDRCxtQkFBbUI7SUFDbkIsZUFBZTtRQUNiLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUM7UUFFakYsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ25CLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3pCO1FBRUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QixPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO0lBQzdCLENBQUM7SUFDRCxjQUFjO1FBQ1osSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUM7UUFFbkYsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ25CLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFCLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzNCO1FBRUQsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTtZQUM5QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFZLENBQUM7WUFDakQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBWSxDQUFDO1lBQ2pELE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNuRCxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNuQjtRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBQ0QsYUFBYTtRQUNYLElBQ0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDMUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFDMUQ7WUFDQSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFhLENBQUM7U0FDbEM7SUFDSCxDQUFDO0lBQ0QsbUJBQW1CO0lBQ25CLGVBQWU7UUFDYixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNuQixDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6QjtRQUNELE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QixPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QixPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO0lBQzdCLENBQUM7SUFDRCxjQUFjO1FBQ1osTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFFakIsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTtZQUM5QixDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLEtBQUssR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDNUMsS0FBSyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztTQUM3QzthQUFNO1lBQ0wsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdCLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztTQUM5QjtRQUNELElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUU7WUFDNUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNQLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDUCxLQUFLLEdBQUcsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDeEIsS0FBSyxHQUFHLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3pCO1FBQ0QsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ25CLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2pDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDcEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQztJQUN0QyxDQUFDO0lBQ0QsYUFBYTtRQUNYLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1lBQy9FLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQWEsQ0FBQztTQUNsQztJQUNILENBQUM7SUFDRCxzQkFBc0I7SUFDdEIsa0JBQWtCO1FBQ2hCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUM7UUFFbkYsYUFBYTtRQUNiLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QixPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFdkIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQztJQUM3QixDQUFDO0lBQ0QsaUJBQWlCO1FBQ2YsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9DLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9DLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2hDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRWhDLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7WUFDOUIsRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUNSLEVBQUUsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1NBQ2hEO1FBQ0QsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRTtZQUM1QixFQUFFLEdBQUcsT0FBTyxDQUFDO1lBQ2IsRUFBRSxHQUFHLE9BQU8sQ0FBQztZQUNiLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUN0QixFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDekQ7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFDRCxnQkFBZ0I7UUFDZCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUN4RSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFhLENBQUM7U0FDbEM7SUFDSCxDQUFDO0lBQ0QsbUJBQW1CO0lBQ25CLGNBQWM7UUFDWixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDcEIsbUNBQW1DO1lBQ25DLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN2QixPQUFPO1NBQ1I7UUFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUN4QixPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDekIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO1FBQzNCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZCxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDUixDQUFDO0lBQ0QsY0FBYztRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3JCLE9BQU87U0FDUjtRQUNELE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQ25GLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBQ0QsYUFBYTtRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3JCLE9BQU87U0FDUjtRQUNELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBQ0QscUJBQXFCO0lBQ3JCLGdCQUFnQjtRQUNkLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUM1QyxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFJLFlBQVksQ0FBQyxFQUFFLEtBQUssZUFBZSxFQUFFO2dCQUN2QyxPQUFPO2FBQ1I7WUFDRCxNQUFNLEVBQUUsR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ25ELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBc0IsQ0FBQztZQUNsRixJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUM7U0FDMUM7YUFBTTtZQUNMLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1NBQzdCO0lBQ0gsQ0FBQztJQUNELHFCQUFxQjtJQUNyQixnQkFBZ0I7UUFDZCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDNUMsSUFBSSxZQUFZLEVBQUU7WUFDaEIsTUFBTSxFQUFFLEdBQUcsWUFBWSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNuRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQXNCLENBQUM7WUFDMUUsSUFBSSxPQUFPLEVBQUU7Z0JBQ1gsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNuQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNsQztTQUNGO0lBQ0gsQ0FBQztJQUNELDRGQUE0RjtJQUM1RixnREFBZ0Q7SUFDaEQsZUFBZTtRQUNiLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztRQUNqRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDL0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRTtZQUMxQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDcEI7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQWEsQ0FBQztJQUNuQyxDQUFDO0lBQ0Qsb0JBQW9CO0lBQ3BCLGNBQWMsQ0FBQyxLQUFhO1FBQzFCLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUU7WUFDM0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1NBQ2hDO0lBQ0gsQ0FBQztJQUNELGtCQUFrQixDQUFDLE9BQTBCO1FBQzNDLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUNyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxlQUFlLEdBQUcsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUNELG9CQUFvQjtRQUNsQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQWEsQ0FBQztRQUNyQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUNPLE9BQU8sQ0FBQyxJQUFZLEVBQUUsTUFBbUI7UUFDL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25FLFNBQVMsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNqRCxTQUFTLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxFQUFvQixDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RixNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDO1FBQzlDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRTNCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBYyxDQUFDLENBQUM7UUFDakQsUUFBUSxNQUFNLEVBQUU7WUFDZCxLQUFLLFVBQVUsQ0FBQyxNQUFNO2dCQUNwQixJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsTUFBTSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7b0JBQ25GLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QixDQUFDLENBQUMsQ0FBQztnQkFDSCxNQUFNO1lBQ1IsS0FBSyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLE1BQU0sTUFBTSxHQUFHLDRCQUE0QixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1RixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZCLE1BQU07YUFDUDtZQUNEO2dCQUNFLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtvQkFDbkYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QixDQUFDLENBQUMsQ0FBQztnQkFDSCxNQUFNO1NBQ1Q7UUFDRCxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUNPLGVBQWUsQ0FDckIsU0FBaUIsRUFDakIsS0FBYSxFQUNiLE1BQWMsRUFDZCxNQUFjLEVBQ2QsUUFBK0I7UUFFL0IsbUNBQW1DO1FBQ25DLE1BQU0sR0FBRyxNQUFNLElBQUksS0FBSyxDQUFDO1FBQ3pCLCtCQUErQjtRQUMvQixNQUFNLE9BQU8sR0FBRyw0QkFBNEIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RixzQ0FBc0M7UUFDdEMsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRCwyQ0FBMkM7UUFDM0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQTZCLENBQUM7UUFDcEUsa0JBQWtCO1FBQ2xCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3ZCLHFDQUFxQztRQUNyQyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQzFCLGtDQUFrQztRQUNsQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUNsQix3QkFBd0I7WUFDeEIsZUFBZTtZQUNmLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkMscUNBQXFDO1lBQ3JDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLHlCQUF5QjtZQUN6QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUNwRCxnQ0FBZ0M7WUFDaEMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxDQUFDLFlBQVk7UUFDZiw4Q0FBOEM7UUFDOUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUM7SUFDdEIsQ0FBQztJQUNPLFNBQVMsQ0FBQyxPQUFnQjtRQUNoQyxNQUFNLFVBQVUsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQ3ZDLElBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RCxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLG1DQUFtQztRQUNyRyxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDM0QsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUNPLFFBQVEsQ0FBQyxHQUFXLEVBQUUsSUFBWTtRQUN4QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxJQUFJLGlCQUFpQixDQUFDO1FBQzFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFDTyxXQUFXLENBQUMsT0FBMEI7UUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFDTyxTQUFTO1FBQ2YsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUNPLFFBQVE7UUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUU7WUFDMUIsT0FBTztTQUNSO1FBQ0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMxQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFtQyxDQUFDLENBQUM7UUFDekQsSUFBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBQztZQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqRjthQUFNO1lBQ0wsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ2pFO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBQ08sUUFBUTtRQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtZQUMxQixPQUFPO1NBQ1I7UUFDRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBd0IsQ0FBQyxDQUFDO1FBQ3JGLElBQUksQ0FBQyxJQUFJLEdBQUcsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFDTyxXQUFXO1FBQ2pCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFDTyxNQUFNO1FBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLFFBQVE7UUFDUiwrREFBK0Q7UUFDL0QsZUFBZTtRQUNiLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLElBQUk7UUFDSixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBQ08sa0JBQWtCO1FBQ3hCLE1BQU0sYUFBYSxHQUFHLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQztRQUM5RixZQUFZLENBQUMsT0FBTyxDQUFDLGNBQWMsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBQ08sbUJBQW1CLENBQUMsSUFBcUI7UUFDL0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUU7WUFDMUMsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtTQUM1QixDQUFDLENBQUM7UUFDSCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBQ08sZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBbUI7UUFDOUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUNPLFlBQVk7UUFDbEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUM7UUFDckQsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQztZQUM1QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUM7U0FDL0M7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDZixJQUFJLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLFlBQVksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7U0FDaEU7SUFDSCxDQUFDO0lBQ08sWUFBWSxDQUFDLEVBQVUsRUFBRSxFQUFVLEVBQUUsRUFBVSxFQUFFLEVBQVU7UUFDakUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhO1FBQ3ZDLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDbkIsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNuQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNsRCxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFDTyxXQUFXLENBQUMsQ0FBUztRQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzNCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN2QyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFDTyxlQUFlLENBQUMsT0FBMEI7UUFDaEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQXdCLENBQUM7UUFDckYsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNPLGVBQWU7UUFDckIsTUFBTSxHQUFHLEdBQVUsS0FBSyxDQUFDLFdBQVcsQ0FBQztRQUNyQyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDckMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxNQUE0QixDQUFDO1FBQ3BELElBQUksWUFBWSxDQUFDLEVBQUUsS0FBSyxTQUFTLEVBQUU7WUFDakMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQUksWUFBWSxDQUFDLFVBQVUsRUFBRTtZQUMzQixZQUFZLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxVQUFnQyxDQUFDO1lBQ3hFLElBQUksWUFBWSxDQUFDLEVBQUUsS0FBSyxlQUFlLEVBQUU7Z0JBQ3ZDLE9BQU8sWUFBWSxDQUFDO2FBQ3JCO1lBQ0QsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUN6QyxJQUFJLFlBQVksQ0FBQyxFQUFFLEtBQUssU0FBUyxFQUFFO29CQUNqQyxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFDRCxZQUFZLEdBQUcsWUFBWSxDQUFDLFVBQWdDLENBQUM7YUFDOUQ7U0FDRjtRQUNELE9BQU8sWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFDTyxVQUFVLENBQUMsSUFBYTtRQUM5QixJQUFJLENBQUMsU0FBUyxHQUFHO1lBQ2YsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBRSxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFzQixJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUc7WUFDN0UsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBRSxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFzQixJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUc7WUFDN0UsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsV0FBc0IsSUFBSSxDQUFDO1lBQzdFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFdBQXNCLElBQUksQ0FBQztZQUMvRSxPQUFPLEVBQUUsT0FBTztTQUNqQixDQUFDO0lBQ0osQ0FBQztJQUNELFVBQVUsQ0FBQyxTQUF1QjtRQUNoQyxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDekIsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLE1BQTRCLENBQUM7UUFDdkQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ3BELElBQUksQ0FBQyxhQUFhO2dCQUFFLE9BQU87WUFDM0IsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFO2dCQUN4QixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSyxTQUEwQixDQUFDLFNBQVMsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUssU0FBMEIsQ0FBQyxTQUFTLENBQUM7YUFDakU7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ0QsWUFBWSxDQUFDLFNBQXVCO1FBQ2xDLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQztRQUN6QixNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsTUFBNEIsQ0FBQztRQUN2RCxRQUFRLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDckQsSUFBSSxDQUFDLGFBQWE7Z0JBQUUsT0FBTztZQUMzQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsR0FBSSxTQUEwQixDQUFDLFNBQVMsQ0FBQztZQUNoRCxNQUFNLENBQUMsR0FBSSxTQUEwQixDQUFDLFNBQVMsQ0FBQztZQUNoRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN4RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ3pCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDM0IsUUFBUSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRTtnQkFDakMsS0FBSyxlQUFlLENBQUMsT0FBTztvQkFDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO29CQUNsRCxNQUFNO2dCQUNSLEtBQUssZUFBZSxDQUFDLElBQUk7b0JBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztvQkFDaEQsTUFBTTtnQkFDUjtvQkFDRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7b0JBQ25ELE1BQU07YUFDVDtZQUNELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUMsQ0FBQztRQUNILFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1lBQzFDLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ08sV0FBVyxDQUFDLEdBQVcsRUFBRSxJQUFVO1FBQ3pDLFFBQVEsR0FBRyxFQUFFO1lBQ1gsS0FBSyxJQUFJO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsTUFBTTtZQUNSLEtBQUssSUFBSTtnQkFDTixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDckQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELE1BQU07WUFDUixLQUFLLEdBQUc7Z0JBQ0wsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELE1BQU07WUFDUixLQUFLLElBQUk7Z0JBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxNQUFNO1lBQ1IsS0FBSyxHQUFHO2dCQUNMLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxNQUFNO1lBQ1IsS0FBSyxJQUFJO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsTUFBTTtTQUNUO0lBQ0gsQ0FBQztJQUNPLGFBQWEsQ0FBQyxHQUFXLEVBQUUsSUFBVTtRQUMzQyxRQUFRLEdBQUcsRUFBRTtZQUNYLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNO1lBQ1IsS0FBSyxHQUFHO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFELE1BQU07WUFDUixLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNO1lBQ1IsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFELE1BQU07WUFDUixLQUFLLEdBQUc7Z0JBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsTUFBTTtZQUNSLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQWEsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBYSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNO1lBQ1IsS0FBSyxHQUFHO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFhLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFELE1BQU07U0FDVDtJQUNILENBQUM7SUFDTyxjQUFjLENBQUMsR0FBVyxFQUFFLElBQVU7UUFDNUMsUUFBUSxHQUFHLEVBQUU7WUFDWCxLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDM0QsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMzRCxNQUFNO1lBQ1IsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzNELE1BQU07WUFDUixLQUFLLEdBQUc7Z0JBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekQsTUFBTTtZQUNSLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMzRCxNQUFNO1lBQ1IsS0FBSyxHQUFHO2dCQUNOLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzNELE1BQU07WUFDUixLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDM0QsTUFBTTtZQUNSLEtBQUssR0FBRztnQkFDTixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNO1NBQ1Q7SUFDSCxDQUFDO0lBRU8sWUFBWSxDQUFDLFlBQTBCO1FBQzdDLElBQUksWUFBWSxFQUFFO1lBQ2hCLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUM1QjtJQUNILENBQUM7O2tIQS8rQlUscUJBQXFCO3NHQUFyQixxQkFBcUIsMGtDQ2RsQyw0aGVBb01NOzJGRHRMTyxxQkFBcUI7a0JBTGpDLFNBQVM7K0JBQ0UsZUFBZTswR0FNekIsWUFBWTtzQkFEWCxTQUFTO3VCQUFDLGNBQWMsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7Z0JBRU8sU0FBUztzQkFBM0QsU0FBUzt1QkFBQyxXQUFXLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO2dCQUk1QixJQUFJO3NCQUFoQixLQUFLO2dCQVNHLE9BQU87c0JBQWYsS0FBSztnQkFFTyxZQUFZO3NCQUF4QixLQUFLO2dCQVVHLGNBQWM7c0JBQXRCLEtBQUs7Z0JBQ0csV0FBVztzQkFBbkIsS0FBSztnQkFDRyxZQUFZO3NCQUFwQixLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBQ0csTUFBTTtzQkFBZCxLQUFLO2dCQUNHLFdBQVc7c0JBQW5CLEtBQUs7Z0JBQ0csV0FBVztzQkFBbkIsS0FBSztnQkFDRyxlQUFlO3NCQUF2QixLQUFLO2dCQUNHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csT0FBTztzQkFBZixLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxJQUFJO3NCQUFaLEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxDQUFDO3NCQUFULEtBQUs7Z0JBQ0csQ0FBQztzQkFBVCxLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBQ0csUUFBUTtzQkFBaEIsS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUNHLGFBQWE7c0JBQXJCLEtBQUs7Z0JBRUksS0FBSztzQkFBZCxNQUFNO2dCQUNHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csS0FBSztzQkFBZCxNQUFNO2dCQUNHLElBQUk7c0JBQWIsTUFBTTtnQkFDRyxJQUFJO3NCQUFiLE1BQU07Z0JBQ0csSUFBSTtzQkFBYixNQUFNO2dCQUNHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csYUFBYTtzQkFBdEIsTUFBTTtnQkFDRyxhQUFhO3NCQUF0QixNQUFNO2dCQUNHLFdBQVc7c0JBQXBCLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIEFmdGVyVmlld0luaXQsIFZpZXdDaGlsZCwgSW5wdXQsIEVsZW1lbnRSZWYsIE9uRGVzdHJveSwgT3V0cHV0LCBFdmVudEVtaXR0ZXIsIE9uQ2hhbmdlcywgT25Jbml0LCBTaW1wbGVDaGFuZ2VzIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBOZ1doaXRlYm9hcmRTZXJ2aWNlIH0gZnJvbSAnLi9uZy13aGl0ZWJvYXJkLnNlcnZpY2UnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBmcm9tRXZlbnQsIHNraXAsIEJlaGF2aW9yU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgRWxlbWVudFR5cGVFbnVtLCBGb3JtYXRUeXBlLCBmb3JtYXRUeXBlcywgSUFkZEltYWdlLCBMaW5lQ2FwRW51bSwgTGluZUpvaW5FbnVtLCBUb29sc0VudW0sIFdoaXRlYm9hcmRFbGVtZW50LCBXaGl0ZWJvYXJkT3B0aW9ucyB9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7IENvbnRhaW5lckVsZW1lbnQsIGN1cnZlQmFzaXMsIGRyYWcsIGxpbmUsIG1vdXNlLCBzZWxlY3QsIFNlbGVjdGlvbiwgZXZlbnQgfSBmcm9tICdkMyc7XG5cbnR5cGUgQkJveCA9IHsgeDogbnVtYmVyOyB5OiBudW1iZXI7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH07XG5cbmNvbnN0IGQzTGluZSA9IGxpbmUoKS5jdXJ2ZShjdXJ2ZUJhc2lzKTtcbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ25nLXdoaXRlYm9hcmQnLFxuICB0ZW1wbGF0ZVVybDogJy4vbmctd2hpdGVib2FyZC5jb21wb25lbnQuaHRtbCcsXG4gIHN0eWxlVXJsczogWycuL25nLXdoaXRlYm9hcmQuY29tcG9uZW50LnNjc3MnXSxcbn0pXG5leHBvcnQgY2xhc3MgTmdXaGl0ZWJvYXJkQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkNoYW5nZXMsIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSB7XG4gIEBWaWV3Q2hpbGQoJ3N2Z0NvbnRhaW5lcicsIHsgc3RhdGljOiBmYWxzZSB9KVxuICBzdmdDb250YWluZXIhOiBFbGVtZW50UmVmPENvbnRhaW5lckVsZW1lbnQ+O1xuICBAVmlld0NoaWxkKCd0ZXh0SW5wdXQnLCB7IHN0YXRpYzogZmFsc2UgfSkgcHJpdmF0ZSB0ZXh0SW5wdXQhOiBFbGVtZW50UmVmPEhUTUxJbnB1dEVsZW1lbnQ+O1xuXG4gIHByaXZhdGUgX2RhdGE6IEJlaGF2aW9yU3ViamVjdDxXaGl0ZWJvYXJkRWxlbWVudFtdPiA9IG5ldyBCZWhhdmlvclN1YmplY3Q8V2hpdGVib2FyZEVsZW1lbnRbXT4oW10pO1xuXG4gIEBJbnB1dCgpIHNldCBkYXRhKGRhdGE6IFdoaXRlYm9hcmRFbGVtZW50W10pIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgdGhpcy5fZGF0YS5uZXh0KGRhdGEpO1xuICAgIH1cbiAgfVxuICBnZXQgZGF0YSgpOiBXaGl0ZWJvYXJkRWxlbWVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5fZGF0YS5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgQElucHV0KCkgb3B0aW9ucyE6IFdoaXRlYm9hcmRPcHRpb25zO1xuXG4gIEBJbnB1dCgpIHNldCBzZWxlY3RlZFRvb2wodG9vbDogVG9vbHNFbnVtKSB7XG4gICAgaWYgKHRoaXMuX3NlbGVjdGVkVG9vbCAhPT0gdG9vbCkge1xuICAgICAgdGhpcy5fc2VsZWN0ZWRUb29sID0gdG9vbDtcbiAgICAgIHRoaXMudG9vbENoYW5nZWQuZW1pdCh0b29sKTtcbiAgICAgIHRoaXMuY2xlYXJTZWxlY3RlZEVsZW1lbnQoKTtcbiAgICB9XG4gIH1cbiAgZ2V0IHNlbGVjdGVkVG9vbCgpOiBUb29sc0VudW0ge1xuICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZFRvb2w7XG4gIH1cbiAgQElucHV0KCkgZHJhd2luZ0VuYWJsZWQgPSB0cnVlO1xuICBASW5wdXQoKSBjYW52YXNXaWR0aCA9IDgwMDtcbiAgQElucHV0KCkgY2FudmFzSGVpZ2h0ID0gNjAwO1xuICBASW5wdXQoKSBmdWxsU2NyZWVuID0gdHJ1ZTtcbiAgQElucHV0KCkgY2VudGVyID0gdHJ1ZTtcbiAgQElucHV0KCkgc3Ryb2tlQ29sb3IgPSAnIzAwMCc7XG4gIEBJbnB1dCgpIHN0cm9rZVdpZHRoID0gMjtcbiAgQElucHV0KCkgYmFja2dyb3VuZENvbG9yID0gJyNmZmYnO1xuICBASW5wdXQoKSBsaW5lSm9pbiA9IExpbmVKb2luRW51bS5ST1VORDtcbiAgQElucHV0KCkgbGluZUNhcCA9IExpbmVDYXBFbnVtLlJPVU5EO1xuICBASW5wdXQoKSBmaWxsID0gJyMzMzMnO1xuICBASW5wdXQoKSB6b29tID0gMTtcbiAgQElucHV0KCkgZm9udEZhbWlseSA9ICdzYW5zLXNlcmlmJztcbiAgQElucHV0KCkgZm9udFNpemUgPSAyNDtcbiAgQElucHV0KCkgZGFzaGFycmF5ID0gJyc7XG4gIEBJbnB1dCgpIGRhc2hvZmZzZXQgPSAwO1xuICBASW5wdXQoKSB4ID0gMDtcbiAgQElucHV0KCkgeSA9IDA7XG4gIEBJbnB1dCgpIGVuYWJsZUdyaWQgPSBmYWxzZTtcbiAgQElucHV0KCkgZ3JpZFNpemUgPSAxMDtcbiAgQElucHV0KCkgc25hcFRvR3JpZCA9IGZhbHNlO1xuICBASW5wdXQoKSBwZXJzaXN0ZW5jZUlkOiBzdHJpbmd8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIEBPdXRwdXQoKSByZWFkeSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGRhdGFDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPFdoaXRlYm9hcmRFbGVtZW50W10+KCk7XG4gIEBPdXRwdXQoKSBjbGVhciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIHVuZG8gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSByZWRvID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgc2F2ZSA9IG5ldyBFdmVudEVtaXR0ZXI8c3RyaW5nPigpO1xuICBAT3V0cHV0KCkgaW1hZ2VBZGRlZCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIHNlbGVjdEVsZW1lbnQgPSBuZXcgRXZlbnRFbWl0dGVyPFdoaXRlYm9hcmRFbGVtZW50IHwgbnVsbD4oKTtcbiAgQE91dHB1dCgpIGRlbGV0ZUVsZW1lbnQgPSBuZXcgRXZlbnRFbWl0dGVyPFdoaXRlYm9hcmRFbGVtZW50PigpO1xuICBAT3V0cHV0KCkgdG9vbENoYW5nZWQgPSBuZXcgRXZlbnRFbWl0dGVyPFRvb2xzRW51bT4oKTtcblxuICBwcml2YXRlIHNlbGVjdGlvbiE6IFNlbGVjdGlvbjxFbGVtZW50LCB1bmtub3duLCBudWxsLCB1bmRlZmluZWQ+O1xuXG4gIHByaXZhdGUgX3N1YnNjcmlwdGlvbkxpc3Q6IFN1YnNjcmlwdGlvbltdID0gW107XG5cbiAgcHJpdmF0ZSBfaW5pdGlhbERhdGE6IFdoaXRlYm9hcmRFbGVtZW50W10gPSBbXTtcbiAgcHJpdmF0ZSB1bmRvU3RhY2s6IFdoaXRlYm9hcmRFbGVtZW50W11bXSA9IFtdO1xuICBwcml2YXRlIHJlZG9TdGFjazogV2hpdGVib2FyZEVsZW1lbnRbXVtdID0gW107XG4gIHByaXZhdGUgX3NlbGVjdGVkVG9vbDogVG9vbHNFbnVtID0gVG9vbHNFbnVtLkJSVVNIO1xuICBzZWxlY3RlZEVsZW1lbnQhOiBXaGl0ZWJvYXJkRWxlbWVudDtcblxuICB0eXBlcyA9IEVsZW1lbnRUeXBlRW51bTtcbiAgdG9vbHMgPSBUb29sc0VudW07XG5cbiAgdGVtcEVsZW1lbnQhOiBXaGl0ZWJvYXJkRWxlbWVudDtcbiAgdGVtcERyYXchOiBbbnVtYmVyLCBudW1iZXJdW107XG5cbiAgcnViYmVyQm94ID0ge1xuICAgIHg6IDAsXG4gICAgeTogMCxcbiAgICB3aWR0aDogMCxcbiAgICBoZWlnaHQ6IDAsXG4gICAgZGlzcGxheTogJ25vbmUnLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgd2hpdGVib2FyZFNlcnZpY2U6IE5nV2hpdGVib2FyZFNlcnZpY2UpIHt9XG5cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgdGhpcy5faW5pdElucHV0c0Zyb21PcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5faW5pdE9ic2VydmFibGVzKCk7XG4gICAgdGhpcy5faW5pdGlhbERhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuZGF0YSkpO1xuICAgIGlmICh0aGlzLnBlcnNpc3RlbmNlSWQpIHtcbiAgICAgIHRyeXtcbiAgICAgICAgY29uc3Qgc3RvcmVkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oYHdoaXRlYm9hcmRfJHt0aGlzLnBlcnNpc3RlbmNlSWR9YClcbiAgICAgICAgaWYgKHN0b3JlZCkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2Uoc3RvcmVkKTtcbiAgICAgICAgICB0aGlzLl9kYXRhLm5leHQocGFyc2VkLmRhdGEgfHwgW10pO1xuICAgICAgICAgIHRoaXMudW5kb1N0YWNrID0gcGFyc2VkLnVuZG9TdGFjayB8fCBbXTtcbiAgICAgICAgICB0aGlzLnJlZG9TdGFjayA9IHBhcnNlZC5yZWRvU3RhY2sgfHwgW107XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ0NvcnJ1cHQgd2hpdGVib2FyZCBkYXRhJylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKTogdm9pZCB7XG4gICAgaWYgKGNoYW5nZXNbJ29wdGlvbnMnXSkge1xuICAgICAgLy8mJiAhaXNFcXVhbChjaGFuZ2VzLm9wdGlvbnMuY3VycmVudFZhbHVlLCBjaGFuZ2VzLm9wdGlvbnMucHJldmlvdXNWYWx1ZSlcbiAgICAgIHRoaXMuX2luaXRJbnB1dHNGcm9tT3B0aW9ucyhjaGFuZ2VzWydvcHRpb25zJ10uY3VycmVudFZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgdGhpcy5zZWxlY3Rpb24gPSBzZWxlY3Q8RWxlbWVudCwgdW5rbm93bj4odGhpcy5zdmdDb250YWluZXIubmF0aXZlRWxlbWVudCk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnJlc2l6ZVNjcmVlbigpO1xuICAgIH0sIDApO1xuICAgIHRoaXMuaW5pdGFsaXplRXZlbnRzKHRoaXMuc2VsZWN0aW9uKTtcbiAgICB0aGlzLnJlYWR5LmVtaXQoKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QuZm9yRWFjaCgoc3Vic2NyaXB0aW9uKSA9PiB0aGlzLl91bnN1YnNjcmliZShzdWJzY3JpcHRpb24pKTtcbiAgfVxuXG4gIHByaXZhdGUgX2luaXRJbnB1dHNGcm9tT3B0aW9ucyhvcHRpb25zOiBXaGl0ZWJvYXJkT3B0aW9ucyk6IHZvaWQge1xuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICBpZiAob3B0aW9ucy5kcmF3aW5nRW5hYmxlZCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5kcmF3aW5nRW5hYmxlZCA9IG9wdGlvbnMuZHJhd2luZ0VuYWJsZWQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5zZWxlY3RlZFRvb2wgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRUb29sID0gb3B0aW9ucy5zZWxlY3RlZFRvb2w7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5jYW52YXNXaWR0aCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jYW52YXNXaWR0aCA9IG9wdGlvbnMuY2FudmFzV2lkdGg7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5jYW52YXNIZWlnaHQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuY2FudmFzSGVpZ2h0ID0gb3B0aW9ucy5jYW52YXNIZWlnaHQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5mdWxsU2NyZWVuICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmZ1bGxTY3JlZW4gPSBvcHRpb25zLmZ1bGxTY3JlZW47XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5jZW50ZXIgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuY2VudGVyID0gb3B0aW9ucy5jZW50ZXI7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5zdHJva2VDb2xvciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5zdHJva2VDb2xvciA9IG9wdGlvbnMuc3Ryb2tlQ29sb3I7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5zdHJva2VXaWR0aCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5zdHJva2VXaWR0aCA9IG9wdGlvbnMuc3Ryb2tlV2lkdGg7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5iYWNrZ3JvdW5kQ29sb3IgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gb3B0aW9ucy5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5saW5lSm9pbiAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5saW5lSm9pbiA9IG9wdGlvbnMubGluZUpvaW47XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5saW5lQ2FwICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmxpbmVDYXAgPSBvcHRpb25zLmxpbmVDYXA7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5maWxsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmZpbGwgPSBvcHRpb25zLmZpbGw7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy56b29tICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnpvb20gPSBvcHRpb25zLnpvb207XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5mb250RmFtaWx5ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmZvbnRGYW1pbHkgPSBvcHRpb25zLmZvbnRGYW1pbHk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5mb250U2l6ZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5mb250U2l6ZSA9IG9wdGlvbnMuZm9udFNpemU7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5kYXNoYXJyYXkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZGFzaGFycmF5ID0gb3B0aW9ucy5kYXNoYXJyYXk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5kYXNob2Zmc2V0ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmRhc2hvZmZzZXQgPSBvcHRpb25zLmRhc2hvZmZzZXQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy54ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnggPSBvcHRpb25zLng7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy55ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnkgPSBvcHRpb25zLnk7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5lbmFibGVHcmlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmVuYWJsZUdyaWQgPSBvcHRpb25zLmVuYWJsZUdyaWQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5ncmlkU2l6ZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5ncmlkU2l6ZSA9IG9wdGlvbnMuZ3JpZFNpemU7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5zbmFwVG9HcmlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnNuYXBUb0dyaWQgPSBvcHRpb25zLnNuYXBUb0dyaWQ7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5wZXJzaXN0ZW5jZUlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnBlcnNpc3RlbmNlSWQgPSBvcHRpb25zLnBlcnNpc3RlbmNlSWQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdE9ic2VydmFibGVzKCk6IHZvaWQge1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaChcbiAgICAgIHRoaXMud2hpdGVib2FyZFNlcnZpY2Uuc2F2ZVN2Z01ldGhvZENhbGxlZCQuc3Vic2NyaWJlKCh7IG5hbWUsIGZvcm1hdCB9KSA9PiB0aGlzLnNhdmVTdmcobmFtZSwgZm9ybWF0KSlcbiAgICApO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaChcbiAgICAgIHRoaXMud2hpdGVib2FyZFNlcnZpY2UuYWRkSW1hZ2VNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoaW1hZ2UpID0+IHRoaXMuaGFuZGxlRHJhd0ltYWdlKGltYWdlKSlcbiAgICApO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaCh0aGlzLndoaXRlYm9hcmRTZXJ2aWNlLmVyYXNlU3ZnTWV0aG9kQ2FsbGVkJC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5fY2xlYXJTdmcoKSkpO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaCh0aGlzLndoaXRlYm9hcmRTZXJ2aWNlLnJlc2V0U3ZnTWV0aG9kQ2FsbGVkJC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5fcmVzZXQoKSkpO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaCh0aGlzLndoaXRlYm9hcmRTZXJ2aWNlLnVuZG9TdmdNZXRob2RDYWxsZWQkLnN1YnNjcmliZSgoKSA9PiB0aGlzLnVuZG9EcmF3KCkpKTtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25MaXN0LnB1c2godGhpcy53aGl0ZWJvYXJkU2VydmljZS5yZWRvU3ZnTWV0aG9kQ2FsbGVkJC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5yZWRvRHJhdygpKSk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uTGlzdC5wdXNoKGZyb21FdmVudCh3aW5kb3csICdyZXNpemUnKS5zdWJzY3JpYmUoKCkgPT4gdGhpcy5yZXNpemVTY3JlZW4oKSkpO1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkxpc3QucHVzaChcbiAgICAgIHRoaXMuX2RhdGEucGlwZShza2lwKDEpKS5zdWJzY3JpYmUoKGRhdGEpID0+IHtcbiAgICAgICAgY29uc3Qgc3RvcmVkID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShgd2hpdGVib2FyZF8ke3RoaXMucGVyc2lzdGVuY2VJZH1gKXx8J3t9Jyk7XG4gICAgICAgIHN0b3JlZC5kYXRhID0gZGF0YTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oYHdoaXRlYm9hcmRfJHt0aGlzLnBlcnNpc3RlbmNlSWR9YCwgSlNPTi5zdHJpbmdpZnkoc3RvcmVkKSk7XG4gICAgICAgIHRoaXMuZGF0YUNoYW5nZS5lbWl0KGRhdGEpO1xuICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgaW5pdGFsaXplRXZlbnRzKHNlbGVjdGlvbjogU2VsZWN0aW9uPEVsZW1lbnQsIHVua25vd24sIG51bGwsIHVuZGVmaW5lZD4pOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZHJhd2luZ0VuYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IGRyYWdnaW5nID0gZmFsc2U7XG5cbiAgICBzZWxlY3Rpb24uY2FsbChcbiAgICAgIGRyYWcoKVxuICAgICAgICAub24oJ3N0YXJ0JywgKCkgPT4ge1xuICAgICAgICAgIGRyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnJlZG9TdGFjayA9IFtdO1xuICAgICAgICAgIHRoaXMudXBkYXRlTG9jYWxTdG9yYWdlKCk7XG4gICAgICAgICAgdGhpcy5oYW5kbGVTdGFydEV2ZW50KCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbignZHJhZycsICgpID0+IHtcbiAgICAgICAgICBpZiAoIWRyYWdnaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuaGFuZGxlRHJhZ0V2ZW50KCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgIGRyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5oYW5kbGVFbmRFdmVudCgpO1xuICAgICAgICB9KVxuICAgICk7XG4gIH1cblxuICBoYW5kbGVTdGFydEV2ZW50KCkge1xuICAgIHN3aXRjaCAodGhpcy5zZWxlY3RlZFRvb2wpIHtcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkJSVVNIOlxuICAgICAgICB0aGlzLmhhbmRsZVN0YXJ0QnJ1c2goKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5JTUFHRTpcbiAgICAgICAgdGhpcy5oYW5kbGVJbWFnZVRvb2woKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5MSU5FOlxuICAgICAgICB0aGlzLmhhbmRsZVN0YXJ0TGluZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlJFQ1Q6XG4gICAgICAgIHRoaXMuaGFuZGxlU3RhcnRSZWN0KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uRUxMSVBTRTpcbiAgICAgICAgdGhpcy5oYW5kbGVTdGFydEVsbGlwc2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5URVhUOlxuICAgICAgICB0aGlzLmhhbmRsZVRleHRUb29sKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uU0VMRUNUOlxuICAgICAgICB0aGlzLmhhbmRsZVNlbGVjdFRvb2woKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5FUkFTRVI6XG4gICAgICAgIHRoaXMuaGFuZGxlRXJhc2VyVG9vbCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBoYW5kbGVEcmFnRXZlbnQoKSB7XG4gICAgc3dpdGNoICh0aGlzLnNlbGVjdGVkVG9vbCkge1xuICAgICAgY2FzZSBUb29sc0VudW0uQlJVU0g6XG4gICAgICAgIHRoaXMuaGFuZGxlRHJhZ0JydXNoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uTElORTpcbiAgICAgICAgdGhpcy5oYW5kbGVEcmFnTGluZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlJFQ1Q6XG4gICAgICAgIHRoaXMuaGFuZGxlRHJhZ1JlY3QoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRvb2xzRW51bS5FTExJUFNFOlxuICAgICAgICB0aGlzLmhhbmRsZURyYWdFbGxpcHNlKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUb29sc0VudW0uVEVYVDpcbiAgICAgICAgdGhpcy5oYW5kbGVUZXh0RHJhZygpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBoYW5kbGVFbmRFdmVudCgpIHtcbiAgICBzd2l0Y2ggKHRoaXMuc2VsZWN0ZWRUb29sKSB7XG4gICAgICBjYXNlIFRvb2xzRW51bS5CUlVTSDpcbiAgICAgICAgdGhpcy5oYW5kbGVFbmRCcnVzaCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkxJTkU6XG4gICAgICAgIHRoaXMuaGFuZGxlRW5kTGluZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlJFQ1Q6XG4gICAgICAgIHRoaXMuaGFuZGxlRW5kUmVjdCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLkVMTElQU0U6XG4gICAgICAgIHRoaXMuaGFuZGxlRW5kRWxsaXBzZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVG9vbHNFbnVtLlRFWFQ6XG4gICAgICAgIHRoaXMuaGFuZGxlVGV4dEVuZCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgQnJ1c2ggdG9vbFxuICBoYW5kbGVTdGFydEJydXNoKCkge1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLkJSVVNIKTtcbiAgICB0aGlzLnRlbXBEcmF3ID0gW3RoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSldO1xuICAgIGVsZW1lbnQudmFsdWUgPSBkM0xpbmUodGhpcy50ZW1wRHJhdykgYXMgc3RyaW5nO1xuICAgIGVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aCA9IHRoaXMuc3Ryb2tlV2lkdGg7XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IGVsZW1lbnQ7XG4gIH1cbiAgaGFuZGxlRHJhZ0JydXNoKCkge1xuICAgIHRoaXMudGVtcERyYXcucHVzaCh0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpKTtcbiAgICB0aGlzLnRlbXBFbGVtZW50LnZhbHVlID0gZDNMaW5lKHRoaXMudGVtcERyYXcpIGFzIHN0cmluZztcbiAgfVxuICBoYW5kbGVFbmRCcnVzaCgpIHtcbiAgICB0aGlzLnRlbXBEcmF3LnB1c2godGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKSk7XG4gICAgdGhpcy50ZW1wRWxlbWVudC52YWx1ZSA9IGQzTGluZSh0aGlzLnRlbXBEcmF3KSBhcyBzdHJpbmc7XG4gICAgdGhpcy5fcHVzaFRvRGF0YSh0aGlzLnRlbXBFbGVtZW50KTtcbiAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgdGhpcy50ZW1wRHJhdyA9IG51bGwgYXMgbmV2ZXI7XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IG51bGwgYXMgbmV2ZXI7XG4gIH1cbiAgLy8gSGFuZGxlIEltYWdlIHRvb2xcbiAgaGFuZGxlSW1hZ2VUb29sKCkge1xuICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG4gICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgIGlucHV0LnR5cGUgPSAnZmlsZSc7XG4gICAgaW5wdXQuYWNjZXB0ID0gJ2ltYWdlLyonO1xuICAgIGlucHV0Lm9uY2hhbmdlID0gKGUpID0+IHtcbiAgICAgIGNvbnN0IGZpbGVzID0gKGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpLmZpbGVzO1xuICAgICAgaWYgKGZpbGVzKSB7XG4gICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAoZTogUHJvZ3Jlc3NFdmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGltYWdlID0gKGUudGFyZ2V0IGFzIEZpbGVSZWFkZXIpLnJlc3VsdCBhcyBzdHJpbmc7XG4gICAgICAgICAgdGhpcy5oYW5kbGVEcmF3SW1hZ2UoeyBpbWFnZSwgeCwgeSB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZXNbMF0pO1xuICAgICAgfVxuICAgIH07XG4gICAgaW5wdXQuY2xpY2soKTtcbiAgfVxuICAvLyBIYW5kbGUgRHJhdyBJbWFnZVxuICBoYW5kbGVEcmF3SW1hZ2UoaW1hZ2VTcmM6IElBZGRJbWFnZSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0ZW1wSW1nID0gbmV3IEltYWdlKCk7XG4gICAgICB0ZW1wSW1nLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgY29uc3Qgc3ZnSGVpZ2h0ID0gdGhpcy5jYW52YXNIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGltYWdlV2lkdGggPSB0ZW1wSW1nLndpZHRoO1xuICAgICAgICBjb25zdCBpbWFnZUhlaWdodCA9IHRlbXBJbWcuaGVpZ2h0O1xuICAgICAgICBjb25zdCBhc3BlY3RSYXRpbyA9IHRlbXBJbWcud2lkdGggLyB0ZW1wSW1nLmhlaWdodDtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gaW1hZ2VIZWlnaHQgPiBzdmdIZWlnaHQgPyBzdmdIZWlnaHQgLSA0MCA6IGltYWdlSGVpZ2h0O1xuICAgICAgICBjb25zdCB3aWR0aCA9IGhlaWdodCA9PT0gc3ZnSGVpZ2h0IC0gNDAgPyAoc3ZnSGVpZ2h0IC0gNDApICogYXNwZWN0UmF0aW8gOiBpbWFnZVdpZHRoO1xuXG4gICAgICAgIGxldCB4ID0gaW1hZ2VTcmMueCB8fCAoaW1hZ2VXaWR0aCAtIHdpZHRoKSAqIChpbWFnZVNyYy54IHx8IDApO1xuICAgICAgICBsZXQgeSA9IGltYWdlU3JjLnkgfHwgKGltYWdlSGVpZ2h0IC0gaGVpZ2h0KSAqIChpbWFnZVNyYy55IHx8IDApO1xuXG4gICAgICAgIGlmICh4IDwgMCkge1xuICAgICAgICAgIHggPSAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICh5IDwgMCkge1xuICAgICAgICAgIHkgPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX2dlbmVyYXRlTmV3RWxlbWVudChFbGVtZW50VHlwZUVudW0uSU1BR0UpO1xuICAgICAgICBlbGVtZW50LnZhbHVlID0gaW1hZ2VTcmMuaW1hZ2UgYXMgc3RyaW5nO1xuICAgICAgICBlbGVtZW50Lm9wdGlvbnMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgZWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgZWxlbWVudC54ID0geDtcbiAgICAgICAgZWxlbWVudC55ID0geTtcbiAgICAgICAgdGhpcy5fcHVzaFRvRGF0YShlbGVtZW50KTtcbiAgICAgICAgdGhpcy5pbWFnZUFkZGVkLmVtaXQoKTtcbiAgICAgICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgICAgfTtcbiAgICAgIHRlbXBJbWcuc3JjID0gaW1hZ2VTcmMuaW1hZ2UgYXMgc3RyaW5nO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICB9XG4gIH1cbiAgLy8gSGFuZGxlIExpbmUgdG9vbFxuICBoYW5kbGVTdGFydExpbmUoKSB7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX2dlbmVyYXRlTmV3RWxlbWVudChFbGVtZW50VHlwZUVudW0uTElORSk7XG4gICAgbGV0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG5cbiAgICBpZiAodGhpcy5zbmFwVG9HcmlkKSB7XG4gICAgICB4ID0gdGhpcy5fc25hcFRvR3JpZCh4KTtcbiAgICAgIHkgPSB0aGlzLl9zbmFwVG9HcmlkKHkpO1xuICAgIH1cblxuICAgIGVsZW1lbnQub3B0aW9ucy54MSA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLnkxID0geTtcbiAgICBlbGVtZW50Lm9wdGlvbnMueDIgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy55MiA9IHk7XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IGVsZW1lbnQ7XG4gIH1cbiAgaGFuZGxlRHJhZ0xpbmUoKSB7XG4gICAgbGV0IFt4MiwgeTJdID0gdGhpcy5fY2FsY3VsYXRlWEFuZFkobW91c2UodGhpcy5zZWxlY3Rpb24ubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQpKTtcblxuICAgIGlmICh0aGlzLnNuYXBUb0dyaWQpIHtcbiAgICAgIHgyID0gdGhpcy5fc25hcFRvR3JpZCh4Mik7XG4gICAgICB5MiA9IHRoaXMuX3NuYXBUb0dyaWQoeTIpO1xuICAgIH1cblxuICAgIGlmIChldmVudC5zb3VyY2VFdmVudC5zaGlmdEtleSkge1xuICAgICAgY29uc3QgeDEgPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDEgYXMgbnVtYmVyO1xuICAgICAgY29uc3QgeTEgPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTEgYXMgbnVtYmVyO1xuICAgICAgY29uc3QgeyB4LCB5IH0gPSB0aGlzLl9zbmFwVG9BbmdsZSh4MSwgeTEsIHgyLCB5Mik7XG4gICAgICBbeDIsIHkyXSA9IFt4LCB5XTtcbiAgICB9XG5cbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDIgPSB4MjtcbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTIgPSB5MjtcbiAgfVxuICBoYW5kbGVFbmRMaW5lKCkge1xuICAgIGlmIChcbiAgICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MSAhPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDIgfHxcbiAgICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MSAhPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTJcbiAgICApIHtcbiAgICAgIHRoaXMuX3B1c2hUb0RhdGEodGhpcy50ZW1wRWxlbWVudCk7XG4gICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgICB0aGlzLnRlbXBFbGVtZW50ID0gbnVsbCBhcyBuZXZlcjtcbiAgICB9XG4gIH1cbiAgLy8gSGFuZGxlIFJlY3QgdG9vbFxuICBoYW5kbGVTdGFydFJlY3QoKSB7XG4gICAgY29uc3QgZWxlbWVudCA9IHRoaXMuX2dlbmVyYXRlTmV3RWxlbWVudChFbGVtZW50VHlwZUVudW0uUkVDVCk7XG4gICAgbGV0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG4gICAgaWYgKHRoaXMuc25hcFRvR3JpZCkge1xuICAgICAgeCA9IHRoaXMuX3NuYXBUb0dyaWQoeCk7XG4gICAgICB5ID0gdGhpcy5fc25hcFRvR3JpZCh5KTtcbiAgICB9XG4gICAgZWxlbWVudC5vcHRpb25zLngxID0geDtcbiAgICBlbGVtZW50Lm9wdGlvbnMueTEgPSB5O1xuICAgIGVsZW1lbnQub3B0aW9ucy54MiA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLnkyID0geTtcbiAgICBlbGVtZW50Lm9wdGlvbnMud2lkdGggPSAxO1xuICAgIGVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSAxO1xuICAgIHRoaXMudGVtcEVsZW1lbnQgPSBlbGVtZW50O1xuICB9XG4gIGhhbmRsZURyYWdSZWN0KCkge1xuICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG4gICAgY29uc3Qgc3RhcnRfeCA9IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MSB8fCAwO1xuICAgIGNvbnN0IHN0YXJ0X3kgPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueTEgfHwgMDtcbiAgICBsZXQgdyA9IE1hdGguYWJzKHggLSBzdGFydF94KTtcbiAgICBsZXQgaCA9IE1hdGguYWJzKHkgLSBzdGFydF95KTtcbiAgICBsZXQgbmV3X3ggPSBudWxsO1xuICAgIGxldCBuZXdfeSA9IG51bGw7XG5cbiAgICBpZiAoZXZlbnQuc291cmNlRXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgIHcgPSBoID0gTWF0aC5tYXgodywgaCk7XG4gICAgICBuZXdfeCA9IHN0YXJ0X3ggPCB4ID8gc3RhcnRfeCA6IHN0YXJ0X3ggLSB3O1xuICAgICAgbmV3X3kgPSBzdGFydF95IDwgeSA/IHN0YXJ0X3kgOiBzdGFydF95IC0gaDtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV3X3ggPSBNYXRoLm1pbihzdGFydF94LCB4KTtcbiAgICAgIG5ld195ID0gTWF0aC5taW4oc3RhcnRfeSwgeSk7XG4gICAgfVxuICAgIGlmIChldmVudC5zb3VyY2VFdmVudC5hbHRLZXkpIHtcbiAgICAgIHcgKj0gMjtcbiAgICAgIGggKj0gMjtcbiAgICAgIG5ld194ID0gc3RhcnRfeCAtIHcgLyAyO1xuICAgICAgbmV3X3kgPSBzdGFydF95IC0gaCAvIDI7XG4gICAgfVxuICAgIGlmICh0aGlzLnNuYXBUb0dyaWQpIHtcbiAgICAgIHcgPSB0aGlzLl9zbmFwVG9HcmlkKHcpO1xuICAgICAgaCA9IHRoaXMuX3NuYXBUb0dyaWQoaCk7XG4gICAgICBuZXdfeCA9IHRoaXMuX3NuYXBUb0dyaWQobmV3X3gpO1xuICAgICAgbmV3X3kgPSB0aGlzLl9zbmFwVG9HcmlkKG5ld195KTtcbiAgICB9XG5cbiAgICB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMud2lkdGggPSB3O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBoO1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy54MiA9IG5ld194O1xuICAgIHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy55MiA9IG5ld195O1xuICB9XG4gIGhhbmRsZUVuZFJlY3QoKSB7XG4gICAgaWYgKHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy53aWR0aCAhPSAwIHx8IHRoaXMudGVtcEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgIT0gMCkge1xuICAgICAgdGhpcy5fcHVzaFRvRGF0YSh0aGlzLnRlbXBFbGVtZW50KTtcbiAgICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgICAgIHRoaXMudGVtcEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICAgIH1cbiAgfVxuICAvLyBIYW5kbGUgRWxsaXBzZSB0b29sXG4gIGhhbmRsZVN0YXJ0RWxsaXBzZSgpIHtcbiAgICBjb25zdCBlbGVtZW50ID0gdGhpcy5fZ2VuZXJhdGVOZXdFbGVtZW50KEVsZW1lbnRUeXBlRW51bS5FTExJUFNFKTtcbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuXG4gICAgLy8gd29ya2Fyb3VuZFxuICAgIGVsZW1lbnQub3B0aW9ucy54MSA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLnkxID0geTtcblxuICAgIGVsZW1lbnQub3B0aW9ucy5jeCA9IHg7XG4gICAgZWxlbWVudC5vcHRpb25zLmN5ID0geTtcbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gZWxlbWVudDtcbiAgfVxuICBoYW5kbGVEcmFnRWxsaXBzZSgpIHtcbiAgICBjb25zdCBbeCwgeV0gPSB0aGlzLl9jYWxjdWxhdGVYQW5kWShtb3VzZSh0aGlzLnNlbGVjdGlvbi5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkpO1xuICAgIGNvbnN0IHN0YXJ0X3ggPSB0aGlzLnRlbXBFbGVtZW50Lm9wdGlvbnMueDEgfHwgMDtcbiAgICBjb25zdCBzdGFydF95ID0gdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnkxIHx8IDA7XG4gICAgbGV0IGN4ID0gTWF0aC5hYnMoc3RhcnRfeCArICh4IC0gc3RhcnRfeCkgLyAyKTtcbiAgICBsZXQgY3kgPSBNYXRoLmFicyhzdGFydF95ICsgKHkgLSBzdGFydF95KSAvIDIpO1xuICAgIGxldCByeCA9IE1hdGguYWJzKHN0YXJ0X3ggLSBjeCk7XG4gICAgbGV0IHJ5ID0gTWF0aC5hYnMoc3RhcnRfeSAtIGN5KTtcblxuICAgIGlmIChldmVudC5zb3VyY2VFdmVudC5zaGlmdEtleSkge1xuICAgICAgcnkgPSByeDtcbiAgICAgIGN5ID0geSA+IHN0YXJ0X3kgPyBzdGFydF95ICsgcnggOiBzdGFydF95IC0gcng7XG4gICAgfVxuICAgIGlmIChldmVudC5zb3VyY2VFdmVudC5hbHRLZXkpIHtcbiAgICAgIGN4ID0gc3RhcnRfeDtcbiAgICAgIGN5ID0gc3RhcnRfeTtcbiAgICAgIHJ4ID0gTWF0aC5hYnMoeCAtIGN4KTtcbiAgICAgIHJ5ID0gZXZlbnQuc291cmNlRXZlbnQuc2hpZnRLZXkgPyByeCA6IE1hdGguYWJzKHkgLSBjeSk7XG4gICAgfVxuXG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnJ4ID0gcng7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnJ5ID0gcnk7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLmN4ID0gY3g7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLmN5ID0gY3k7XG4gIH1cbiAgaGFuZGxlRW5kRWxsaXBzZSgpIHtcbiAgICBpZiAodGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnJ4ICE9IDAgfHwgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnJ5ICE9IDApIHtcbiAgICAgIHRoaXMuX3B1c2hUb0RhdGEodGhpcy50ZW1wRWxlbWVudCk7XG4gICAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgICB0aGlzLnRlbXBFbGVtZW50ID0gbnVsbCBhcyBuZXZlcjtcbiAgICB9XG4gIH1cbiAgLy8gSGFuZGxlIFRleHQgdG9vbFxuICBoYW5kbGVUZXh0VG9vbCgpIHtcbiAgICBpZiAodGhpcy50ZW1wRWxlbWVudCkge1xuICAgICAgLy8gZmluaXNoIHRoZSBjdXJyZW50IG9uZSBpZiBuZWVkZWRcbiAgICAgIHRoaXMuZmluaXNoVGV4dElucHV0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9nZW5lcmF0ZU5ld0VsZW1lbnQoRWxlbWVudFR5cGVFbnVtLlRFWFQpO1xuICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG4gICAgZWxlbWVudC5vcHRpb25zLnRvcCA9IHk7XG4gICAgZWxlbWVudC5vcHRpb25zLmxlZnQgPSB4O1xuICAgIGVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aCA9IDA7XG4gICAgdGhpcy50ZW1wRWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnRleHRJbnB1dC5uYXRpdmVFbGVtZW50LmZvY3VzKCk7XG4gICAgfSwgMCk7XG4gIH1cbiAgaGFuZGxlVGV4dERyYWcoKSB7XG4gICAgaWYgKCF0aGlzLnRlbXBFbGVtZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IFt4LCB5XSA9IHRoaXMuX2NhbGN1bGF0ZVhBbmRZKG1vdXNlKHRoaXMuc2VsZWN0aW9uLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50KSk7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLnRvcCA9IHk7XG4gICAgdGhpcy50ZW1wRWxlbWVudC5vcHRpb25zLmxlZnQgPSB4O1xuICB9XG4gIGhhbmRsZVRleHRFbmQoKSB7XG4gICAgaWYgKCF0aGlzLnRlbXBFbGVtZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3B1c2hUb1VuZG8oKTtcbiAgfVxuICAvLyBIYW5kbGUgU2VsZWN0IHRvb2xcbiAgaGFuZGxlU2VsZWN0VG9vbCgpIHtcbiAgICBjb25zdCBtb3VzZV90YXJnZXQgPSB0aGlzLl9nZXRNb3VzZVRhcmdldCgpO1xuICAgIGlmIChtb3VzZV90YXJnZXQpIHtcbiAgICAgIGlmIChtb3VzZV90YXJnZXQuaWQgPT09ICdzZWxlY3Rvckdyb3VwJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBpZCA9IG1vdXNlX3RhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtd2ItaWQnKTtcbiAgICAgIGNvbnN0IHNlbGVjdGVkRWxlbWVudCA9IHRoaXMuZGF0YS5maW5kKChlbCkgPT4gZWwuaWQgPT09IGlkKSBhcyBXaGl0ZWJvYXJkRWxlbWVudDtcbiAgICAgIHRoaXMuc2V0U2VsZWN0ZWRFbGVtZW50KHNlbGVjdGVkRWxlbWVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2xlYXJTZWxlY3RlZEVsZW1lbnQoKTtcbiAgICB9XG4gIH1cbiAgLy8gSGFuZGxlIEVyYXNlciB0b29sXG4gIGhhbmRsZUVyYXNlclRvb2woKSB7XG4gICAgY29uc3QgbW91c2VfdGFyZ2V0ID0gdGhpcy5fZ2V0TW91c2VUYXJnZXQoKTtcbiAgICBpZiAobW91c2VfdGFyZ2V0KSB7XG4gICAgICBjb25zdCBpZCA9IG1vdXNlX3RhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtd2ItaWQnKTtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLmRhdGEuZmluZCgoZWwpID0+IGVsLmlkID09PSBpZCkgYXMgV2hpdGVib2FyZEVsZW1lbnQ7XG4gICAgICBpZiAoZWxlbWVudCkge1xuICAgICAgICB0aGlzLmRhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKChlbCkgPT4gZWwuaWQgIT09IGlkKTtcbiAgICAgICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgICAgICB0aGlzLmRlbGV0ZUVsZW1lbnQuZW1pdChlbGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gY29udmVydCB0aGUgdmFsdWUgb2YgdGhpcy50ZXh0SW5wdXQubmF0aXZlRWxlbWVudCB0byBhbiBTVkcgdGV4dCBub2RlLCB1bmxlc3MgaXQncyBlbXB0eSxcbiAgLy8gYW5kIHRoZW4gZGlzbWlzcyB0aGlzLnRleHRJbnB1dC5uYXRpdmVFbGVtZW50XG4gIGZpbmlzaFRleHRJbnB1dCgpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMudGV4dElucHV0Lm5hdGl2ZUVsZW1lbnQudmFsdWU7XG4gICAgdGhpcy50ZW1wRWxlbWVudC52YWx1ZSA9IHZhbHVlO1xuICAgIGlmICh0aGlzLnRlbXBFbGVtZW50LnZhbHVlKSB7XG4gICAgICB0aGlzLl9wdXNoVG9EYXRhKHRoaXMudGVtcEVsZW1lbnQpO1xuICAgICAgdGhpcy5fcHVzaFRvVW5kbygpO1xuICAgIH1cbiAgICB0aGlzLnRlbXBFbGVtZW50ID0gbnVsbCBhcyBuZXZlcjtcbiAgfVxuICAvLyBIYW5kbGUgVGV4dCBJbnB1dFxuICB1cGRhdGVUZXh0SXRlbSh2YWx1ZTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMudGVtcEVsZW1lbnQgJiYgdGhpcy5zZWxlY3RlZFRvb2wgPT0gVG9vbHNFbnVtLlRFWFQpIHtcbiAgICAgIHRoaXMudGVtcEVsZW1lbnQudmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gIH1cbiAgc2V0U2VsZWN0ZWRFbGVtZW50KGVsZW1lbnQ6IFdoaXRlYm9hcmRFbGVtZW50KSB7XG4gICAgdGhpcy5zZWxlY3RlZFRvb2wgPSBUb29sc0VudW0uU0VMRUNUO1xuICAgIGNvbnN0IGN1cnJlbnRCQm94ID0gdGhpcy5fZ2V0RWxlbWVudEJib3goZWxlbWVudCk7XG4gICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMuc2VsZWN0RWxlbWVudC5lbWl0KGVsZW1lbnQpO1xuICAgIHRoaXMuX3Nob3dHcmlwcyhjdXJyZW50QkJveCk7XG4gIH1cbiAgY2xlYXJTZWxlY3RlZEVsZW1lbnQoKSB7XG4gICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQgPSBudWxsIGFzIG5ldmVyO1xuICAgIHRoaXMucnViYmVyQm94LmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgdGhpcy5zZWxlY3RFbGVtZW50LmVtaXQobnVsbCk7XG4gIH1cbiAgcHJpdmF0ZSBzYXZlU3ZnKG5hbWU6IHN0cmluZywgZm9ybWF0OiBmb3JtYXRUeXBlcykge1xuICAgIGNvbnN0IHN2Z0NhbnZhcyA9IHRoaXMuc2VsZWN0aW9uLnNlbGVjdCgnI3N2Z2NvbnRlbnQnKS5jbG9uZSh0cnVlKTtcbiAgICBzdmdDYW52YXMuc2VsZWN0KCcjc2VsZWN0b3JQYXJlbnRHcm91cCcpLnJlbW92ZSgpO1xuICAgIChzdmdDYW52YXMuc2VsZWN0KCcjY29udGVudEJhY2tncm91bmQnKS5ub2RlKCkgYXMgU1ZHU1ZHRWxlbWVudCkucmVtb3ZlQXR0cmlidXRlKCdvcGFjaXR5Jyk7XG4gICAgY29uc3Qgc3ZnID0gc3ZnQ2FudmFzLm5vZGUoKSBhcyBTVkdTVkdFbGVtZW50O1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3gnLCAnMCcpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3knLCAnMCcpO1xuXG4gICAgY29uc3Qgc3ZnU3RyaW5nID0gdGhpcy5zYXZlQXNTdmcoc3ZnIGFzIEVsZW1lbnQpO1xuICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICBjYXNlIEZvcm1hdFR5cGUuQmFzZTY0OlxuICAgICAgICB0aGlzLnN2Z1N0cmluZzJJbWFnZShzdmdTdHJpbmcsIHRoaXMuY2FudmFzV2lkdGgsIHRoaXMuY2FudmFzSGVpZ2h0LCBmb3JtYXQsIChpbWcpID0+IHtcbiAgICAgICAgICB0aGlzLnNhdmUuZW1pdChpbWcpO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEZvcm1hdFR5cGUuU3ZnOiB7XG4gICAgICAgIGNvbnN0IGltZ1NyYyA9ICdkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LCcgKyBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzdmdTdHJpbmcpKSk7XG4gICAgICAgIHRoaXMuZG93bmxvYWQoaW1nU3JjLCBuYW1lKTtcbiAgICAgICAgdGhpcy5zYXZlLmVtaXQoaW1nU3JjKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLnN2Z1N0cmluZzJJbWFnZShzdmdTdHJpbmcsIHRoaXMuY2FudmFzV2lkdGgsIHRoaXMuY2FudmFzSGVpZ2h0LCBmb3JtYXQsIChpbWcpID0+IHtcbiAgICAgICAgICB0aGlzLmRvd25sb2FkKGltZywgbmFtZSk7XG4gICAgICAgICAgdGhpcy5zYXZlLmVtaXQoaW1nKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBzdmdDYW52YXMucmVtb3ZlKCk7XG4gIH1cbiAgcHJpdmF0ZSBzdmdTdHJpbmcySW1hZ2UoXG4gICAgc3ZnU3RyaW5nOiBzdHJpbmcsXG4gICAgd2lkdGg6IG51bWJlcixcbiAgICBoZWlnaHQ6IG51bWJlcixcbiAgICBmb3JtYXQ6IHN0cmluZyxcbiAgICBjYWxsYmFjazogKGltZzogc3RyaW5nKSA9PiB2b2lkXG4gICkge1xuICAgIC8vIHNldCBkZWZhdWx0IGZvciBmb3JtYXQgcGFyYW1ldGVyXG4gICAgZm9ybWF0ID0gZm9ybWF0IHx8ICdwbmcnO1xuICAgIC8vIFNWRyBkYXRhIFVSTCBmcm9tIFNWRyBzdHJpbmdcbiAgICBjb25zdCBzdmdEYXRhID0gJ2RhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsJyArIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHN2Z1N0cmluZykpKTtcbiAgICAvLyBjcmVhdGUgY2FudmFzIGluIG1lbW9yeShub3QgaW4gRE9NKVxuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIC8vIGdldCBjYW52YXMgY29udGV4dCBmb3IgZHJhd2luZyBvbiBjYW52YXNcbiAgICBjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJykgYXMgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEO1xuICAgIC8vIHNldCBjYW52YXMgc2l6ZVxuICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgLy8gY3JlYXRlIGltYWdlIGluIG1lbW9yeShub3QgaW4gRE9NKVxuICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgLy8gbGF0ZXIgd2hlbiBpbWFnZSBsb2FkcyBydW4gdGhpc1xuICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgIC8vIGFzeW5jIChoYXBwZW5zIGxhdGVyKVxuICAgICAgLy8gY2xlYXIgY2FudmFzXG4gICAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgIC8vIGRyYXcgaW1hZ2Ugd2l0aCBTVkcgZGF0YSB0byBjYW52YXNcbiAgICAgIGNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCAwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgIC8vIHNuYXBzaG90IGNhbnZhcyBhcyBwbmdcbiAgICAgIGNvbnN0IHBuZ0RhdGEgPSBjYW52YXMudG9EYXRhVVJMKCdpbWFnZS8nICsgZm9ybWF0KTtcbiAgICAgIC8vIHBhc3MgcG5nIGRhdGEgVVJMIHRvIGNhbGxiYWNrXG4gICAgICBjYWxsYmFjayhwbmdEYXRhKTtcbiAgICB9OyAvLyBlbmQgYXN5bmNcbiAgICAvLyBzdGFydCBsb2FkaW5nIFNWRyBkYXRhIGludG8gaW4gbWVtb3J5IGltYWdlXG4gICAgaW1hZ2Uuc3JjID0gc3ZnRGF0YTtcbiAgfVxuICBwcml2YXRlIHNhdmVBc1N2ZyhzdmdOb2RlOiBFbGVtZW50KTogc3RyaW5nIHtcbiAgICBjb25zdCBzZXJpYWxpemVyID0gbmV3IFhNTFNlcmlhbGl6ZXIoKTtcbiAgICBsZXQgc3ZnU3RyaW5nID0gc2VyaWFsaXplci5zZXJpYWxpemVUb1N0cmluZyhzdmdOb2RlKTtcbiAgICBzdmdTdHJpbmcgPSBzdmdTdHJpbmcucmVwbGFjZSgvKFxcdyspPzo/eGxpbms9L2csICd4bWxuczp4bGluaz0nKTsgLy8gRml4IHJvb3QgeGxpbmsgd2l0aG91dCBuYW1lc3BhY2VcbiAgICBzdmdTdHJpbmcgPSBzdmdTdHJpbmcucmVwbGFjZSgvTlNcXGQrOmhyZWYvZywgJ3hsaW5rOmhyZWYnKTtcbiAgICByZXR1cm4gc3ZnU3RyaW5nO1xuICB9XG4gIHByaXZhdGUgZG93bmxvYWQodXJsOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgbGluay5ocmVmID0gdXJsO1xuICAgIGxpbmsuc2V0QXR0cmlidXRlKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgIGxpbmsuZG93bmxvYWQgPSBuYW1lIHx8ICduZXcgd2hpdGUtYm9hcmQnO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgbGluay5jbGljaygpO1xuICB9XG4gIHByaXZhdGUgX3B1c2hUb0RhdGEoZWxlbWVudDogV2hpdGVib2FyZEVsZW1lbnQpIHtcbiAgICB0aGlzLmRhdGEucHVzaChlbGVtZW50KTtcbiAgICB0aGlzLl9kYXRhLm5leHQodGhpcy5kYXRhKTtcbiAgfVxuICBwcml2YXRlIF9jbGVhclN2ZygpIHtcbiAgICB0aGlzLmRhdGEgPSBbXTtcbiAgICB0aGlzLl9kYXRhLm5leHQodGhpcy5kYXRhKTtcbiAgICB0aGlzLl9wdXNoVG9VbmRvKCk7XG4gICAgdGhpcy5jbGVhci5lbWl0KCk7XG4gIH1cbiAgcHJpdmF0ZSB1bmRvRHJhdygpIHtcbiAgICBpZiAoIXRoaXMudW5kb1N0YWNrLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjdXJyZW50U3RhdGUgPSB0aGlzLnVuZG9TdGFjay5wb3AoKTtcbiAgICB0aGlzLnJlZG9TdGFjay5wdXNoKGN1cnJlbnRTdGF0ZSBhcyBXaGl0ZWJvYXJkRWxlbWVudFtdKTtcbiAgICBpZih0aGlzLnVuZG9TdGFjay5sZW5ndGgpe1xuICAgICAgdGhpcy5kYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnVuZG9TdGFja1t0aGlzLnVuZG9TdGFjay5sZW5ndGgtMV0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLl9pbml0aWFsRGF0YSkpIHx8IFtdO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZUxvY2FsU3RvcmFnZSgpO1xuICAgIHRoaXMudW5kby5lbWl0KCk7XG4gIH1cbiAgcHJpdmF0ZSByZWRvRHJhdygpIHtcbiAgICBpZiAoIXRoaXMucmVkb1N0YWNrLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjdXJyZW50U3RhdGUgPSB0aGlzLnJlZG9TdGFjay5wb3AoKTtcbiAgICB0aGlzLnVuZG9TdGFjay5wdXNoKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3VycmVudFN0YXRlKSkgYXMgV2hpdGVib2FyZEVsZW1lbnRbXSk7XG4gICAgdGhpcy5kYXRhID0gY3VycmVudFN0YXRlIHx8IFtdO1xuICAgIHRoaXMudXBkYXRlTG9jYWxTdG9yYWdlKCk7XG4gICAgdGhpcy5yZWRvLmVtaXQoKTtcbiAgfVxuICBwcml2YXRlIF9wdXNoVG9VbmRvKCkge1xuICAgIHRoaXMudW5kb1N0YWNrLnB1c2goSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLmRhdGEpKSk7XG4gICAgdGhpcy51cGRhdGVMb2NhbFN0b3JhZ2UoKTtcbiAgfVxuICBwcml2YXRlIF9yZXNldCgpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnRE8gUkVTRVQgTk9XJywgdGhpcy5faW5pdGlhbERhdGEpO1xuICAgIHRoaXMudW5kb1N0YWNrID0gW107XG4gICAgdGhpcy5yZWRvU3RhY2sgPSBbXTtcbiAgICAvLyB0cnkge1xuICAgIC8vICAgdGhpcy5kYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLl9pbml0aWFsRGF0YSkpO1xuICAgIC8vIH0gY2F0Y2goZSkge1xuICAgICAgdGhpcy5kYXRhID0gW107XG4gICAgLy8gfVxuICAgIHRoaXMudXBkYXRlTG9jYWxTdG9yYWdlKCk7XG4gIH1cbiAgcHJpdmF0ZSB1cGRhdGVMb2NhbFN0b3JhZ2UoKTogdm9pZCB7XG4gICAgY29uc3Qgc3RvcmFnZU9iamVjdCA9IHtkYXRhOiB0aGlzLmRhdGEsIHVuZG9TdGFjazogdGhpcy51bmRvU3RhY2ssIHJlZG9TdGFjazogdGhpcy5yZWRvU3RhY2t9O1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGB3aGl0ZWJvYXJkXyR7dGhpcy5wZXJzaXN0ZW5jZUlkfWAsIEpTT04uc3RyaW5naWZ5KHN0b3JhZ2VPYmplY3QpKTtcbiAgfVxuICBwcml2YXRlIF9nZW5lcmF0ZU5ld0VsZW1lbnQobmFtZTogRWxlbWVudFR5cGVFbnVtKTogV2hpdGVib2FyZEVsZW1lbnQge1xuICAgIGNvbnN0IGVsZW1lbnQgPSBuZXcgV2hpdGVib2FyZEVsZW1lbnQobmFtZSwge1xuICAgICAgc3Ryb2tlV2lkdGg6IHRoaXMuc3Ryb2tlV2lkdGgsXG4gICAgICBzdHJva2VDb2xvcjogdGhpcy5zdHJva2VDb2xvcixcbiAgICAgIGZpbGw6IHRoaXMuZmlsbCxcbiAgICAgIGxpbmVKb2luOiB0aGlzLmxpbmVKb2luLFxuICAgICAgbGluZUNhcDogdGhpcy5saW5lQ2FwLFxuICAgICAgZm9udFNpemU6IHRoaXMuZm9udFNpemUsXG4gICAgICBmb250RmFtaWx5OiB0aGlzLmZvbnRGYW1pbHksXG4gICAgICBkYXNoYXJyYXk6IHRoaXMuZGFzaGFycmF5LFxuICAgICAgZGFzaG9mZnNldDogdGhpcy5kYXNob2Zmc2V0LFxuICAgIH0pO1xuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG4gIHByaXZhdGUgX2NhbGN1bGF0ZVhBbmRZKFt4LCB5XTogW251bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlcl0ge1xuICAgIHJldHVybiBbKHggLSB0aGlzLngpIC8gdGhpcy56b29tLCAoeSAtIHRoaXMueSkgLyB0aGlzLnpvb21dO1xuICB9XG4gIHByaXZhdGUgcmVzaXplU2NyZWVuKCkge1xuICAgIGNvbnN0IHN2Z0NvbnRhaW5lciA9IHRoaXMuc3ZnQ29udGFpbmVyLm5hdGl2ZUVsZW1lbnQ7XG4gICAgaWYgKHRoaXMuZnVsbFNjcmVlbikge1xuICAgICAgdGhpcy5jYW52YXNXaWR0aCA9IHN2Z0NvbnRhaW5lci5jbGllbnRXaWR0aDtcbiAgICAgIHRoaXMuY2FudmFzSGVpZ2h0ID0gc3ZnQ29udGFpbmVyLmNsaWVudEhlaWdodDtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2VudGVyKSB7XG4gICAgICB0aGlzLnggPSBzdmdDb250YWluZXIuY2xpZW50V2lkdGggLyAyIC0gdGhpcy5jYW52YXNXaWR0aCAvIDI7XG4gICAgICB0aGlzLnkgPSBzdmdDb250YWluZXIuY2xpZW50SGVpZ2h0IC8gMiAtIHRoaXMuY2FudmFzSGVpZ2h0IC8gMjtcbiAgICB9XG4gIH1cbiAgcHJpdmF0ZSBfc25hcFRvQW5nbGUoeDE6IG51bWJlciwgeTE6IG51bWJlciwgeDI6IG51bWJlciwgeTI6IG51bWJlcikge1xuICAgIGNvbnN0IHNuYXAgPSBNYXRoLlBJIC8gNDsgLy8gNDUgZGVncmVlc1xuICAgIGNvbnN0IGR4ID0geDIgLSB4MTtcbiAgICBjb25zdCBkeSA9IHkyIC0geTE7XG4gICAgY29uc3QgYW5nbGUgPSBNYXRoLmF0YW4yKGR5LCBkeCk7XG4gICAgY29uc3QgZGlzdCA9IE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG4gICAgY29uc3Qgc25hcGFuZ2xlID0gTWF0aC5yb3VuZChhbmdsZSAvIHNuYXApICogc25hcDtcbiAgICBjb25zdCB4ID0geDEgKyBkaXN0ICogTWF0aC5jb3Moc25hcGFuZ2xlKTtcbiAgICBjb25zdCB5ID0geTEgKyBkaXN0ICogTWF0aC5zaW4oc25hcGFuZ2xlKTtcbiAgICByZXR1cm4geyB4OiB4LCB5OiB5LCBhOiBzbmFwYW5nbGUgfTtcbiAgfVxuICBwcml2YXRlIF9zbmFwVG9HcmlkKG46IG51bWJlcikge1xuICAgIGNvbnN0IHNuYXAgPSB0aGlzLmdyaWRTaXplO1xuICAgIGNvbnN0IG4xID0gTWF0aC5yb3VuZChuIC8gc25hcCkgKiBzbmFwO1xuICAgIHJldHVybiBuMTtcbiAgfVxuICBwcml2YXRlIF9nZXRFbGVtZW50QmJveChlbGVtZW50OiBXaGl0ZWJvYXJkRWxlbWVudCk6IERPTVJlY3Qge1xuICAgIGNvbnN0IGVsID0gdGhpcy5zZWxlY3Rpb24uc2VsZWN0KGAjaXRlbV8ke2VsZW1lbnQuaWR9YCkubm9kZSgpIGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICBjb25zdCBiYm94ID0gZWwuZ2V0QkJveCgpO1xuICAgIHJldHVybiBiYm94O1xuICB9XG4gIHByaXZhdGUgX2dldE1vdXNlVGFyZ2V0KCk6IFNWR0dyYXBoaWNzRWxlbWVudCB8IG51bGwge1xuICAgIGNvbnN0IGV2dDogRXZlbnQgPSBldmVudC5zb3VyY2VFdmVudDtcbiAgICBpZiAoZXZ0ID09IG51bGwgfHwgZXZ0LnRhcmdldCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgbGV0IG1vdXNlX3RhcmdldCA9IGV2dC50YXJnZXQgYXMgU1ZHR3JhcGhpY3NFbGVtZW50O1xuICAgIGlmIChtb3VzZV90YXJnZXQuaWQgPT09ICdzdmdyb290Jykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChtb3VzZV90YXJnZXQucGFyZW50Tm9kZSkge1xuICAgICAgbW91c2VfdGFyZ2V0ID0gbW91c2VfdGFyZ2V0LnBhcmVudE5vZGUucGFyZW50Tm9kZSBhcyBTVkdHcmFwaGljc0VsZW1lbnQ7XG4gICAgICBpZiAobW91c2VfdGFyZ2V0LmlkID09PSAnc2VsZWN0b3JHcm91cCcpIHtcbiAgICAgICAgcmV0dXJuIG1vdXNlX3RhcmdldDtcbiAgICAgIH1cbiAgICAgIHdoaWxlICghbW91c2VfdGFyZ2V0LmlkLmluY2x1ZGVzKCdpdGVtXycpKSB7XG4gICAgICAgIGlmIChtb3VzZV90YXJnZXQuaWQgPT09ICdzdmdyb290Jykge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIG1vdXNlX3RhcmdldCA9IG1vdXNlX3RhcmdldC5wYXJlbnROb2RlIGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1vdXNlX3RhcmdldDtcbiAgfVxuICBwcml2YXRlIF9zaG93R3JpcHMoYmJveDogRE9NUmVjdCkge1xuICAgIHRoaXMucnViYmVyQm94ID0ge1xuICAgICAgeDogYmJveC54IC0gKCh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoIGFzIG51bWJlcikgfHwgMCkgKiAwLjUsXG4gICAgICB5OiBiYm94LnkgLSAoKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggYXMgbnVtYmVyKSB8fCAwKSAqIDAuNSxcbiAgICAgIHdpZHRoOiBiYm94LndpZHRoICsgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGggYXMgbnVtYmVyKSB8fCAwLFxuICAgICAgaGVpZ2h0OiBiYm94LmhlaWdodCArICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoIGFzIG51bWJlcikgfHwgMCxcbiAgICAgIGRpc3BsYXk6ICdibG9jaycsXG4gICAgfTtcbiAgfVxuICBtb3ZlU2VsZWN0KGRvd25FdmVudDogUG9pbnRlckV2ZW50KSB7XG4gICAgbGV0IGlzUG9pbnRlckRvd24gPSB0cnVlO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBkb3duRXZlbnQudGFyZ2V0IGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgKG1vdmVFdmVudCkgPT4ge1xuICAgICAgaWYgKCFpc1BvaW50ZXJEb3duKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5zZWxlY3RlZEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSAobW92ZUV2ZW50IGFzIFBvaW50ZXJFdmVudCkubW92ZW1lbnRYO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IChtb3ZlRXZlbnQgYXMgUG9pbnRlckV2ZW50KS5tb3ZlbWVudFk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCAoKSA9PiB7XG4gICAgICBpc1BvaW50ZXJEb3duID0gZmFsc2U7XG4gICAgfSk7XG4gIH1cbiAgcmVzaXplU2VsZWN0KGRvd25FdmVudDogUG9pbnRlckV2ZW50KSB7XG4gICAgbGV0IGlzUG9pbnRlckRvd24gPSB0cnVlO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBkb3duRXZlbnQudGFyZ2V0IGFzIFNWR0dyYXBoaWNzRWxlbWVudDtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIChtb3ZlRXZlbnQpID0+IHtcbiAgICAgIGlmICghaXNQb2ludGVyRG93bikgcmV0dXJuO1xuICAgICAgY29uc3QgZ3JpcCA9IGVsZW1lbnQuaWQuc3BsaXQoJ18nKVsyXTtcbiAgICAgIGNvbnN0IHggPSAobW92ZUV2ZW50IGFzIFBvaW50ZXJFdmVudCkubW92ZW1lbnRYO1xuICAgICAgY29uc3QgeSA9IChtb3ZlRXZlbnQgYXMgUG9pbnRlckV2ZW50KS5tb3ZlbWVudFk7XG4gICAgICBjb25zdCBiYm94ID0gdGhpcy5fZ2V0RWxlbWVudEJib3godGhpcy5zZWxlY3RlZEVsZW1lbnQpO1xuICAgICAgY29uc3Qgd2lkdGggPSBiYm94LndpZHRoO1xuICAgICAgY29uc3QgaGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICBzd2l0Y2ggKHRoaXMuc2VsZWN0ZWRFbGVtZW50LnR5cGUpIHtcbiAgICAgICAgY2FzZSBFbGVtZW50VHlwZUVudW0uRUxMSVBTRTpcbiAgICAgICAgICB0aGlzLl9yZXNpemVFbGlwc2UoZ3JpcCwgeyB4LCB5LCB3aWR0aCwgaGVpZ2h0IH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEVsZW1lbnRUeXBlRW51bS5MSU5FOlxuICAgICAgICAgIHRoaXMuX3Jlc2l6ZUxpbmUoZ3JpcCwgeyB4LCB5LCB3aWR0aCwgaGVpZ2h0IH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRoaXMuX3Jlc2l6ZURlZmF1bHQoZ3JpcCwgeyB4LCB5LCB3aWR0aCwgaGVpZ2h0IH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdGhpcy5fc2hvd0dyaXBzKHRoaXMuX2dldEVsZW1lbnRCYm94KHRoaXMuc2VsZWN0ZWRFbGVtZW50KSk7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgKCkgPT4ge1xuICAgICAgaXNQb2ludGVyRG93biA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG4gIHByaXZhdGUgX3Jlc2l6ZUxpbmUoZGlyOiBzdHJpbmcsIGJib3g6IEJCb3gpIHtcbiAgICBzd2l0Y2ggKGRpcikge1xuICAgICAgY2FzZSAnbncnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MSBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTEgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbic6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkxIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ25lJzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueDIgYXMgbnVtYmVyKSArPSBiYm94Lng7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnkxIGFzIG51bWJlcikgKz0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2UnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MiBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzZSc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLngyIGFzIG51bWJlcikgKz0gYmJveC54O1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy55MiBhcyBudW1iZXIpICs9IGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzJzpcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTIgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3cnOlxuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy54MSBhcyBudW1iZXIpICs9IGJib3gueDtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMueTIgYXMgbnVtYmVyKSArPSBiYm94Lnk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndyc6XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLngxIGFzIG51bWJlcikgKz0gYmJveC54O1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcHJpdmF0ZSBfcmVzaXplRWxpcHNlKGRpcjogc3RyaW5nLCBiYm94OiBCQm94KSB7XG4gICAgc3dpdGNoIChkaXIpIHtcbiAgICAgIGNhc2UgJ253JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgLT0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSAtPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ24nOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgLT0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54IC8gMjtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94LnkgLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpICs9IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ5IGFzIG51bWJlcikgLT0gYmJveC55IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdlJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeCBhcyBudW1iZXIpICs9IGJib3gueCAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc2UnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueCAvIDI7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnggYXMgbnVtYmVyKSArPSBiYm94LnggLyAyO1xuICAgICAgICAodGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5yeSBhcyBudW1iZXIpICs9IGJib3gueSAvIDI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSArPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3N3JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94LnggLyAyO1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueSAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgLT0gYmJveC54IC8gMjtcbiAgICAgICAgKHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMucnkgYXMgbnVtYmVyKSArPSBiYm94LnkgLyAyO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3cnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueCAvIDI7XG4gICAgICAgICh0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLnJ4IGFzIG51bWJlcikgLT0gYmJveC54IC8gMjtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgX3Jlc2l6ZURlZmF1bHQoZGlyOiBzdHJpbmcsIGJib3g6IEJCb3gpIHtcbiAgICBzd2l0Y2ggKGRpcikge1xuICAgICAgY2FzZSAnbncnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC54ICs9IGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueSArPSBiYm94Lnk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMud2lkdGggPSBiYm94LndpZHRoIC0gYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLmhlaWdodCA9IGJib3guaGVpZ2h0IC0gYmJveC55O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ24nOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC55ICs9IGJib3gueTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCAtIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICduZSc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnkgKz0gYmJveC55O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCArIGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCAtIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdlJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy53aWR0aCA9IGJib3gud2lkdGggKyBiYm94Lng7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc2UnOlxuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCArIGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCArIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzJzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCArIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdyc6XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50LnggKz0gYmJveC54O1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudC5vcHRpb25zLndpZHRoID0gYmJveC53aWR0aCAtIGJib3gueDtcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQub3B0aW9ucy5oZWlnaHQgPSBiYm94LmhlaWdodCArIGJib3gueTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd3JzpcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnQueCArPSBiYm94Lng7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50Lm9wdGlvbnMud2lkdGggPSBiYm94LndpZHRoIC0gYmJveC54O1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF91bnN1YnNjcmliZShzdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbik6IHZvaWQge1xuICAgIGlmIChzdWJzY3JpcHRpb24pIHtcbiAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgfVxufVxuIiwiPHN2ZyBbY2xhc3NdPVwiJ3N2Z3Jvb3QgJyArIHNlbGVjdGVkVG9vbFwiICNzdmdDb250YWluZXIgaWQ9XCJzdmdyb290XCIgeGxpbmtucz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIj5cbiAgPHN2ZyBpZD1cImNhbnZhc0JhY2tncm91bmRcIiBbYXR0ci53aWR0aF09XCJjYW52YXNXaWR0aCAqIHpvb21cIiBbYXR0ci5oZWlnaHRdPVwiY2FudmFzSGVpZ2h0ICogem9vbVwiIFthdHRyLnhdPVwieFwiXG4gICAgW2F0dHIueV09XCJ5XCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogbm9uZTtcIj5cbiAgICA8ZGVmcyBpZD1cImdyaWQtcGF0dGVyblwiPlxuICAgICAgPHBhdHRlcm4gaWQ9XCJzbWFsbEdyaWRcIiBbYXR0ci53aWR0aF09XCJncmlkU2l6ZVwiIFthdHRyLmhlaWdodF09XCJncmlkU2l6ZVwiIHBhdHRlcm5Vbml0cz1cInVzZXJTcGFjZU9uVXNlXCI+XG4gICAgICAgIDxwYXRoIFthdHRyLmRdPVwiJ00gJytncmlkU2l6ZSsnIDAgSCAwIFYgJytncmlkU2l6ZSsnJ1wiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiZ3JheVwiIHN0cm9rZS13aWR0aD1cIjAuNVwiIC8+XG4gICAgICA8L3BhdHRlcm4+XG4gICAgICA8cGF0dGVybiBpZD1cImdyaWRcIiB3aWR0aD1cIjEwMFwiIGhlaWdodD1cIjEwMFwiIHBhdHRlcm5Vbml0cz1cInVzZXJTcGFjZU9uVXNlXCI+XG4gICAgICAgIDxyZWN0IHdpZHRoPVwiMTAwXCIgaGVpZ2h0PVwiMTAwXCIgZmlsbD1cInVybCgjc21hbGxHcmlkKVwiIC8+XG4gICAgICAgIDxwYXRoIGQ9XCJNIDEwMCAwIEggMCBWIDEwMFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiZ3JheVwiIHN0cm9rZS13aWR0aD1cIjJcIiAvPlxuICAgICAgPC9wYXR0ZXJuPlxuICAgIDwvZGVmcz5cbiAgICA8ZGVmcyBpZD1cInBsYWNlaG9sZGVyX2RlZnNcIj48L2RlZnM+XG4gICAgPHJlY3Qgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiIHg9XCIwXCIgeT1cIjBcIiBzdHJva2Utd2lkdGg9XCIwXCIgc3Ryb2tlPVwidHJhbnNwYXJlbnRcIiBbYXR0ci5maWxsXT1cImJhY2tncm91bmRDb2xvclwiXG4gICAgICBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBub25lO1wiPjwvcmVjdD5cbiAgICA8ZyAqbmdJZj1cImVuYWJsZUdyaWRcIj5cbiAgICAgIDxyZWN0IHg9XCItMTAwXCIgeT1cIi0xMDBcIiBbYXR0ci53aWR0aF09XCIoY2FudmFzV2lkdGggKiB6b29tKSArIDEwMCoyXCIgW2F0dHIuaGVpZ2h0XT1cIihjYW52YXNIZWlnaHQgKiB6b29tKSArIDEwMCoyXCJcbiAgICAgICAgZmlsbD1cInVybCgjZ3JpZClcIiAvPlxuICAgIDwvZz5cbiAgPC9zdmc+XG4gIDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIFthdHRyLndpZHRoXT1cImNhbnZhc1dpZHRoICogem9vbVwiIFthdHRyLmhlaWdodF09XCJjYW52YXNIZWlnaHQgKiB6b29tXCJcbiAgICBbYXR0ci52aWV3Qm94XT1cIlswLCAwLCBjYW52YXNXaWR0aCwgY2FudmFzSGVpZ2h0XVwiIGlkPVwic3ZnY29udGVudFwiIFthdHRyLnhdPVwieFwiIFthdHRyLnldPVwieVwiPlxuICAgIDxyZWN0IGlkPVwiY29udGVudEJhY2tncm91bmRcIiBvcGFjaXR5PVwiMFwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB4PVwiMFwiIHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiXG4gICAgICBzdHJva2U9XCJ0cmFuc3BhcmVudFwiIFthdHRyLmZpbGxdPVwiYmFja2dyb3VuZENvbG9yXCI+PC9yZWN0PlxuICAgIDxnIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGFsbDtcIj5cbiAgICAgIDx0aXRsZSBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBpbmhlcml0O1wiPldoaXRlYm9hcmQ8L3RpdGxlPlxuICAgICAgPG5nLWNvbnRhaW5lciAqbmdGb3I9XCJsZXQgaXRlbSBvZiBkYXRhXCI+XG4gICAgICAgIDxnIGNsYXNzPVwid2JfZWxlbWVudFwiIFtpZF09XCInaXRlbV8nICsgaXRlbS5pZFwiIFthdHRyLmRhdGEtd2ItaWRdPVwiaXRlbS5pZFwiIFtuZ1N3aXRjaF09XCJpdGVtLnR5cGVcIlxuICAgICAgICAgIFthdHRyLnRyYW5zZm9ybV09XCIndHJhbnNsYXRlKCcgKyBpdGVtLnggKyAnLCcgKyBpdGVtLnkgKyAnKScgKyAncm90YXRlKCcgKyBpdGVtLnJvdGF0aW9uICsgJyknXCJcbiAgICAgICAgICBbYXR0ci5vcGFjaXR5XT1cIml0ZW0ub3BhY2l0eSAvIDEwMFwiPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5CUlVTSFwiPlxuICAgICAgICAgICAgPHBhdGggY2xhc3M9XCJicnVzaFwiIGZpbGw9XCJub25lXCIgW2F0dHIuZF09XCJpdGVtLnZhbHVlXCIgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJpdGVtLm9wdGlvbnMubGluZUNhcFwiIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJpdGVtLm9wdGlvbnMubGluZUpvaW5cIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCI+PC9wYXRoPlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuSU1BR0VcIj5cbiAgICAgICAgICAgIDxpbWFnZSBbYXR0ci5oZWlnaHRdPVwiaXRlbS5vcHRpb25zLmhlaWdodFwiIFthdHRyLndpZHRoXT1cIml0ZW0ub3B0aW9ucy53aWR0aFwiIHByZXNlcnZlQXNwZWN0UmF0aW89XCJub25lXCJcbiAgICAgICAgICAgICAgW2F0dHIueGxpbms6aHJlZl09XCJpdGVtLnZhbHVlXCIgW2F0dHIuaHJlZl09XCJpdGVtLnZhbHVlXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwiaXRlbS5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLmZpbGxdPVwiaXRlbS5vcHRpb25zLmZpbGxcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIj48L2ltYWdlPlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuTElORVwiPlxuICAgICAgICAgICAgPGxpbmUgY2xhc3M9XCJsaW5lXCIgW2F0dHIueDFdPVwiaXRlbS5vcHRpb25zLngxXCIgW2F0dHIueTFdPVwiaXRlbS5vcHRpb25zLnkxXCIgW2F0dHIueDJdPVwiaXRlbS5vcHRpb25zLngyXCJcbiAgICAgICAgICAgICAgW2F0dHIueTJdPVwiaXRlbS5vcHRpb25zLnkyXCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VXaWR0aFwiIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cIml0ZW0ub3B0aW9ucy5saW5lQ2FwXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cIml0ZW0ub3B0aW9ucy5saW5lSm9pblwiIFthdHRyLnN0cm9rZV09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L2xpbmU+XG4gICAgICAgICAgPC9nPlxuICAgICAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5SRUNUXCI+XG4gICAgICAgICAgICA8cmVjdCBjbGFzcz1cInJlY3RcIiBbYXR0ci54XT1cIml0ZW0ub3B0aW9ucy54MlwiIFthdHRyLnldPVwiaXRlbS5vcHRpb25zLnkyXCIgW2F0dHIucnhdPVwiaXRlbS5vcHRpb25zLnJ4XCJcbiAgICAgICAgICAgICAgW2F0dHIud2lkdGhdPVwiaXRlbS5vcHRpb25zLndpZHRoXCIgW2F0dHIuaGVpZ2h0XT1cIml0ZW0ub3B0aW9ucy5oZWlnaHRcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIiBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCJpdGVtLm9wdGlvbnMuZGFzaG9mZnNldFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5maWxsXT1cIml0ZW0ub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VDb2xvclwiPjwvcmVjdD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLkVMTElQU0VcIj5cbiAgICAgICAgICAgIDxlbGxpcHNlIFthdHRyLmN4XT1cIml0ZW0ub3B0aW9ucy5jeFwiIFthdHRyLmN5XT1cIml0ZW0ub3B0aW9ucy5jeVwiIFthdHRyLnJ4XT1cIml0ZW0ub3B0aW9ucy5yeFwiXG4gICAgICAgICAgICAgIFthdHRyLnJ5XT1cIml0ZW0ub3B0aW9ucy5yeVwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCJcbiAgICAgICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJpdGVtLm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS13aWR0aF09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJpdGVtLm9wdGlvbnMubGluZUNhcFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJpdGVtLm9wdGlvbnMubGluZUpvaW5cIiBbYXR0ci5zdHJva2VdPVwiaXRlbS5vcHRpb25zLnN0cm9rZUNvbG9yXCJcbiAgICAgICAgICAgICAgW2F0dHIuZmlsbF09XCJpdGVtLm9wdGlvbnMuZmlsbFwiPjwvZWxsaXBzZT5cbiAgICAgICAgICA8L2c+XG4gICAgICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLlRFWFRcIj5cbiAgICAgICAgICAgIDx0ZXh0IGNsYXNzPVwidGV4dF9lbGVtZW50XCIgdGV4dC1hbmNob3I9XCJzdGFydFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCIgW2F0dHIueF09XCJpdGVtLm9wdGlvbnMubGVmdFwiXG4gICAgICAgICAgICAgIFthdHRyLnldPVwiaXRlbS5vcHRpb25zLnRvcFwiIFthdHRyLndpZHRoXT1cIml0ZW0ub3B0aW9ucy53aWR0aFwiIFthdHRyLmhlaWdodF09XCJpdGVtLm9wdGlvbnMuaGVpZ2h0XCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogaW5oZXJpdDtcIiBbYXR0ci5mb250LXNpemVdPVwiaXRlbS5vcHRpb25zLmZvbnRTaXplXCJcbiAgICAgICAgICAgICAgW2F0dHIuZm9udC1mYW1pbHldPVwiaXRlbS5vcHRpb25zLmZvbnRGYW1pbHlcIiBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cIml0ZW0ub3B0aW9ucy5kYXNoYXJyYXlcIlxuICAgICAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaG9mZnNldF09XCIxXCIgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cIml0ZW0ub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lY2FwXT1cIml0ZW0ub3B0aW9ucy5saW5lQ2FwXCIgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cIml0ZW0ub3B0aW9ucy5saW5lSm9pblwiXG4gICAgICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJpdGVtLm9wdGlvbnMuc3Ryb2tlQ29sb3JcIiBbYXR0ci5maWxsXT1cIml0ZW0ub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICAgICAgW2F0dHIuZm9udC1zdHlsZV09XCJpdGVtLm9wdGlvbnMuZm9udFN0eWxlXCIgW2F0dHIuZm9udC13ZWlnaHRdPVwiaXRlbS5vcHRpb25zLmZvbnRXZWlnaHRcIj5cbiAgICAgICAgICAgICAge3sgaXRlbS52YWx1ZSB9fVxuICAgICAgICAgICAgPC90ZXh0PlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyAqbmdTd2l0Y2hEZWZhdWx0PlxuICAgICAgICAgICAgPHRleHQ+Tm90IGRlZmluZWQgdHlwZTwvdGV4dD5cbiAgICAgICAgICA8L2c+XG4gICAgICAgIDwvZz5cbiAgICAgIDwvbmctY29udGFpbmVyPlxuICAgICAgPGcgY2xhc3M9XCJ0ZW1wLWVsZW1lbnRcIiAqbmdJZj1cInRlbXBFbGVtZW50XCIgIFtuZ1N3aXRjaF09XCJzZWxlY3RlZFRvb2xcIj5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0b29scy5CUlVTSFwiPlxuICAgICAgICA8cGF0aCBjbGFzcz1cImJydXNoXCIgZmlsbD1cIm5vbmVcIiBbYXR0ci5kXT1cInRlbXBFbGVtZW50LnZhbHVlXCIgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiIFthdHRyLnN0cm9rZS13aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZVdpZHRoXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVDYXBcIiBbYXR0ci5zdHJva2UtbGluZWpvaW5dPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lSm9pblwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L3BhdGg+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuSU1BR0VcIj5cbiAgICAgICAgPGltYWdlIFthdHRyLmhlaWdodF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmhlaWdodFwiIFthdHRyLndpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMud2lkdGhcIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPVwibm9uZVwiXG4gICAgICAgICAgW2F0dHIueGxpbms6aHJlZl09XCJ0ZW1wRWxlbWVudC52YWx1ZVwiIFthdHRyLmhyZWZdPVwidGVtcEVsZW1lbnQudmFsdWVcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWRhc2hhcnJheV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmRhc2hhcnJheVwiIFthdHRyLmZpbGxdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2VdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VDb2xvclwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCI+PC9pbWFnZT5cbiAgICAgIDwvZz5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5MSU5FXCI+XG4gICAgICAgIDxsaW5lIGNsYXNzPVwibGluZVwiIFthdHRyLngxXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueDFcIiBbYXR0ci55MV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnkxXCIgW2F0dHIueDJdPVwidGVtcEVsZW1lbnQub3B0aW9ucy54MlwiXG4gICAgICAgICAgW2F0dHIueTJdPVwidGVtcEVsZW1lbnQub3B0aW9ucy55MlwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVDYXBcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVKb2luXCIgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIj48L2xpbmU+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hDYXNlPVwidHlwZXMuUkVDVFwiPlxuICAgICAgICA8cmVjdCBjbGFzcz1cInJlY3RcIiBbYXR0ci54XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueDJcIiBbYXR0ci55XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMueTJcIiBbYXR0ci5yeF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnJ4XCJcbiAgICAgICAgICBbYXR0ci53aWR0aF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLndpZHRoXCIgW2F0dHIuaGVpZ2h0XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuaGVpZ2h0XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNob2Zmc2V0XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiIFthdHRyLmZpbGxdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5maWxsXCJcbiAgICAgICAgICBbYXR0ci5zdHJva2VdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VDb2xvclwiPjwvcmVjdD5cbiAgICAgIDwvZz5cbiAgICAgIDxnICpuZ1N3aXRjaENhc2U9XCJ0eXBlcy5FTExJUFNFXCI+XG4gICAgICAgIDxlbGxpcHNlIFthdHRyLmN4XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuY3hcIiBbYXR0ci5jeV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmN5XCIgW2F0dHIucnhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5yeFwiXG4gICAgICAgICAgW2F0dHIucnldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5yeVwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCJcbiAgICAgICAgICBbYXR0ci5zdHJva2UtZGFzaGFycmF5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZGFzaGFycmF5XCIgW2F0dHIuc3Ryb2tlLWRhc2hvZmZzZXRdPVwiMVwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLXdpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlV2lkdGhcIiBbYXR0ci5zdHJva2UtbGluZWNhcF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVDYXBcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1saW5lam9pbl09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmxpbmVKb2luXCIgW2F0dHIuc3Ryb2tlXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuc3Ryb2tlQ29sb3JcIlxuICAgICAgICAgIFthdHRyLmZpbGxdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5maWxsXCI+PC9lbGxpcHNlPlxuICAgICAgPC9nPlxuICAgICAgPGcgKm5nU3dpdGNoQ2FzZT1cInR5cGVzLlRFWFRcIj5cbiAgICAgICAgPHRleHQgY2xhc3M9XCJ0ZXh0X2VsZW1lbnRcIiB0ZXh0LWFuY2hvcj1cInN0YXJ0XCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIiBbYXR0ci54XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGVmdFwiXG4gICAgICAgICAgW2F0dHIueV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnRvcFwiIFthdHRyLndpZHRoXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMud2lkdGhcIiBbYXR0ci5oZWlnaHRdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5oZWlnaHRcIlxuICAgICAgICAgIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGluaGVyaXQ7XCIgW2F0dHIuZm9udC1zaXplXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZm9udFNpemVcIlxuICAgICAgICAgIFthdHRyLmZvbnQtZmFtaWx5XT1cInRlbXBFbGVtZW50Lm9wdGlvbnMuZm9udEZhbWlseVwiIFthdHRyLnN0cm9rZS1kYXNoYXJyYXldPVwidGVtcEVsZW1lbnQub3B0aW9ucy5kYXNoYXJyYXlcIlxuICAgICAgICAgIFthdHRyLnN0cm9rZS1kYXNob2Zmc2V0XT1cIjFcIiBbYXR0ci5zdHJva2Utd2lkdGhdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5zdHJva2VXaWR0aFwiXG4gICAgICAgICAgW2F0dHIuc3Ryb2tlLWxpbmVjYXBdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5saW5lQ2FwXCIgW2F0dHIuc3Ryb2tlLWxpbmVqb2luXT1cInRlbXBFbGVtZW50Lm9wdGlvbnMubGluZUpvaW5cIlxuICAgICAgICAgIFthdHRyLnN0cm9rZV09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLnN0cm9rZUNvbG9yXCIgW2F0dHIuZmlsbF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZpbGxcIlxuICAgICAgICAgIFthdHRyLmZvbnQtc3R5bGVdPVwidGVtcEVsZW1lbnQub3B0aW9ucy5mb250U3R5bGVcIiBbYXR0ci5mb250LXdlaWdodF09XCJ0ZW1wRWxlbWVudC5vcHRpb25zLmZvbnRXZWlnaHRcIj5cbiAgICAgICAgICB7eyB0ZW1wRWxlbWVudC52YWx1ZSB9fVxuICAgICAgICA8L3RleHQ+XG4gICAgICA8L2c+XG4gICAgICA8ZyAqbmdTd2l0Y2hEZWZhdWx0PlxuICAgICAgICA8dGV4dD5Ob3QgZGVmaW5lZCB0eXBlPC90ZXh0PlxuICAgICAgPC9nPlxuICAgIDwvZz5cbiAgICAgIDxnIGlkPVwic2VsZWN0b3JQYXJlbnRHcm91cFwiICpuZ0lmPVwic2VsZWN0ZWRFbGVtZW50XCI+XG4gICAgICAgIDxnIGNsYXNzPVwic2VsZWN0b3JHcm91cFwiIGlkPVwic2VsZWN0b3JHcm91cFwiIHRyYW5zZm9ybT1cIlwiIFtzdHlsZS5kaXNwbGF5XT1cInJ1YmJlckJveC5kaXNwbGF5XCJcbiAgICAgICAgICBbYXR0ci50cmFuc2Zvcm1dPVwiJ3RyYW5zbGF0ZSgnICsgc2VsZWN0ZWRFbGVtZW50LnggKyAnLCcgKyBzZWxlY3RlZEVsZW1lbnQueSArICcpJyArICdyb3RhdGUoJyArIHNlbGVjdGVkRWxlbWVudC5yb3RhdGlvbiArICcpJ1wiPlxuICAgICAgICAgIDxnIGRpc3BsYXk9XCJpbmxpbmVcIj5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0ZWRCb3hcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cIiM0RjgwRkZcIiBzaGFwZS1yZW5kZXJpbmc9XCJjcmlzcEVkZ2VzXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogbm9uZTtcIiBbYXR0ci54XT1cInJ1YmJlckJveC54XCIgW2F0dHIueV09XCJydWJiZXJCb3gueVwiIFthdHRyLndpZHRoXT1cInJ1YmJlckJveC53aWR0aFwiXG4gICAgICAgICAgICAgIFthdHRyLmhlaWdodF09XCJydWJiZXJCb3guaGVpZ2h0XCIgc3R5bGU9XCJjdXJzb3I6IG1vdmU7XCIgKHBvaW50ZXJkb3duKT1cIm1vdmVTZWxlY3QoJGV2ZW50KVwiPlxuICAgICAgICAgICAgPC9yZWN0PlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgICA8ZyBkaXNwbGF5PVwiaW5saW5lXCI+XG4gICAgICAgICAgICA8Y2lyY2xlIGNsYXNzPVwic2VsZWN0b3Jfcm90YXRlXCIgaWQ9XCJzZWxlY3RvckdyaXBfcm90YXRlX253XCIgZmlsbD1cIiMwMDBcIiByPVwiOFwiIHN0cm9rZT1cIiMwMDBcIiBmaWxsLW9wYWNpdHk9XCIwXCJcbiAgICAgICAgICAgICAgc3Ryb2tlLW9wYWNpdHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiIFthdHRyLmN4XT1cInJ1YmJlckJveC54IC0gNFwiIFthdHRyLmN5XT1cInJ1YmJlckJveC55IC0gNFwiPjwvY2lyY2xlPlxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cInNlbGVjdG9yX3JvdGF0ZVwiIGlkPVwic2VsZWN0b3JHcmlwX3JvdGF0ZV9uZVwiIGZpbGw9XCIjMDAwXCIgcj1cIjhcIiBzdHJva2U9XCIjMDAwXCIgZmlsbC1vcGFjaXR5PVwiMFwiXG4gICAgICAgICAgICAgIHN0cm9rZS1vcGFjaXR5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIiBbYXR0ci5jeF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCArIDRcIlxuICAgICAgICAgICAgICBbYXR0ci5jeV09XCJydWJiZXJCb3gueSAtIDRcIj5cbiAgICAgICAgICAgIDwvY2lyY2xlPlxuICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz1cInNlbGVjdG9yX3JvdGF0ZVwiIGlkPVwic2VsZWN0b3JHcmlwX3JvdGF0ZV9zZVwiIGZpbGw9XCIjMDAwXCIgcj1cIjhcIiBzdHJva2U9XCIjMDAwXCIgZmlsbC1vcGFjaXR5PVwiMFwiXG4gICAgICAgICAgICAgIHN0cm9rZS1vcGFjaXR5PVwiMFwiIHN0cm9rZS13aWR0aD1cIjBcIiBbYXR0ci5jeF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCArIDRcIlxuICAgICAgICAgICAgICBbYXR0ci5jeV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgKyA0XCI+PC9jaXJjbGU+XG4gICAgICAgICAgICA8Y2lyY2xlIGNsYXNzPVwic2VsZWN0b3Jfcm90YXRlXCIgaWQ9XCJzZWxlY3RvckdyaXBfcm90YXRlX3N3XCIgZmlsbD1cIiMwMDBcIiByPVwiOFwiIHN0cm9rZT1cIiMwMDBcIiBmaWxsLW9wYWNpdHk9XCIwXCJcbiAgICAgICAgICAgICAgc3Ryb2tlLW9wYWNpdHk9XCIwXCIgc3Ryb2tlLXdpZHRoPVwiMFwiIFthdHRyLmN4XT1cInJ1YmJlckJveC54IC0gNFwiXG4gICAgICAgICAgICAgIFthdHRyLmN5XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCArIDRcIj5cbiAgICAgICAgICAgIDwvY2lyY2xlPlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX253XCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBudy1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54IC0gNFwiIFthdHRyLnldPVwicnViYmVyQm94LnkgLSA0XCJcbiAgICAgICAgICAgICAgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+XG4gICAgICAgICAgICA8L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfblwiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogbi1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoIC8gMiAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55IC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9uZVwiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogbmUtcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55IC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9lXCIgd2lkdGg9XCI4XCIgaGVpZ2h0PVwiOFwiIGZpbGw9XCIjNEY4MEZGXCIgc3Ryb2tlPVwicmdiYSgwLDAsMCwwKVwiXG4gICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBlLXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggKyBydWJiZXJCb3gud2lkdGggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLyAyIC0gNFwiIChwb2ludGVyZG93bik9XCJyZXNpemVTZWxlY3QoJGV2ZW50KVwiPjwvcmVjdD5cbiAgICAgICAgICAgIDxyZWN0IGlkPVwic2VsZWN0b3JHcmlwX3Jlc2l6ZV9zZVwiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogc2UtcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCArIHJ1YmJlckJveC53aWR0aCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfc1wiIHdpZHRoPVwiOFwiIGhlaWdodD1cIjhcIiBmaWxsPVwiIzRGODBGRlwiIHN0cm9rZT1cInJnYmEoMCwwLDAsMClcIlxuICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogcy1yZXNpemU7XCIgcG9pbnRlci1ldmVudHM9XCJhbGxcIiBbYXR0ci54XT1cInJ1YmJlckJveC54ICsgcnViYmVyQm94LndpZHRoIC8gMiAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCAtIDRcIiAocG9pbnRlcmRvd24pPVwicmVzaXplU2VsZWN0KCRldmVudClcIj48L3JlY3Q+XG4gICAgICAgICAgICA8cmVjdCBpZD1cInNlbGVjdG9yR3JpcF9yZXNpemVfc3dcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IHN3LXJlc2l6ZTtcIiBwb2ludGVyLWV2ZW50cz1cImFsbFwiIFthdHRyLnhdPVwicnViYmVyQm94LnggLSA0XCJcbiAgICAgICAgICAgICAgW2F0dHIueV09XCJydWJiZXJCb3gueSArIHJ1YmJlckJveC5oZWlnaHQgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgICAgPHJlY3QgaWQ9XCJzZWxlY3RvckdyaXBfcmVzaXplX3dcIiB3aWR0aD1cIjhcIiBoZWlnaHQ9XCI4XCIgZmlsbD1cIiM0RjgwRkZcIiBzdHJva2U9XCJyZ2JhKDAsMCwwLDApXCJcbiAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IHctcmVzaXplO1wiIHBvaW50ZXItZXZlbnRzPVwiYWxsXCIgW2F0dHIueF09XCJydWJiZXJCb3gueCAtIDRcIlxuICAgICAgICAgICAgICBbYXR0ci55XT1cInJ1YmJlckJveC55ICsgcnViYmVyQm94LmhlaWdodCAvIDIgLSA0XCIgKHBvaW50ZXJkb3duKT1cInJlc2l6ZVNlbGVjdCgkZXZlbnQpXCI+PC9yZWN0PlxuICAgICAgICAgIDwvZz5cbiAgICAgICAgPC9nPlxuICAgICAgPC9nPlxuICAgIDwvZz5cbiAgPC9zdmc+XG48L3N2Zz5cblxuPGRpdiBbc3R5bGVdPVwiJ2ZvbnQtZmFtaWx5OicgKyBmb250RmFtaWx5ICsgJzsnICsgJ2ZvbnQtc2l6ZTonICsgZm9udFNpemUgKyAncHg7Jytcbidwb2ludGVyLWV2ZW50czogbm9uZTsgd2lkdGg6ICcgKyBjYW52YXNXaWR0aCAqIHpvb20gKyAncHg7ICcrXG4gICdoZWlnaHQ6ICcgKyBjYW52YXNIZWlnaHQgKiB6b29tICsgJ3B4OycgK1xuICAncG9zaXRpb246IGFic29sdXRlOyB0b3A6ICcgKyB5ICsgJ3B4OyBsZWZ0OiAnICsgeCArICdweDsnXCIgKm5nSWY9XCJ0ZW1wRWxlbWVudCAmJiBzZWxlY3RlZFRvb2wgPT09IHRvb2xzLlRFWFRcIj5cbiAgPGlucHV0ICN0ZXh0SW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cInRleHQtaW5wdXRcIiBbc3R5bGVdPVwiJ3dpZHRoOiAnICsgdGV4dElucHV0LnZhbHVlLmxlbmd0aCArICdjaDsgJytcbiAgICAnaGVpZ2h0OiAnICsgKDIgKiB6b29tKSArICdjaDsnK1xuICAgICd0b3A6ICcgKyAoKHRlbXBFbGVtZW50Lm9wdGlvbnMudG9wIHx8IDAgLSAxMCkgKiB6b29tKSArICdweDsnICtcbiAgICAnbGVmdDogJyArICgodGVtcEVsZW1lbnQub3B0aW9ucy5sZWZ0IHx8IDAgKyAzKSogem9vbSkgKyAncHg7J1xuICAgIFwiIChpbnB1dCk9XCJ1cGRhdGVUZXh0SXRlbSh0ZXh0SW5wdXQudmFsdWUpXCIgYXV0b2ZvY3VzIC8+XG48L2Rpdj4iXX0=