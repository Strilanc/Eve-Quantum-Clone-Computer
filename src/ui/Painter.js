import Format from "src/base/Format.js"
import Util from "src/base/Util.js"
import Seq from "src/base/Seq.js"
import Rect from "src/math/Rect.js"
import Point from "src/math/Point.js"

export default class Painter {
    /**
     * @param {!HTMLCanvasElement} canvas
     * @property {!HTMLCanvasElement} canvas
     * @property {!CanvasRenderingContext2D} ctx
     * @property {!function()} deferred
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.deferred = [];
        this.traceAction = new TraceAction(this.ctx);
        this.tracer = new Tracer(this.ctx);
    }

    defer(tooltipPainter) {
        this.deferred.push(tooltipPainter);
    }

    paintDeferred() {
        for (let e of this.deferred) {
            e();
        }
        this.deferred = [];
    }

    paintableArea() {
        return new Rect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draws a line segment between the two points.
     *
     * @param {!Point} p1
     * @param {!Point} p2
     * @param {=string} color The color of the drawn line.
     * @param {=number} thickness The thickness of the drawn line.
     */
    strokeLine(p1, p2, color = 'black', thickness = 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        this.ctx.stroke();
    };

    /**
     * Draws the outside of a rectangle.
     * @param {!Rect} rect The rectangular perimeter to stroke.
     * @param {!string=} color The stroke color.
     * @param {!number=} thickness The stroke thickness.
     */
    strokeRect(rect, color = "black", thickness = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }

    /**
     * Draws the inside of a rectangle.
     * @param {!Rect} rect The rectangular area to fill.
     * @param {!string=} color The fill color.
     */
    fillRect(rect, color = 'white') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    /**
     * Draws the outside of a circle.
     * @param {!Point} center The center of the circle.
     * @param {!number} radius The distance from the center of the circle to its side.
     * @param {!string=} color The stroke color.
     * @param {!number=} thickness The stroke thickness.
     */
    strokeCircle(center, radius, color = 'black', thickness = 1) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        this.ctx.arc(center.x, center.y, Math.max(radius - 0.5, 0), 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    /**
     * @param {!function(!Tracer) : void} tracerFunc
     * @returns {!TraceAction}
     */
    trace(tracerFunc) {
        this.ctx.beginPath();
        tracerFunc(this.tracer);
        return this.traceAction;
    }

    /**
     * Draws the inside of a circle.
     * @param {!Point} center The center of the circle.
     * @param {!number} radius The distance from the center of the circle to its side.
     * @param {!string=} color The fill color. Defaults to white.
     */
    fillCircle(center, radius, color = 'white') {
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, Math.max(radius - 0.5, 0), 0, 2 * Math.PI);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    /**
     * Draws some text in a bounded area.
     * @param {!string} text The text to print.
     * @param {!number} x
     * @param {!number} y
     * @param {!number} boundingWidth The text will be scaled down so it doesn't exceed this width.
     * @param {!number} boundingHeight The text will be scaled down so it doesn't exceed this width.
     * @param {!string} textAlign Horizontal alignment. Options: start, end, left, right, center.
     * @param {!string} textBaseline Vertical alignment. Options: top, hanging, middle, alphabetic, ideographic, bottom.
     * @param {!string} fillStyle Text color.
     * @param {!string} font
     * @param {!function(!number, !number) : void} afterMeasureBeforeDraw
     */
    print(text,
          x,
          y,
          textAlign,
          textBaseline,
          fillStyle,
          font,
          boundingWidth,
          boundingHeight,
          afterMeasureBeforeDraw = undefined) {

        this.ctx.font = font;
        let naiveWidth = this.ctx.measureText(text).width;
        //noinspection JSSuspiciousNameCombination
        let naiveHeight = this.ctx.measureText("0").width * 2.5;
        let scale = Math.min(Math.min(boundingWidth / naiveWidth, boundingHeight / naiveHeight), 1);

        if (afterMeasureBeforeDraw !== undefined) {
            afterMeasureBeforeDraw(naiveWidth * scale, naiveHeight * scale);
        }
        this.ctx.save();
        this.ctx.textAlign = textAlign;
        this.ctx.textBaseline = textBaseline;
        this.ctx.font = font; // Re-set the font, because the 'afterMeasureBeforeDraw' callback may have changed it.
        this.ctx.fillStyle = fillStyle;
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);
        this.ctx.fillText(text, 0, 0);
        this.ctx.restore();
    }

    /**
     * Draws the outside of a polygon.
     * @param {!(!Point[])} vertices
     * @param {!string=} strokeColor The stroke color.
     * @param {!number=} strokeThickness The stroke thickness.
     */
    strokePolygon(vertices,
                  strokeColor = 'black',
                  strokeThickness = 1) {
        if (vertices.length === 0) {
            return;
        }
        let last = vertices[vertices.length - 1];

        this.ctx.beginPath();
        this.ctx.moveTo(last.x, last.y);
        for (let p of vertices) {
            this.ctx.lineTo(p.x, p.y);
        }

        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeThickness;
        this.ctx.stroke();
    }

    /**
     * Draws a path.
     * @param {!(!Point[])} vertices
     * @param {!string=} strokeColor The stroke color.
     * @param {!number=} strokeThickness The stroke thickness.
     */
    strokePath(vertices,
                  strokeColor = 'black',
                  strokeThickness = 1) {
        if (vertices.length === 0) {
            return;
        }

        this.ctx.beginPath();
        this.ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let p of vertices.slice(1)) {
            this.ctx.lineTo(p.x, p.y);
        }

        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeThickness;
        this.ctx.stroke();
    }

    /**
     * Draws the inside of a polygon.
     * @param {!(!Point[])} vertices
     * @param {!string} fillColor
     */
    fillPolygon(vertices, fillColor) {
        let last = vertices[vertices.length - 1];

        this.ctx.beginPath();
        this.ctx.moveTo(last.x, last.y);
        for (let p of vertices) {
            this.ctx.lineTo(p.x, p.y);
        }

        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
    }
}

/**
 * Has various helper methods for tracing shapes and paths in a CanvasRenderingContext2D.
 */
class Tracer {
    /**
     * @param {!CanvasRenderingContext2D} ctx
     */
    constructor(ctx) {
        /** @type {!CanvasRenderingContext2D} */
        this.ctx = ctx;
    }

    /**
     * @param {!number} x1
     * @param {!number} y1
     * @param {!number} x2
     * @param {!number} y2
     */
    line(x1, y1, x2, y2) {
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
    }

    /**
     * @param {!number} x
     * @param {!number} y
     * @param {!number} w
     * @param {!number} h
     */
    rect(x, y, w, h) {
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + w, y);
        this.ctx.lineTo(x + w, y + h);
        this.ctx.lineTo(x, y + h);
        this.ctx.lineTo(x, y);
    }

    /**
     * @param {!number} x The x-coordinate of the center of the circle.
     * @param {!number} y The y-coordinate of the center of the circle.
     * @param {!number} radius The distance from the center of the circle to its side.
     */
    circle(x, y, radius) {
        this.ctx.moveTo(x + radius, y);
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    }

    /**
     * @param {!number} x The x-coordinate of the center of the ellipse.
     * @param {!number} y The y-coordinate of the center of the ellipse.
     * @param {!number} horizontal_radius The horizontal distance from the center of the ellipse to its side.
     * @param {!number} vertical_radius The vertical distance from the center of the ellipse to its side.
     */
    ellipse(x, y, horizontal_radius, vertical_radius) {
        this.ctx.save();

        this.ctx.translate(x - horizontal_radius, y - vertical_radius);
        this.ctx.scale(horizontal_radius, vertical_radius);
        this.ctx.moveTo(2, 1);
        this.ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);

        this.ctx.restore();
    }

    /**
     * @param {!number} x
     * @param {!number} y
     * @param {!number} w
     * @param {!number} h
     * @param {!int} numCols
     * @param {!int} numRows
     */
    grid(x, y, w, h, numCols, numRows) {
        let dw = w / numCols;
        let dh = h / numRows;
        let x2 = x + numCols * dw;
        let y2 = y + numRows * dh;
        for (let c = 0; c <= numCols; c++) {
            this.ctx.moveTo(x + c * dw, y);
            this.ctx.lineTo(x + c * dw, y2);
        }
        for (let r = 0; r <= numRows; r++) {
            this.ctx.moveTo(x, y + r * dh);
            this.ctx.lineTo(x2, y + r * dh);
        }
    }

    /**
     * @param {!Array.<!number>|!Float32Array} interleavedCoordinates
     */
    polygon(interleavedCoordinates) {
        if (interleavedCoordinates.length === 0) {
            return;
        }

        let n = interleavedCoordinates.length;
        this.ctx.moveTo(interleavedCoordinates[n-2], interleavedCoordinates[n-1]);
        for (let i = 0; i < n; i += 2) {
            this.ctx.lineTo(interleavedCoordinates[i], interleavedCoordinates[i+1]);
        }
    }

    /**
     * @param {!number} x The x-position of the center of the arrow head.
     * @param {number} y The y-position of the center of the arrow head.
     * @param {number} radius The radius of the circle the arrow head is inscribed inside.
     * @param {number} facingAngle The direction the arrow head is pointing towards.
     * @param {number} sweptAngle The angle swept out by the back of the arrow head, relative to its center (not the
     * point at the front).
     */
    arrowHead(x, y, radius, facingAngle, sweptAngle) {
        let a1 = facingAngle + sweptAngle/2 + Math.PI;
        let a2 = facingAngle - sweptAngle/2 + Math.PI;
        this.polygon([
            x + Math.cos(facingAngle)*radius, y + Math.sin(facingAngle)*radius,
            x + Math.cos(a1)*radius, y + Math.sin(a1)*radius,
            x + Math.cos(a2)*radius, y + Math.sin(a2)*radius
        ]);
    }

}

/**
 * Strokes/fills a traced path.
 */
class TraceAction {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * @param {!string} fillStyle
     * @returns {!TraceAction}
     */
    thenFill(fillStyle) {
        this.ctx.fillStyle = fillStyle;
        this.ctx.fill();
        return this;
    }

    /**
     * @param {!string} strokeStyle
     * @param {!number=} lineWidth
     * @returns {!TraceAction}
     */
    thenStroke(strokeStyle, lineWidth = 1) {
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();
        return this;
    }
}
